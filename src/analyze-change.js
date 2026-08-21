import { normalizeChangeInput } from './change-input-core.js';
import { selectFramework } from './framework-selection.js';
import { assessRisks, qualityConfidence } from './risk-engine.js';
import { buildStrategy } from './strategy.js';
import { createReport } from './report.js';

export function analyzeChange(input, { frameworks, releasePolicy }) {
  const change = normalizeChangeInput(input);
  const risks = assessRisks(change);
  const confidence = qualityConfidence(risks, change.knownUnknowns);
  return createReport(change, selectFramework(frameworks, change), risks, confidence, buildStrategy(risks, change.knownUnknowns, releasePolicy));
}
