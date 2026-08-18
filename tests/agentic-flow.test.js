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
  analyzeDeclaredChange,
  buildEvidenceLedger,
  buildDashboard,
  buildStrategy,
  compareWithBaseline,
  createReport,
  createChangeFromLocalDiff,
  createChangeFromGitHubPr,
  executeEvidenceCommand,
  loadJUnitResults,
  loadJsonTestResults,
  loadLcovCoverage,
  correlateCoverageWithChangedFiles,
  loadEvidenceManifest,
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

test('local web interface uses the deterministic engine for declared input', async () => {
  const report = await analyzeDeclaredChange({
    id: 'WEB-TEST-1',
    summary: 'Análise por interface local',
    changedFiles: ['src/payments/authorization.js'],
    businessImpact: 'high',
    technicalComplexity: 'medium',
    knownUnknowns: []
  });

  assert.equal(report.context.changeId, 'WEB-TEST-1');
  assert.equal(report.context.source, 'declared-input');
  assert.ok(report.risks.some((risk) => risk.category === 'financial'));
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

  const changeWithStats = await createChangeFromLocalDiff({
    repoPath: repo,
    base: base.trim(),
    businessImpact: 'high',
    technicalComplexity: 'medium',
    includeStats: true
  });
  assert.equal(changeWithStats.source, 'local-git-diff-stats');
  assert.equal(changeWithStats.diffStats.additions, 1);
  assert.equal(changeWithStats.diffStats.deletions, 0);
  assert.match(buildEvidenceLedger(changeWithStats, [])[4].statement, /1 linha/);
});

test('GitHub PR adapter uses authenticated metadata but preserves CI and diff uncertainty', async () => {
  const calls = [];
  const change = await createChangeFromGitHubPr({
    repo: 'example/checkout',
    number: 42,
    businessImpact: 'high',
    technicalComplexity: 'medium',
    api: async (endpoint) => {
      calls.push(endpoint);
      if (endpoint.endsWith('/pulls/42')) return {
        title: 'Corrige autorização de pagamento',
        html_url: 'https://github.com/example/checkout/pull/42',
        state: 'open',
        base: { ref: 'main' },
        head: { ref: 'fix/payment', sha: 'abc123' },
        user: { login: 'qa-engineer' }
      };
      if (endpoint.includes('/files')) return [{ filename: 'src/payments/authorization.js' }, { filename: 'src/api/orders.js' }];
      return { check_runs: [{ name: 'test', status: 'completed', conclusion: 'success', details_url: 'https://ci.example/test' }] };
    }
  });

  assert.deepEqual(calls, ['repos/example/checkout/pulls/42', 'repos/example/checkout/pulls/42/files?per_page=100', 'repos/example/checkout/commits/abc123/check-runs?per_page=100']);
  assert.equal(change.source, 'github-pr-metadata');
  assert.deepEqual(change.changedFiles, ['src/payments/authorization.js', 'src/api/orders.js']);
  assert.equal(change.ciChecks[0].outcome, 'passed');
  assert.match(change.knownUnknowns.join(' '), /aprovações/i);
  const report = createReport(change, { framework: { id: 'risk-based-testing', name: 'Risk-Based Testing' }, evidence: [] }, [], { score: 100, factors: [] }, { recommendation: 'GO', recommendedTests: [], missingEvidence: [], rationale: 'fixture', policy: { id: 'fixture', name: 'Fixture', version: '1.0.0' } });
  assert.match(report.evidenceBoundary, /metadados autenticados/);
  assert.equal(report.evidenceLedger[0].source, 'github-pr-api-metadata');
  assert.equal(report.evidenceLedger.some((item) => item.kind === 'REMOTE_EVIDENCE'), true);
});

test('failed authenticated CI check becomes a high-priority risk', async () => {
  const risks = assessRisks({
    changedFiles: ['src/payments/authorization.js'],
    businessImpact: 'low',
    technicalComplexity: 'low',
    ciChecks: [{ name: 'integration tests', status: 'completed', conclusion: 'failure', outcome: 'failed' }]
  });

  assert.equal(risks[0].id, 'R-CI-INTEGRATION-TESTS');
  assert.equal(risks[0].level, 'HIGH');
});

test('explicit local command execution is hashed and failed execution becomes a risk', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'aima-command-evidence-'));
  const passingSpec = path.join(directory, 'passing.json');
  const failingSpec = path.join(directory, 'failing.json');
  await writeFile(passingSpec, JSON.stringify({ id: 'PASSING-COMMAND', command: process.execPath, args: ['-e', 'console.log("ok")'] }));
  await writeFile(failingSpec, JSON.stringify({ id: 'FAILING-COMMAND', command: process.execPath, args: ['-e', 'process.exit(3)'] }));

  const passed = await executeEvidenceCommand(passingSpec);
  const failed = await executeEvidenceCommand(failingSpec);

  assert.equal(passed.status, 'passed');
  assert.equal(passed.exitCode, 0);
  assert.match(passed.transcriptSha256, /^[a-f0-9]{64}$/);
  assert.equal(failed.status, 'failed');
  assert.equal(failed.exitCode, 3);
  const risks = assessRisks({ changedFiles: ['lib/normalizer.js'], businessImpact: 'low', technicalComplexity: 'low', executionEvidence: [failed] });
  assert.equal(risks[0].id, 'R-EXECUTION-FAILING-COMMAND');
  const ledger = buildEvidenceLedger({ businessImpact: 'low', technicalComplexity: 'low', changedFiles: ['lib/normalizer.js'], executionEvidence: [passed] }, []);
  assert.equal(ledger.find((entry) => entry.kind === 'EXECUTED_EVIDENCE').verification, 'local-process-exit-code-and-transcript-hash');
});

test('JUnit failures are parsed without retaining failure bodies and become a high risk', async () => {
  const result = await loadJUnitResults(path.join(root, 'examples', 'test-results.junit.xml'));

  assert.equal(result.status, 'failed');
  assert.equal(result.total, 3);
  assert.equal(result.failed, 1);
  assert.equal(result.skipped, 1);
  assert.deepEqual(result.failedCases, [{ suite: 'checkout.payment', name: 'recusa cartão expirado', outcome: 'failed' }]);
  assert.match(result.transcriptSha256, /^[a-f0-9]{64}$/);
  const risks = assessRisks({ changedFiles: ['src/payments/authorization.js'], businessImpact: 'low', technicalComplexity: 'low', testResults: [result] });
  assert.equal(risks[0].category, 'test-results');
  const ledger = buildEvidenceLedger({ businessImpact: 'low', technicalComplexity: 'low', changedFiles: ['src/payments/authorization.js'], testResults: [result] }, []);
  const evidence = ledger.find((entry) => entry.kind === 'TEST_RESULTS_EVIDENCE');
  assert.match(evidence.statement, /recusa cartão expirado/);
  assert.doesNotMatch(evidence.statement, /detalhe omitido/);
});

test('normalized JSON test results use the same evidence and risk contract', async () => {
  const result = await loadJsonTestResults(path.join(root, 'examples', 'test-results.json'));

  assert.equal(result.status, 'failed');
  assert.equal(result.total, 3);
  assert.equal(result.failedCases[0].suite, 'checkout.payment');
  assert.equal(result.parser, 'aima-json-test-results-v1');
  await assert.rejects(loadJsonTestResults(path.join(root, 'examples', 'payment-refactor.change.json')));
});

test('LCOV line coverage is hashed and only enforces an explicit threshold', async () => {
  const coverage = await loadLcovCoverage(path.join(root, 'examples', 'coverage.lcov'));

  assert.equal(coverage.found, 5);
  assert.equal(coverage.hit, 4);
  assert.equal(coverage.lineCoverage, 80);
  assert.equal(coverage.files.length, 2);
  assert.match(coverage.transcriptSha256, /^[a-f0-9]{64}$/);
  const noThresholdRisks = assessRisks({ changedFiles: ['lib/normalizer.js'], businessImpact: 'low', technicalComplexity: 'low', coverage });
  assert.equal(noThresholdRisks.some((risk) => risk.category === 'coverage'), false);
  coverage.minimum = 90;
  const risks = assessRisks({ changedFiles: ['lib/normalizer.js'], businessImpact: 'low', technicalComplexity: 'low', coverage });
  assert.equal(risks.find((risk) => risk.category === 'coverage').level, 'MEDIUM');
  const evidence = buildEvidenceLedger({ businessImpact: 'low', technicalComplexity: 'low', changedFiles: ['lib/normalizer.js'], coverage }, []).find((entry) => entry.kind === 'COVERAGE_EVIDENCE');
  assert.match(evidence.statement, /90%/);
});

test('coverage correlation distinguishes changed source files from documentation', async () => {
  const coverage = await loadLcovCoverage(path.join(root, 'examples', 'coverage.lcov'));
  coverage.minimum = 85;
  coverage.correlation = correlateCoverageWithChangedFiles(coverage, [
    'src/payments/authorization.js',
    'src/api/absent.js',
    'docs/USAGE.md'
  ]);

  assert.deepEqual(coverage.correlation.relevantChangedFiles, ['src/payments/authorization.js', 'src/api/absent.js']);
  assert.equal(coverage.correlation.coveredChangedFiles[0].lineCoverage, 66.67);
  assert.deepEqual(coverage.correlation.uncoveredChangedFiles, ['src/api/absent.js']);
  const risk = assessRisks({ changedFiles: ['src/payments/authorization.js'], businessImpact: 'low', technicalComplexity: 'low', coverage })
    .find((item) => item.id === 'R-CHANGED-FILE-COVERAGE');
  assert.equal(risk.level, 'HIGH');
  assert.deepEqual(risk.facts, ['src/api/absent.js', 'src/payments/authorization.js']);
});

test('evidence manifest combines command, test results, and coverage', async () => {
  const bundle = await loadEvidenceManifest(path.join(root, 'examples', 'evidence-manifest.json'), { cwd: root });
  assert.equal(bundle.executionEvidence[0].status, 'passed');
  assert.equal(bundle.testResults.length, 2);
  assert.equal(bundle.coverage.minimum, 85);
});
