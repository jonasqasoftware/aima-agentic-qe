import { readFile } from 'node:fs/promises';

const LEVELS = new Set(['low', 'medium', 'high']);

export async function loadChangeInput(file) {
  const input = JSON.parse(await readFile(file, 'utf8'));
  if (!input.id || !input.summary || !Array.isArray(input.changedFiles) || input.changedFiles.length === 0) {
    throw new Error('Change input requires id, summary, and at least one changed file.');
  }
  if (!LEVELS.has(input.businessImpact) || !LEVELS.has(input.technicalComplexity)) {
    throw new Error('businessImpact and technicalComplexity must be low, medium, or high.');
  }
  return { ...input, knownUnknowns: input.knownUnknowns ?? [] };
}
