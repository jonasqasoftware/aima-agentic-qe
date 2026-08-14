#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadChangeInput } from './change-input.js';
import { createChangeFromLocalDiff } from './local-diff.js';
import { loadFrameworkRegistry, selectFramework } from './framework-registry.js';
import { assessRisks, qualityConfidence } from './risk-engine.js';
import { loadReleasePolicy } from './release-policy.js';
import { compareWithBaseline, loadBaselineReport } from './baseline.js';
import { loadEvidenceArtifact } from './evidence-artifact.js';
import { buildStrategy } from './strategy.js';
import { createReport, writeReports } from './report.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function usage() {
  return [
    'Uso:',
    '  node src/cli.js analyze-pr --change <arquivo.json> [--evidence-artifact <arquivo.json>] [--baseline <relatório.json>] [--policy <arquivo.json>] [--out <diretório>]',
    '  node src/cli.js analyze-diff --repo <diretório> --base <referência> [--head <referência>] --impact <low|medium|high> --complexity <low|medium|high> [--evidence-artifact <arquivo.json>] [--baseline <relatório.json>] [--policy <arquivo.json>] [--out <diretório>]'
  ].join('\n');
}

function argument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

async function main() {
  const [command] = process.argv.slice(2);
  if (!['analyze-pr', 'analyze-diff'].includes(command)) throw new Error(usage());
  const outputDirectory = argument('--out', path.join(root, 'reports'));
  let change;
  if (command === 'analyze-pr') {
    const changePath = argument('--change');
    if (!changePath) throw new Error(usage());
    change = await loadChangeInput(path.resolve(changePath));
  } else {
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
      summary: argument('--summary')
    });
  }
  const artifactPath = argument('--evidence-artifact');
  if (artifactPath) change.artifactEvidence = [await loadEvidenceArtifact(path.resolve(artifactPath))];
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
  console.log(`Relatórios: ${files.jsonPath}, ${files.markdownPath}, ${files.htmlPath}, ${files.sarifPath}`);
}

main().catch((error) => {
  console.error(`aima: ${error.message}`);
  process.exitCode = 2;
});
