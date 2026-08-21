import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFrameworkRegistry } from './framework-registry.js';
import { loadReleasePolicy } from './release-policy.js';
import { analyzeChange } from './analyze-change.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export async function analyzeDeclaredChange(input) {
  const frameworks = await loadFrameworkRegistry(path.join(root, 'aima', 'frameworks'));
  const policy = await loadReleasePolicy(path.join(root, 'aima', 'policies', 'evidence-aware-release.json'));
  return analyzeChange(input, { frameworks, releasePolicy: policy });
}
