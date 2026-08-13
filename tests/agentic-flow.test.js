import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assessRisks,
  buildStrategy,
  createReport,
  formatMarkdown,
  loadChangeInput,
  loadFrameworkRegistry,
  qualityConfidence,
  selectFramework
} from '../src/index.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('payment fixture produces an evidence-bounded NO-GO recommendation', async () => {
  const change = await loadChangeInput(path.join(root, 'examples', 'payment-refactor.change.json'));
  const frameworks = await loadFrameworkRegistry(path.join(root, 'aima', 'frameworks'));
  const selection = selectFramework(frameworks, change);
  const risks = assessRisks(change);
  const confidence = qualityConfidence(risks, change.knownUnknowns);
  const strategy = buildStrategy(risks, change.knownUnknowns);
  const report = createReport(change, selection, risks, confidence, strategy);

  assert.equal(selection.framework.id, 'risk-based-testing');
  assert.equal(strategy.recommendation, 'NO-GO');
  assert.ok(risks.some((risk) => risk.category === 'financial'));
  assert.ok(risks.some((risk) => risk.category === 'integration'));
  assert.ok(confidence.score < 100);
  assert.match(formatMarkdown(report), /Não afirma leitura de PR remoto/);
});

test('unknown change surface remains explicit instead of invented', () => {
  const risks = assessRisks({
    changedFiles: ['lib/normalizer.js'],
    businessImpact: 'low',
    technicalComplexity: 'low'
  });
  assert.equal(risks[0].category, 'change-surface');
  assert.match(risks[0].statement, /sem domínio classificado/);
});
