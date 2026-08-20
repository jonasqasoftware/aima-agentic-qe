import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

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

export function getFrameworkById(frameworks, id) {
  return frameworks.find((framework) => framework.id === id);
}

export function selectFramework(frameworks, change) {
  const hasDataSurface = change.changedFiles.some((file) => /migration|schema|database|data/i.test(file));
  const frameworkId = hasDataSurface ? 'data-quality-validation' : 'risk-based-testing';
  const selected = frameworks.find((framework) => framework.id === frameworkId);
  if (!selected) throw new Error(`${frameworkId} framework is not registered.`);
  return {
    framework: selected,
    evidence: [
      `Impacto de negócio declarado como ${change.businessImpact}.`,
      `Complexidade técnica declarada como ${change.technicalComplexity}.`,
      `${change.changedFiles.length} arquivo(s) declarado(s) como alterado(s).`,
      hasDataSurface
        ? 'A superfície declarada contém sinal de dados, schema ou migração.'
        : 'A superfície declarada não contém sinal de dados, schema ou migração.'
    ]
  };
}
