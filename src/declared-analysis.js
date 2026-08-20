import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeChangeInput } from './change-input.js';
import { loadFrameworkRegistry, selectFramework } from './framework-registry.js';
import { assessRisks, qualityConfidence } from './risk-engine.js';
import { loadReleasePolicy } from './release-policy.js';
import { buildStrategy } from './strategy.js';
import { createReport } from './report.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export async function analyzeDeclaredChange(input) {
  const change = normalizeChangeInput(input);
  const frameworks = await loadFrameworkRegistry(path.join(root, 'aima', 'frameworks'));
  const risks = assessRisks(change);
  const confidence = qualityConfidence(risks, change.knownUnknowns);
  const policy = await loadReleasePolicy(path.join(root, 'aima', 'policies', 'evidence-aware-release.json'));
  return createReport(change, selectFramework(frameworks, change), risks, confidence, buildStrategy(risks, change.knownUnknowns, policy));
}
