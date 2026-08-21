import { readFile } from 'node:fs/promises';
import { normalizeChangeInput } from './change-input-core.js';

export async function loadChangeInput(file) {
  return normalizeChangeInput(JSON.parse(await readFile(file, 'utf8')));
}

export { normalizeChangeInput };
