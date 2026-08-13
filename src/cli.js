#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadChangeInput } from './change-input.js';
import { loadFrameworkRegistry, selectFramework } from './framework-registry.js';
import { assessRisks, qualityConfidence } from './risk-engine.js';
import { buildStrategy } from './strategy.js';
import { createReport, writeReports } from './report.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function usage() {
  return 'Uso: node src/cli.js analyze-pr --change <arquivo.json> [--out <diretório>]';
}

function argument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

async function main() {
  const [command] = process.argv.slice(2);
  if (command !== 'analyze-pr') throw new Error(usage());
  const changePath = argument('--change');
  if (!changePath) throw new Error(usage());
  const outputDirectory = argument('--out', path.join(root, 'reports'));
  const change = await loadChangeInput(path.resolve(changePath));
  const frameworks = await loadFrameworkRegistry(path.join(root, 'aima', 'frameworks'));
  const selection = selectFramework(frameworks, change);
  const risks = assessRisks(change);
  const confidence = qualityConfidence(risks, change.knownUnknowns);
  const strategy = buildStrategy(risks, change.knownUnknowns);
  const report = createReport(change, selection, risks, confidence, strategy);
  const files = await writeReports(report, path.resolve(outputDirectory));
  console.log(`AIMA Agentic QE: ${report.strategy.recommendation}`);
  console.log(`Quality Confidence experimental: ${report.qualityConfidence.score}/100`);
  console.log(`Relatórios: ${files.jsonPath}, ${files.markdownPath}`);
}

main().catch((error) => {
  console.error(`aima: ${error.message}`);
  process.exitCode = 2;
});
