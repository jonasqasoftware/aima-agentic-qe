import assert from 'node:assert/strict';
import test from 'node:test';
import { assessRisks, qualityConfidence } from '../src/risk-engine.js';
import { normalizeChangeInput } from '../src/change-input-core.js';

// These tests describe the CORRECT, target behavior of qualityConfidence()
// under the approved "highest-risk residual confidence" model (Model A).
// Some of them are expected to fail against the pre-fix mean-based
// aggregation — that failure is intentional "prove before" evidence for
// the regression this suite guards against, not a bug in the test.

function conf(riskScores, unknowns = []) {
  return qualityConfidence(riskScores.map((score) => ({ score })), unknowns).score;
}

function pipelineConfidence(input) {
  const change = normalizeChangeInput(input);
  const risks = assessRisks(change);
  return qualityConfidence(risks, change.knownUnknowns).score;
}

// A. Determinism
test('A. determinism: same input always yields the same score', () => {
  const risks = [{ score: 80 }, { score: 40 }];
  const unknowns = ['u1'];
  const first = qualityConfidence(risks, unknowns).score;
  const second = qualityConfidence(risks, unknowns).score;
  assert.equal(first, second);
});

// B. Boundedness
test('B. boundedness: score always stays within [0, 100] across a deterministic grid', () => {
  const scoreGrid = [0, 6, 20, 35, 50, 70, 90, 100];
  const unknownCounts = [0, 1, 2, 3, 5, 10];
  for (const a of scoreGrid) {
    for (const b of scoreGrid) {
      for (const unknownCount of unknownCounts) {
        const score = conf([a, b], Array.from({ length: unknownCount }, (_, i) => `u${i}`));
        assert.ok(score >= 0 && score <= 100, `score ${score} out of bounds for risks=[${a},${b}] unknowns=${unknownCount}`);
      }
    }
  }
});

// C. Risk monotonicity: raising a single risk's score (all else equal) never increases confidence
test('C. risk monotonicity: increasing one risk score never increases confidence', () => {
  const scores = [10, 30, 50, 70, 90, 100];
  let previous = conf([scores[0]]);
  for (const score of scores.slice(1)) {
    const current = conf([score]);
    assert.ok(current <= previous, `confidence rose from ${previous} to ${current} when raising the only risk to ${score}`);
    previous = current;
  }
});

// D. Risk-addition monotonicity: adding a risk (any non-negative score) never increases confidence
test('D. risk-addition monotonicity: adding a risk never increases confidence', () => {
  const cases = [
    { base: [100, 100], added: 50 },
    { base: [100, 100], added: 80 },
    { base: [90], added: 6 },
    { base: [6], added: 90 },
    { base: [38, 38], added: 10 }
  ];
  for (const { base, added } of cases) {
    const before = conf(base);
    const after = conf([...base, added]);
    assert.ok(after <= before, `adding risk ${added} to [${base}] raised confidence from ${before} to ${after}`);
  }
});

// E. Unknown monotonicity: adding an unknown never increases confidence
test('E. unknown monotonicity: adding unknowns never increases confidence', () => {
  const risks = [50];
  let previous = conf(risks, []);
  for (let n = 1; n <= 6; n++) {
    const current = conf(risks, Array.from({ length: n }, (_, i) => `u${i}`));
    assert.ok(current <= previous, `confidence rose from ${previous} to ${current} at ${n} unknown(s)`);
    previous = current;
  }
});

// F. Unknown removal monotonicity: removing an unknown never decreases confidence
test('F. unknown removal monotonicity: removing an unknown never decreases confidence', () => {
  const risks = [50];
  const withThree = conf(risks, ['u1', 'u2', 'u3']);
  const withTwo = conf(risks, ['u1', 'u2']);
  const withOne = conf(risks, ['u1']);
  const withNone = conf(risks, []);
  assert.ok(withTwo >= withThree, `${withTwo} should be >= ${withThree}`);
  assert.ok(withOne >= withTwo, `${withOne} should be >= ${withTwo}`);
  assert.ok(withNone >= withOne, `${withNone} should be >= ${withOne}`);
});

// G. Order invariance: shuffling risk order never changes the score
test('G. order invariance: risk array order does not affect the score', () => {
  const forward = conf([10, 90, 50, 30]);
  const reversed = conf([30, 50, 90, 10]);
  const shuffled = conf([90, 30, 10, 50]);
  assert.equal(forward, reversed);
  assert.equal(forward, shuffled);
});

// H. Unknown order invariance: shuffling the unknowns array never changes the score
test('H. unknown order invariance: unknown array order does not affect the score', () => {
  const risks = [50];
  const forward = conf(risks, ['a', 'b', 'c']);
  const reversed = conf(risks, ['c', 'b', 'a']);
  assert.equal(forward, reversed);
});

// I. High-risk non-dilution: a severe risk's contribution must not shrink because
// weaker, unrelated risks are also present in the same analysis.
test('I. high-risk non-dilution: a severe risk alone vs. diluted by weaker risks yields the same confidence', () => {
  const alone = conf([90]);
  const dilutedByOneWeak = conf([90, 6]);
  const dilutedByTwoWeak = conf([90, 6, 6]);
  assert.equal(dilutedByOneWeak, alone, `diluting a 90-risk with one weak risk changed confidence from ${alone} to ${dilutedByOneWeak}`);
  assert.equal(dilutedByTwoWeak, alone, `diluting a 90-risk with two weak risks changed confidence from ${alone} to ${dilutedByTwoWeak}`);
  assert.ok(dilutedByTwoWeak <= dilutedByOneWeak, 'confidence must not increase as more weak risks are added alongside a severe one');
});

// Direct regression for the exact counterexample found in the PR B audit:
// [90, 6] vs [90, 6, 6] — the second must never produce a HIGHER confidence.
test('regression: [90,6] vs [90,6,6] — adding a second weak risk never raises confidence', () => {
  const twoRisks = conf([90, 6]);
  const threeRisks = conf([90, 6, 6]);
  assert.ok(threeRisks <= twoRisks, `[90,6,6] (${threeRisks}) must not exceed [90,6] (${twoRisks})`);
});

// J. Negative-evidence non-improvement: declaring a real coverage failure on top
// of an already-high-risk change must never raise confidence.
// Reproduces the audit's real-pipeline counterexample. Corrected description:
// the audit's prose said "medium/medium" for a related scenario, but this
// specific counterexample uses businessImpact=high/technicalComplexity=high
// (score 6 belongs to a low/low scenario, not this one) — using the accurate
// high/high inputs here.
test('J. negative-evidence non-improvement: adding a coverage failure never raises confidence (real pipeline)', () => {
  const withoutCoverageFailure = pipelineConfidence({
    id: 'A',
    summary: 'high impact change without coverage evidence',
    changedFiles: ['src/payments/authorization.js'],
    businessImpact: 'high',
    technicalComplexity: 'high',
    knownUnknowns: []
  });

  const withCoverageFailure = pipelineConfidence({
    id: 'B',
    summary: 'same change plus a real below-threshold coverage report',
    changedFiles: ['src/payments/authorization.js'],
    businessImpact: 'high',
    technicalComplexity: 'high',
    knownUnknowns: [],
    coverage: { minimum: 90, lineCoverage: 85 }
  });

  assert.ok(
    withCoverageFailure <= withoutCoverageFailure,
    `declaring a coverage failure raised confidence from ${withoutCoverageFailure} to ${withCoverageFailure} — this was the confirmed defect under the old mean-based model (45 -> 54)`
  );
});

// K. Deterministic rounding: Math.round boundary behavior is stable and reproducible
test('K. deterministic rounding: half-point boundaries round consistently and repeatably', () => {
  // highestRiskScore values chosen so that highestRiskScore * 0.55 lands on or near a .5 boundary
  const boundaryScores = [1, 9, 11, 19, 21, 29, 45, 55, 91, 99, 100];
  for (const score of boundaryScores) {
    const first = conf([score]);
    const second = conf([score]);
    const expectedRiskPenalty = Math.min(55, Math.round(score * 0.55));
    const expectedScore = Math.max(0, 100 - expectedRiskPenalty);
    assert.equal(first, second, `non-deterministic rounding for score ${score}`);
    assert.equal(first, expectedScore, `rounding mismatch for score ${score}: expected ${expectedScore}, got ${first}`);
  }
});

// Production default regression: the analyzer's default form values must
// keep producing Quality Confidence = 69, derived through the real pipeline,
// not hardcoded. Highest risk stays 38 (R-FINANCIAL and R-SECURITY both
// score 38 for this input), so highestRiskScore-based and mean-based models
// happen to agree exactly at this single default scenario:
// round(38 * 0.55) = 21; 1 unknown = 10; 100 - 21 - 10 = 69.
test('production default: medium/medium, 1 file, 1 unknown yields Quality Confidence 69', () => {
  const score = pipelineConfidence({
    id: 'WEB-ANALYZE-001',
    summary: 'Mudança analisada localmente no navegador',
    changedFiles: ['src/payments/authorization.js'],
    businessImpact: 'medium',
    technicalComplexity: 'medium',
    knownUnknowns: ['Resultado de teste de regressão não fornecido.']
  });
  assert.equal(score, 69);
});

// Edge case explicitly required by the approved model: qualityConfidence()
// called directly with an empty risks array must not throw and must treat
// highestRiskScore as 0.
test('edge case: empty risks array yields highestRiskScore 0, not an error', () => {
  const result = qualityConfidence([], []);
  assert.equal(result.score, 100);
});

// Model must not depend on array order/position (e.g. must not assume
// risks[0] is the highest, even though assessRisks() happens to sort today).
test('does not assume risks[0] is the highest-scored risk', () => {
  const risks = [{ score: 10 }, { score: 90 }, { score: 40 }];
  const result = qualityConfidence(risks, []);
  const expectedRiskPenalty = Math.min(55, Math.round(90 * 0.55));
  assert.equal(result.score, Math.max(0, 100 - expectedRiskPenalty));
});
