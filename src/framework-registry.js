import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { selectFramework, getFrameworkById } from './framework-selection.js';

const REQUIRED_FIELDS = ['id', 'name', 'inputs', 'process', 'outputs', 'recommendedAgents'];

// JSON is a valid YAML subset. The MVP uses JSON-compatible YAML files to
// remain dependency-free while preserving an extensible framework format.
export async function loadFrameworkRegistry(directory) {
  const files = (await readdir(directory)).filter((file) => file.endsWith('.yaml')).sort();
  const frameworks = await Promise.all(files.map(async (file) => {
    const source = await readFile(path.join(directory, file), 'utf8');
    let framework;
    try {
      framework = JSON.parse(source);
    } catch {
      throw new Error(`${file} must use JSON-compatible YAML in this MVP.`);
    }
    validateFramework(framework, file);
    return framework;
  }));
  return frameworks;
}

function validateFramework(framework, file) {
  for (const field of REQUIRED_FIELDS) {
    if (!framework[field] || (Array.isArray(framework[field]) && framework[field].length === 0)) {
      throw new Error(`${file} is missing required field ${field}.`);
    }
  }
}

export { selectFramework, getFrameworkById };
