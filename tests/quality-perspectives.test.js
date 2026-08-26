import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { analyzeChange } from '../src/analyze-change.js';
import { analyzeDeclaredChange, loadFrameworkRegistry, loadReleasePolicy } from '../src/index.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function loadPaymentRefactorChange() {
  return JSON.parse(await readFile(path.join(root, 'examples', 'payment-refactor.change.json'), 'utf8'));
}

async function loadCanonicalDependencies() {
  const frameworks = await loadFrameworkRegistry(path.join(root, 'aima', 'frameworks'));
  const releasePolicy = await loadReleasePolicy(path.join(root, 'aima', 'policies', 'evidence-aware-release.json'));
  return { frameworks, releasePolicy };
}

test('flag OFF (default): no qualityPerspectiveCoverage key, no block in markdown/html, recommendation unchanged', async () => {
  const change = await loadPaymentRefactorChange();
  const deps = await loadCanonicalDependencies();

  const withoutFlagsArg = analyzeChange(change, deps);
  const withFlagOff = analyzeChange(change, { ...deps, featureFlags: { qualityPerspectives: false } });

  assert.equal('qualityPerspectiveCoverage' in withoutFlagsArg, false);
  assert.equal('qualityPerspectiveCoverage' in withFlagOff, false);
  assert.deepEqual(withoutFlagsArg, withFlagOff);
});

test('flag ON, no qualityPerspectives declared: all four perspectives are UNKNOWN with empty evidence', async () => {
  const change = await loadPaymentRefactorChange();
  const deps = await loadCanonicalDependencies();

  const report = analyzeChange(change, { ...deps, featureFlags: { qualityPerspectives: true } });

  assert.deepEqual(report.qualityPerspectiveCoverage, {
    product: { status: 'unknown', evidence: [] },
    user: { status: 'unknown', evidence: [] },
    manufacturing: { status: 'unknown', evidence: [] },
    value: { status: 'unknown', evidence: [] }
  });
});

test('flag ON, partial declaration: declared perspectives keep their status, the rest fall back to UNKNOWN', async () => {
  const change = await loadPaymentRefactorChange();
  change.qualityPerspectives = {
    product: { status: 'covered', evidence: ['PRD-001 revisado com o time de produto'] },
    value: { status: 'partial' }
  };
  const deps = await loadCanonicalDependencies();

  const report = analyzeChange(change, { ...deps, featureFlags: { qualityPerspectives: true } });

  assert.equal(report.qualityPerspectiveCoverage.product.status, 'covered');
  assert.deepEqual(report.qualityPerspectiveCoverage.product.evidence, ['PRD-001 revisado com o time de produto']);
  assert.equal(report.qualityPerspectiveCoverage.value.status, 'partial');
  assert.deepEqual(report.qualityPerspectiveCoverage.value.evidence, []);
  assert.equal(report.qualityPerspectiveCoverage.user.status, 'unknown');
  assert.equal(report.qualityPerspectiveCoverage.manufacturing.status, 'unknown');
});

test('flag ON, all three status values accepted for every perspective, including explicit unknown', async () => {
  const change = await loadPaymentRefactorChange();
  change.qualityPerspectives = {
    product: { status: 'covered', evidence: ['exploratory session with PM'] },
    user: { status: 'partial', evidence: ['usability review pending'] },
    manufacturing: { status: 'unknown' },
    value: { status: 'covered' }
  };
  const deps = await loadCanonicalDependencies();

  const report = analyzeChange(change, { ...deps, featureFlags: { qualityPerspectives: true } });

  assert.equal(report.qualityPerspectiveCoverage.product.status, 'covered');
  assert.equal(report.qualityPerspectiveCoverage.user.status, 'partial');
  assert.equal(report.qualityPerspectiveCoverage.manufacturing.status, 'unknown');
  assert.equal(report.qualityPerspectiveCoverage.value.status, 'covered');
});

test('flag ON, invalid status value throws instead of silently accepting it', async () => {
  const change = await loadPaymentRefactorChange();
  change.qualityPerspectives = { product: { status: 'done' } };
  const deps = await loadCanonicalDependencies();

  assert.throws(
    () => analyzeChange(change, { ...deps, featureFlags: { qualityPerspectives: true } }),
    /status must be one of covered, partial, or unknown/
  );
});

test('flag ON, unknown perspective key throws instead of being silently ignored', async () => {
  const change = await loadPaymentRefactorChange();
  change.qualityPerspectives = { environment: { status: 'covered' } };
  const deps = await loadCanonicalDependencies();

  assert.throws(
    () => analyzeChange(change, { ...deps, featureFlags: { qualityPerspectives: true } }),
    /unknown perspective: environment/
  );
});

test('flag ON, malformed evidence (non-string entry) throws', async () => {
  const change = await loadPaymentRefactorChange();
  change.qualityPerspectives = { product: { status: 'covered', evidence: [42] } };
  const deps = await loadCanonicalDependencies();

  assert.throws(
    () => analyzeChange(change, { ...deps, featureFlags: { qualityPerspectives: true } }),
    /evidence must be an array of non-empty strings/
  );
});

test('flag never changes risks, qualityConfidence, or the release recommendation', async () => {
  const change = await loadPaymentRefactorChange();
  change.qualityPerspectives = { product: { status: 'covered' } };
  const deps = await loadCanonicalDependencies();

  const off = analyzeChange(change, deps);
  const on = analyzeChange(change, { ...deps, featureFlags: { qualityPerspectives: true } });

  assert.deepEqual(off.risks, on.risks);
  assert.deepEqual(off.qualityConfidence, on.qualityConfidence);
  assert.equal(off.strategy.recommendation, on.strategy.recommendation);
});

test('markdown and html render the block only when the flag is on, and never otherwise', async () => {
  const { formatMarkdown, formatHtml } = await import('../src/report.js');
  const change = await loadPaymentRefactorChange();
  const deps = await loadCanonicalDependencies();

  const off = analyzeChange(change, deps);
  const on = analyzeChange(change, { ...deps, featureFlags: { qualityPerspectives: true } });

  assert.equal(formatMarkdown(off).includes('Quality Perspective Coverage'), false);
  assert.equal(formatHtml(off).includes('Quality Perspective Coverage'), false);
  assert.equal(formatMarkdown(on).includes('Quality Perspective Coverage'), true);
  assert.equal(formatHtml(on).includes('Quality Perspective Coverage'), true);
  assert.match(formatMarkdown(on), /UNKNOWN/);
});

test('analyzeDeclaredChange reads AIMA_FEATURE_QUALITY_PERSPECTIVES and stays off by default', async () => {
  const change = await loadPaymentRefactorChange();
  const original = process.env.AIMA_FEATURE_QUALITY_PERSPECTIVES;
  try {
    delete process.env.AIMA_FEATURE_QUALITY_PERSPECTIVES;
    const offReport = await analyzeDeclaredChange(change);
    assert.equal('qualityPerspectiveCoverage' in offReport, false);

    process.env.AIMA_FEATURE_QUALITY_PERSPECTIVES = '1';
    const onReport = await analyzeDeclaredChange(change);
    assert.equal('qualityPerspectiveCoverage' in onReport, true);
  } finally {
    if (original === undefined) delete process.env.AIMA_FEATURE_QUALITY_PERSPECTIVES;
    else process.env.AIMA_FEATURE_QUALITY_PERSPECTIVES = original;
  }
});
