#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { loadChangeInput } from './change-input.js';
import { createChangeFromLocalDiff } from './local-diff.js';
import { createChangeFromGitHubPr } from './github-pr.js';
import { executeEvidenceCommand } from './command-evidence.js';
import { loadJUnitResults } from './junit-results.js';
import { loadJsonTestResults } from './json-test-results.js';
import { loadLcovCoverage } from './lcov-coverage.js';
import { loadFrameworkRegistry, selectFramework } from './framework-registry.js';
import { assessRisks, qualityConfidence } from './risk-engine.js';
import { loadReleasePolicy } from './release-policy.js';
import { compareWithBaseline, loadBaselineReport } from './baseline.js';
import { loadEvidenceArtifact } from './evidence-artifact.js';
import { shouldFailQualityGate } from './quality-gate.js';
import { verifyReportManifest } from './report-manifest.js';
import { evaluateChange } from './evaluation.js';
import { buildDashboard } from './dashboard.js';
import { buildStrategy } from './strategy.js';
import { createReport, writeReports } from './report.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function usage() {
  return [
    'Uso:',
    '  node src/cli.js verify-report --dir <diretório>',
    '  node src/cli.js evaluate --change <arquivo.json> --expected <arquivo.json> [--policy <arquivo.json>]',
    '  node src/cli.js dashboard --reports <diretório> [--out <arquivo.html>]',
    '  node src/cli.js analyze-pr --change <arquivo.json> [--execute-evidence <comando.json>] [--junit <resultado.xml>] [--test-results <resultado.json>] [--lcov <coverage.info>] [--min-line-coverage <0-100>] [--fail-on <never|no-go|go-with-risks>] [--evidence-artifact <arquivo.json>] [--baseline <relatório.json>] [--policy <arquivo.json>] [--out <diretório>]',
    '  node src/cli.js analyze-github-pr --repo <dono/repositório> --pr <número> --impact <low|medium|high> --complexity <low|medium|high> [--fail-on <never|no-go|go-with-risks>] [--evidence-artifact <arquivo.json>] [--baseline <relatório.json>] [--policy <arquivo.json>] [--out <diretório>]',
    '  node src/cli.js analyze-diff --repo <diretório> --base <referência> [--head <referência>] [--include-stats] --impact <low|medium|high> --complexity <low|medium|high> [--fail-on <never|no-go|go-with-risks>] [--evidence-artifact <arquivo.json>] [--baseline <relatório.json>] [--policy <arquivo.json>] [--out <diretório>]'
  ].join('\n');
}

function argument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

async function main() {
  const [command] = process.argv.slice(2);
  if (command === 'verify-report') {
    const directory = argument('--dir');
    if (!directory) throw new Error(usage());
    const verification = await verifyReportManifest(path.resolve(directory));
    for (const check of verification.checks) console.log(`${check.valid ? '✓' : '✗'} ${check.filename}`);
    if (!verification.valid) process.exitCode = 1;
    return;
  }
  if (command === 'evaluate') {
    const changePath = argument('--change');
    const expectedPath = argument('--expected');
    if (!changePath || !expectedPath) throw new Error(usage());
    const change = await loadChangeInput(path.resolve(changePath));
    const expected = JSON.parse(await readFile(path.resolve(expectedPath), 'utf8'));
    const frameworks = await loadFrameworkRegistry(path.join(root, 'aima', 'frameworks'));
    const policyPath = argument('--policy', path.join(root, 'aima', 'policies', 'evidence-aware-release.json'));
    const evaluation = evaluateChange(change, expected, frameworks, await loadReleasePolicy(path.resolve(policyPath)));
    console.log(`Avaliação: ${evaluation.passed ? 'PASSOU' : 'FALHOU'}`);
    for (const failure of evaluation.failures) console.error(`- ${failure}`);
    if (!evaluation.passed) process.exitCode = 1;
    return;
  }
  if (command === 'dashboard') {
    const reportsDirectory = argument('--reports');
    if (!reportsDirectory) throw new Error(usage());
    const outputFile = argument('--out', path.join(root, 'reports', 'aima-quality-dashboard.html'));
    const dashboard = await buildDashboard(path.resolve(reportsDirectory), path.resolve(outputFile));
    console.log(`Dashboard: ${dashboard.outputFile} (${dashboard.summaries.length} relatório(s))`);
    return;
  }
  if (!['analyze-pr', 'analyze-diff', 'analyze-github-pr'].includes(command)) throw new Error(usage());
  const outputDirectory = argument('--out', path.join(root, 'reports'));
  let change;
  if (command === 'analyze-pr') {
    const changePath = argument('--change');
    if (!changePath) throw new Error(usage());
    change = await loadChangeInput(path.resolve(changePath));
  } else if (command === 'analyze-diff') {
    const repoPath = argument('--repo');
    const base = argument('--base');
    const businessImpact = argument('--impact');
    const technicalComplexity = argument('--complexity');
    if (!repoPath || !base || !businessImpact || !technicalComplexity) throw new Error(usage());
    change = await createChangeFromLocalDiff({
      repoPath: path.resolve(repoPath),
      base,
      head: argument('--head', 'HEAD'),
      businessImpact,
      technicalComplexity,
      id: argument('--id'),
      summary: argument('--summary'),
      includeStats: process.argv.includes('--include-stats')
    });
  } else {
    const repo = argument('--repo');
    const number = argument('--pr');
    const businessImpact = argument('--impact');
    const technicalComplexity = argument('--complexity');
    if (!repo || !number || !businessImpact || !technicalComplexity) throw new Error(usage());
    change = await createChangeFromGitHubPr({ repo, number, businessImpact, technicalComplexity });
  }
  const artifactPath = argument('--evidence-artifact');
  if (artifactPath) change.artifactEvidence = [await loadEvidenceArtifact(path.resolve(artifactPath))];
  const commandPath = argument('--execute-evidence');
  if (commandPath) change.executionEvidence = [await executeEvidenceCommand(path.resolve(commandPath), { cwd: process.cwd() })];
  const junitPath = argument('--junit');
  if (junitPath) change.testResults = [await loadJUnitResults(path.resolve(junitPath))];
  const jsonResultsPath = argument('--test-results');
  if (jsonResultsPath) change.testResults = [await loadJsonTestResults(path.resolve(jsonResultsPath))];
  const lcovPath = argument('--lcov');
  if (lcovPath) {
    change.coverage = await loadLcovCoverage(path.resolve(lcovPath));
    const minimum = argument('--min-line-coverage');
    if (minimum != null && (!/^\d+(\.\d+)?$/.test(minimum) || Number(minimum) > 100)) throw new Error('--min-line-coverage must be a number from 0 to 100.');
    if (minimum != null) change.coverage.minimum = Number(minimum);
  }
  const frameworks = await loadFrameworkRegistry(path.join(root, 'aima', 'frameworks'));
  const selection = selectFramework(frameworks, change);
  const risks = assessRisks(change);
  const confidence = qualityConfidence(risks, change.knownUnknowns);
  const policyPath = argument('--policy', path.join(root, 'aima', 'policies', 'evidence-aware-release.json'));
  const policy = await loadReleasePolicy(path.resolve(policyPath));
  const strategy = buildStrategy(risks, change.knownUnknowns, policy);
  const report = createReport(change, selection, risks, confidence, strategy);
  const baselinePath = argument('--baseline');
  if (baselinePath) report.baselineComparison = compareWithBaseline(report, await loadBaselineReport(path.resolve(baselinePath)));
  const files = await writeReports(report, path.resolve(outputDirectory));
  console.log(`AIMA Agentic QE: ${report.strategy.recommendation}`);
  console.log(`Quality Confidence experimental: ${report.qualityConfidence.score}/100`);
  console.log(`Relatórios: ${files.jsonPath}, ${files.markdownPath}, ${files.htmlPath}, ${files.sarifPath}, ${files.manifestPath}`);
  const failOn = argument('--fail-on', 'never');
  if (shouldFailQualityGate(report.strategy.recommendation, failOn)) {
    console.error(`Quality gate falhou: recomendação ${report.strategy.recommendation} bloqueada pelo modo ${failOn}.`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`aima: ${error.message}`);
  process.exitCode = 2;
});
