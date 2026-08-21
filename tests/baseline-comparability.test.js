import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import os from 'node:os';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { compareWithBaseline, loadBaselineReport } from '../src/baseline.js';

function report({ score, model, riskId = 'R-ONE', recommendation = 'GO WITH RISKS' }) {
  return {
    context: { changeId: 'CHG-1' },
    qualityConfidence: model ? { score, model } : { score },
    strategy: { recommendation },
    risks: [{ id: riskId, score, level: 'MEDIUM' }]
  };
}

const modelA = { id: 'highest-risk-residual-confidence', version: '1.0.0' };
const modelB = { id: 'highest-risk-residual-confidence', version: '2.0.0' };
const modelC = { id: 'some-other-model', version: '1.0.0' };

// A. Same model + version → comparable true, delta valid
test('A. same model/version yields comparable=true and a valid delta', () => {
  const baseline = report({ score: 60, model: modelA });
  const current = report({ score: 75, model: modelA });
  const comparison = compareWithBaseline(current, baseline);
  assert.equal(comparison.qualityConfidenceComparable, true);
  assert.equal(comparison.qualityConfidenceDelta, 15);
  assert.deepEqual(comparison.baselineConfidenceModel, modelA);
  assert.deepEqual(comparison.currentConfidenceModel, modelA);
});

// B. Different version → comparable false
test('B. different model version yields comparable=false', () => {
  const baseline = report({ score: 60, model: modelA });
  const current = report({ score: 75, model: modelB });
  const comparison = compareWithBaseline(current, baseline);
  assert.equal(comparison.qualityConfidenceComparable, false);
  assert.match(comparison.boundary, /modelos de Quality Confidence diferentes/);
});

// C. Different model id → comparable false
test('C. different model id yields comparable=false', () => {
  const baseline = report({ score: 60, model: modelA });
  const current = report({ score: 75, model: modelC });
  const comparison = compareWithBaseline(current, baseline);
  assert.equal(comparison.qualityConfidenceComparable, false);
});

// D. Legacy baseline (no model metadata) vs. a versioned current report → comparable false
test('D. legacy baseline without model metadata vs. versioned current yields comparable=false', () => {
  const baseline = report({ score: 60 }); // no model field at all
  const current = report({ score: 75, model: modelA });
  const comparison = compareWithBaseline(current, baseline);
  assert.equal(comparison.qualityConfidenceComparable, false);
  assert.equal(comparison.baselineConfidenceModel, null);
  assert.deepEqual(comparison.currentConfidenceModel, modelA);
  // delta is still preserved numerically for backward compatibility
  assert.equal(comparison.qualityConfidenceDelta, 15);
});

// Two legacy reports (both without model metadata) are consistently the
// same (legacy) model, so they remain comparable to each other.
test('two legacy reports without model metadata are comparable to each other', () => {
  const baseline = report({ score: 60 });
  const current = report({ score: 75 });
  const comparison = compareWithBaseline(current, baseline);
  assert.equal(comparison.qualityConfidenceComparable, true);
});

// E. loadBaselineReport still accepts an old report shape with only a
// numeric qualityConfidence.score and no model metadata.
test('E. loadBaselineReport accepts a legacy report with only a numeric score', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'aima-baseline-'));
  const file = path.join(dir, 'legacy-report.json');
  await writeFile(file, JSON.stringify({
    context: { changeId: 'LEGACY-1' },
    qualityConfidence: { score: 50 },
    risks: [{ id: 'R-ONE', score: 50, level: 'MEDIUM' }],
    strategy: { recommendation: 'GO WITH RISKS' }
  }));
  const baseline = await loadBaselineReport(file);
  assert.equal(baseline.qualityConfidence.score, 50);
  assert.equal(baseline.qualityConfidence.model, undefined);
});
