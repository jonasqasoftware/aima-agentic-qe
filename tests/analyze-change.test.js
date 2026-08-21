import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { analyzeChange } from '../src/analyze-change.js';
import {
  analyzeDeclaredChange,
  loadFrameworkRegistry,
  loadReleasePolicy,
  normalizeChangeInput,
  selectFramework
} from '../src/index.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const BROWSER_CORE_MODULES = [
  'src/change-input-core.js',
  'src/framework-selection.js',
  'src/release-policy-core.js',
  'src/risk-engine.js',
  'src/strategy.js',
  'src/report.js',
  'src/evidence-ledger.js',
  'src/analyze-change.js'
];

async function loadPaymentRefactorChange() {
  return JSON.parse(await readFile(path.join(root, 'examples', 'payment-refactor.change.json'), 'utf8'));
}

async function loadCanonicalDependencies() {
  const frameworks = await loadFrameworkRegistry(path.join(root, 'aima', 'frameworks'));
  const releasePolicy = await loadReleasePolicy(path.join(root, 'aima', 'policies', 'evidence-aware-release.json'));
  return { frameworks, releasePolicy };
}

test('analyzeChange produces exactly what the Node adapter analyzeDeclaredChange computes', async () => {
  const change = await loadPaymentRefactorChange();
  const { frameworks, releasePolicy } = await loadCanonicalDependencies();

  const pureReport = analyzeChange(change, { frameworks, releasePolicy });
  const adapterReport = await analyzeDeclaredChange(change);

  assert.deepEqual(pureReport, adapterReport);
});

test('analyzeChange rejects a declared change missing required fields exactly like normalizeChangeInput', async () => {
  const { frameworks, releasePolicy } = await loadCanonicalDependencies();
  const incomplete = { id: 'INCOMPLETE' };

  assert.throws(() => analyzeChange(incomplete, { frameworks, releasePolicy }), (error) => {
    try {
      normalizeChangeInput(incomplete);
      return false;
    } catch (directError) {
      return error.message === directError.message;
    }
  });
});

test('analyzeChange selects the same framework as selectFramework for a data-surface change', async () => {
  const { frameworks, releasePolicy } = await loadCanonicalDependencies();
  const change = {
    id: 'DATA-001',
    summary: 'Migração de schema',
    changedFiles: ['db/migrations/2026-add-column.sql'],
    businessImpact: 'high',
    technicalComplexity: 'medium'
  };

  const report = analyzeChange(change, { frameworks, releasePolicy });
  const normalized = normalizeChangeInput(change);
  const expectedSelection = selectFramework(frameworks, normalized);

  assert.equal(report.framework.id, expectedSelection.framework.id);
  assert.equal(report.framework.id, 'data-quality-validation');
});

test('analyzeChange preserves FACT, INFERENCE, and UNKNOWN entries in the evidence ledger', async () => {
  const change = await loadPaymentRefactorChange();
  const { frameworks, releasePolicy } = await loadCanonicalDependencies();

  const report = analyzeChange(change, { frameworks, releasePolicy });

  const kinds = new Set(report.evidenceLedger.map((entry) => entry.kind));
  assert.ok(kinds.has('FACT'), 'evidence ledger must preserve FACT entries');
  assert.ok(kinds.has('INFERENCE'), 'evidence ledger must preserve INFERENCE entries');
  assert.ok(kinds.has('UNKNOWN'), 'evidence ledger must preserve UNKNOWN entries');
});

test('browser-core modules never import a node: builtin', async () => {
  assert.ok(BROWSER_CORE_MODULES.length > 0);
  for (const relativePath of BROWSER_CORE_MODULES) {
    const source = await readFile(path.join(root, relativePath), 'utf8');
    assert.equal(
      /from\s+['"]node:/.test(source),
      false,
      `${relativePath} must not import a node: builtin — it is part of the browser-portable core`
    );
  }
});
