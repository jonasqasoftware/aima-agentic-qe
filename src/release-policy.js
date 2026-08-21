import { readFile } from 'node:fs/promises';
import { validateReleasePolicy } from './release-policy-core.js';

export async function loadReleasePolicy(file) {
  let policy;
  try {
    policy = JSON.parse(await readFile(file, 'utf8'));
  } catch (error) {
    throw new Error(`Unable to load release policy: ${error.message}`);
  }
  validateReleasePolicy(policy);
  return policy;
}

export { validateReleasePolicy };
