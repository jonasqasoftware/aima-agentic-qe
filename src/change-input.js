import { readFile } from 'node:fs/promises';

const LEVELS = new Set(['low', 'medium', 'high']);

function validateDeclaredEvidence(items) {
  if (!Array.isArray(items)) throw new Error('declaredEvidence must be an array when provided.');
  for (const item of items) {
    if (!item || !item.id || !item.type || !item.summary) {
      throw new Error('Each declaredEvidence item requires id, type, and summary.');
    }
  }
}

export async function loadChangeInput(file) {
  const input = JSON.parse(await readFile(file, 'utf8'));
  if (!input.id || !input.summary || !Array.isArray(input.changedFiles) || input.changedFiles.length === 0) {
    throw new Error('Change input requires id, summary, and at least one changed file.');
  }
  if (!LEVELS.has(input.businessImpact) || !LEVELS.has(input.technicalComplexity)) {
    throw new Error('businessImpact and technicalComplexity must be low, medium, or high.');
  }
  validateDeclaredEvidence(input.declaredEvidence ?? []);
  return { ...input, knownUnknowns: input.knownUnknowns ?? [], declaredEvidence: input.declaredEvidence ?? [] };
}
