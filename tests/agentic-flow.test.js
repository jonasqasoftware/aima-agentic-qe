import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import {
  assessRisks,
  buildEvidenceLedger,
  buildDashboard,
  buildStrategy,
  compareWithBaseline,
  createReport,
  createChangeFromLocalDiff,
  evaluateChange,
  formatMarkdown,
  formatHtml,
  formatSarif,
  loadChangeInput,
  loadEvidenceArtifact,
  loadReleasePolicy,
  loadFrameworkRegistry,
  qualityConfidence,
  selectFramework,
  shouldFailQualityGate,
  verifyReportManifest,
  writeReports
} from '../src/index.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const execFileAsync = promisify(execFile);

test('payment fixture produces an evidence-bounded NO-GO recommendation', async () => {
  const change = await loadChangeInput(path.join(root, 'examples', 'payment-refactor.change.json'));
  const frameworks = await loadFrameworkRegistry(path.join(root, 'aima', 'frameworks'));
  const selection = selectFramework(frameworks, change);
  const risks = assessRisks(change);
  const confidence = qualityConfidence(risks, change.knownUnknowns);
  const policy = await loadReleasePolicy(path.join(root, 'aima', 'policies', 'evidence-aware-release.json'));
  const strategy = buildStrategy(risks, change.knownUnknowns, policy);
  const report = createReport(change, selection, risks, confidence, strategy);

  assert.equal(selection.framework.id, 'risk-based-testing');
  assert.equal(strategy.recommendation, 'NO-GO');
  assert.ok(risks.some((risk) => risk.category === 'financial'));
  assert.ok(risks.some((risk) => risk.category === 'integration'));
  assert.ok(confidence.score < 100);
  assert.match(formatMarkdown(report), /Não afirma leitura de PR remoto/);
  assert.ok(report.evidenceLedger.some((item) => item.kind === 'FACT'));
  assert.ok(report.evidenceLedger.some((item) => item.kind === 'DECLARED_EVIDENCE'));
  assert.ok(report.evidenceLedger.some((item) => item.kind === 'UNKNOWN'));
  assert.ok(report.evidenceLedger.some((item) => item.kind === 'INFERENCE'));
  const html = formatHtml({ ...report, context: { ...report.context, summary: '<script>untrusted</script>' } });
  assert.match(html, /Ledger de evidências/);
  assert.match(html, /&lt;script&gt;untrusted&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>untrusted<\/script>/);
  const sarif = formatSarif(report);
  assert.equal(sarif.version, '2.1.0');
  assert.equal(sarif.runs[0].tool.driver.name, 'AIMA Agentic QE');
  assert.equal(sarif.runs[0].results[0].level, 'error');
  assert.equal(sarif.runs[0].results[0].locations[0].physicalLocation.region.startLine, 1);
  const reportDirectory = await mkdtemp(path.join(os.tmpdir(), 'aima-report-manifest-'));
  await writeReports(report, reportDirectory);
  assert.equal((await verifyReportManifest(reportDirectory)).valid, true);
  await writeFile(path.join(reportDirectory, 'aima-quality-report.md'), 'alterado');
  assert.equal((await verifyReportManifest(reportDirectory)).valid, false);
});

test('golden payment expectation passes through the evaluation runner', async () => {
  const change = await loadChangeInput(path.join(root, 'examples', 'payment-refactor.change.json'));
  const expected = JSON.parse(await readFile(path.join(root, 'evals', 'golden', 'payment-refactor.expected.json'), 'utf8'));
  const frameworks = await loadFrameworkRegistry(path.join(root, 'aima', 'frameworks'));
  const policy = await loadReleasePolicy(path.join(root, 'aima', 'policies', 'evidence-aware-release.json'));
  const evaluation = evaluateChange(change, expected, frameworks, policy);

  assert.equal(evaluation.passed, true);
  assert.deepEqual(evaluation.failures, []);
});

test('local dashboard aggregates reports without remote access', async () => {
  const reportsDirectory = await mkdtemp(path.join(os.tmpdir(), 'aima-dashboard-'));
  const reportDirectory = path.join(reportsDirectory, 'run-1');
  await mkdir(reportDirectory);
  await writeFile(path.join(reportDirectory, 'aima-quality-report.json'), JSON.stringify({
    context: { changeId: 'DASH-1', summary: 'Cenário de dashboard' },
    qualityConfidence: { score: 72 },
    strategy: { recommendation: 'GO WITH RISKS', policy: { id: 'evidence-aware-release' } },
    risks: [{ id: 'R-ONE' }]
  }));
  const outputFile = path.join(reportsDirectory, 'dashboard.html');
  const dashboard = await buildDashboard(reportsDirectory, outputFile);

  assert.equal(dashboard.summaries.length, 1);
  assert.equal(dashboard.summaries[0].changeId, 'DASH-1');
  assert.match(await readFile(outputFile, 'utf8'), /Qualidade em evidências/);
});

test('unknown change surface remains explicit instead of invented', () => {
  const risks = assessRisks({
    changedFiles: ['lib/normalizer.js'],
    businessImpact: 'low',
    technicalComplexity: 'low'
  });
  assert.equal(risks[0].category, 'change-surface');
  assert.match(risks[0].statement, /sem domínio classificado/);
});

test('data change selects the data-quality framework from the registry', async () => {
  const change = await loadChangeInput(path.join(root, 'examples', 'data-migration.change.json'));
  const frameworks = await loadFrameworkRegistry(path.join(root, 'aima', 'frameworks'));
  const selection = selectFramework(frameworks, change);

  assert.equal(selection.framework.id, 'data-quality-validation');
  assert.match(selection.evidence.at(-1), /sinal de dados/);
});

test('evidence ledger keeps declared unknowns separate from deterministic inferences', () => {
  const change = {
    source: 'declared-input',
    businessImpact: 'medium',
    technicalComplexity: 'low',
    changedFiles: ['src/api/orders.js'],
    knownUnknowns: ['Resultado de teste de contrato não fornecido.'],
    declaredEvidence: [{ id: 'TEST-1', type: 'test', summary: 'Executado pelo autor.' }]
  };
  const ledger = buildEvidenceLedger(change, assessRisks(change));

  assert.equal(ledger.find((item) => item.id === 'U-001').kind, 'UNKNOWN');
  assert.equal(ledger.find((item) => item.id === 'I-001').kind, 'INFERENCE');
  assert.equal(ledger.find((item) => item.id === 'I-001').source, 'deterministic-risk-rule');
  assert.equal(ledger.find((item) => item.id === 'D-001').verification, 'declared-not-verified');
});

test('local evidence artifact is fingerprinted without trusting its claimed outcome', async () => {
  const artifact = await loadEvidenceArtifact(path.join(root, 'examples', 'unit-test-summary.json'));
  const ledger = buildEvidenceLedger({
    businessImpact: 'low',
    technicalComplexity: 'low',
    changedFiles: ['lib/normalizer.js'],
    knownUnknowns: [],
    artifactEvidence: [artifact]
  }, []);
  const entry = ledger.find((item) => item.id === 'A-001');

  assert.equal(entry.kind, 'ARTIFACT_EVIDENCE');
  assert.equal(entry.verification, 'sha256-verified-local-file');
  assert.match(entry.sha256, /^[a-f0-9]{64}$/);
  assert.match(entry.statement, /passed/);
});

test('strict policy blocks a change when any evidence is unknown', async () => {
  const policy = await loadReleasePolicy(path.join(root, 'examples', 'strict-release-policy.json'));
  const risks = assessRisks({
    changedFiles: ['lib/normalizer.js'],
    businessImpact: 'low',
    technicalComplexity: 'low'
  });
  const strategy = buildStrategy(risks, ['Teste de regressão não fornecido.'], policy);

  assert.equal(strategy.recommendation, 'NO-GO');
  assert.equal(strategy.policy.id, 'strict-evidence-release');
  assert.match(strategy.rationale, /bloqueia mudanças/);
});

test('quality gate failures are opt-in and deterministic', () => {
  assert.equal(shouldFailQualityGate('NO-GO', 'never'), false);
  assert.equal(shouldFailQualityGate('NO-GO', 'no-go'), true);
  assert.equal(shouldFailQualityGate('GO WITH RISKS', 'no-go'), false);
  assert.equal(shouldFailQualityGate('GO WITH RISKS', 'go-with-risks'), true);
  assert.equal(shouldFailQualityGate('GO', 'go-with-risks'), false);
  assert.throws(() => shouldFailQualityGate('GO', 'always'));
});

test('baseline comparison identifies new, resolved, and changed risks', async () => {
  const change = await loadChangeInput(path.join(root, 'examples', 'payment-refactor.change.json'));
  const frameworks = await loadFrameworkRegistry(path.join(root, 'aima', 'frameworks'));
  const policy = await loadReleasePolicy(path.join(root, 'aima', 'policies', 'evidence-aware-release.json'));
  const risks = assessRisks(change);
  const report = createReport(change, selectFramework(frameworks, change), risks, qualityConfidence(risks, change.knownUnknowns), buildStrategy(risks, change.knownUnknowns, policy));
  const baseline = {
    context: { changeId: 'BASELINE-41' },
    qualityConfidence: { score: 45 },
    strategy: { recommendation: 'GO WITH RISKS' },
    risks: [{ ...risks[0], score: 80 }, { id: 'R-LEGACY', score: 20, level: 'LOW' }]
  };
  report.baselineComparison = compareWithBaseline(report, baseline);

  assert.equal(report.baselineComparison.baselineChangeId, 'BASELINE-41');
  assert.ok(report.baselineComparison.newRisks.some((risk) => risk.id === 'R-INTEGRATION'));
  assert.ok(report.baselineComparison.resolvedRisks.some((risk) => risk.id === 'R-LEGACY'));
  assert.ok(report.baselineComparison.changedRisks.some((risk) => risk.id === 'R-FINANCIAL'));
  assert.match(formatMarkdown(report), /Comparação com baseline/);
});

test('local diff adapter uses changed file names and keeps diff content unknown', async () => {
  const repo = await mkdtemp(path.join(os.tmpdir(), 'aima-local-diff-'));
  await execFileAsync('git', ['init', '--initial-branch=main', repo]);
  await execFileAsync('git', ['-C', repo, 'config', 'user.email', 'test@example.invalid']);
  await execFileAsync('git', ['-C', repo, 'config', 'user.name', 'AIMA Test']);
  await writeFile(path.join(repo, 'README.md'), '# fixture\n');
  await execFileAsync('git', ['-C', repo, 'add', 'README.md']);
  await execFileAsync('git', ['-C', repo, 'commit', '-m', 'base']);
  const { stdout: base } = await execFileAsync('git', ['-C', repo, 'rev-parse', 'HEAD']);
  await writeFile(path.join(repo, 'payment-route.js'), 'export const payment = true;\n');
  await execFileAsync('git', ['-C', repo, 'add', 'payment-route.js']);
  await execFileAsync('git', ['-C', repo, 'commit', '-m', 'payment change']);

  const change = await createChangeFromLocalDiff({
    repoPath: repo,
    base: base.trim(),
    businessImpact: 'high',
    technicalComplexity: 'medium'
  });

  assert.deepEqual(change.changedFiles, ['payment-route.js']);
  assert.match(change.knownUnknowns[0], /somente nomes de arquivos/);
  assert.equal(change.source, 'local-git-name-only');
  const report = createReport(change, { framework: { id: 'risk-based-testing', name: 'Risk-Based Testing' }, evidence: [] }, [], { score: 100, factors: [] }, { recommendation: 'GO', recommendedTests: [], missingEvidence: [], rationale: 'fixture', policy: { id: 'fixture', name: 'Fixture', version: '1.0.0' } });
  assert.match(report.evidenceBoundary, /conteúdo do diff/);
});
