import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildStrategy } from '../src/strategy.js';
import { loadReleasePolicy } from '../src/release-policy.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const highRisk = [{ id: 'R-ONE', score: 90, level: 'HIGH', recommendedTests: ['t1'] }];
const noHighRisk = [{ id: 'R-ONE', score: 20, level: 'LOW', recommendedTests: ['t1'] }];

// This suite exercises the four existing branches of buildStrategy() and
// asserts BOTH that the recommendation is exactly what it already was AND
// that the new decisionReasonCode maps 1:1 onto the same branch. No policy
// file is modified by this suite or by strategy.js itself.

test('branch: blockForUnknowns -> NO-GO, decisionReasonCode BLOCK_ANY_UNKNOWN', () => {
  const policy = { id: 'test-policy', name: 'Test', version: '1.0.0', blockOnAnyUnknown: true, blockOnHighRiskWithUnknown: true, recommendationWhenHighRisk: 'GO WITH RISKS', recommendationWhenNoHighRisk: 'GO WITH RISKS' };
  const strategy = buildStrategy(noHighRisk, ['algum desconhecido'], policy);
  assert.equal(strategy.recommendation, 'NO-GO');
  assert.equal(strategy.decisionReasonCode, 'BLOCK_ANY_UNKNOWN');
});

test('branch: blockForHighRisk -> NO-GO, decisionReasonCode BLOCK_HIGH_RISK_WITH_UNKNOWN (default shipped policy)', async () => {
  const policy = await loadReleasePolicy(path.join(root, 'aima', 'policies', 'evidence-aware-release.json'));
  const strategy = buildStrategy(highRisk, ['algum desconhecido'], policy);
  assert.equal(strategy.recommendation, 'NO-GO');
  assert.equal(strategy.decisionReasonCode, 'BLOCK_HIGH_RISK_WITH_UNKNOWN');
});

test('branch: hasHighRisk without blocking unknowns -> policy.recommendationWhenHighRisk, decisionReasonCode POLICY_HIGH_RISK (default shipped policy)', async () => {
  const policy = await loadReleasePolicy(path.join(root, 'aima', 'policies', 'evidence-aware-release.json'));
  const strategy = buildStrategy(highRisk, [], policy);
  assert.equal(strategy.recommendation, policy.recommendationWhenHighRisk);
  assert.equal(strategy.recommendation, 'GO WITH RISKS');
  assert.equal(strategy.decisionReasonCode, 'POLICY_HIGH_RISK');
});

test('branch: no high risk -> policy.recommendationWhenNoHighRisk, decisionReasonCode POLICY_NO_HIGH_RISK (default shipped policy)', async () => {
  const policy = await loadReleasePolicy(path.join(root, 'aima', 'policies', 'evidence-aware-release.json'));
  const strategy = buildStrategy(noHighRisk, [], policy);
  assert.equal(strategy.recommendation, policy.recommendationWhenNoHighRisk);
  assert.equal(strategy.recommendation, 'GO WITH RISKS');
  assert.equal(strategy.decisionReasonCode, 'POLICY_NO_HIGH_RISK');
});

test('regression: buildStrategy must not depend on risks[0] — a HIGH risk in a later position must still trigger the high-risk branch', () => {
  const policy = { id: 'test-policy', name: 'Test', version: '1.0.0', blockOnAnyUnknown: false, blockOnHighRiskWithUnknown: true, recommendationWhenHighRisk: 'GO WITH RISKS', recommendationWhenNoHighRisk: 'GO' };
  const risks = [
    { id: 'R-LOW', score: 10, level: 'LOW', recommendedTests: ['t-low'] },
    { id: 'R-HIGH', score: 90, level: 'HIGH', recommendedTests: ['t-high'] }
  ];
  const strategy = buildStrategy(risks, [], policy);
  assert.equal(strategy.decisionReasonCode, 'POLICY_HIGH_RISK');
  assert.equal(strategy.recommendation, policy.recommendationWhenHighRisk);
});

test('the default shipped policy is untouched by this PR: GO WITH RISKS/NO-GO reachable, GO not produced automatically', async () => {
  const policy = await loadReleasePolicy(path.join(root, 'aima', 'policies', 'evidence-aware-release.json'));
  assert.equal(policy.blockOnAnyUnknown, false);
  assert.equal(policy.blockOnHighRiskWithUnknown, true);
  assert.equal(policy.recommendationWhenHighRisk, 'GO WITH RISKS');
  assert.equal(policy.recommendationWhenNoHighRisk, 'GO WITH RISKS');
});
