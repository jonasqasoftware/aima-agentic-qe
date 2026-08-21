import { assessRisks, qualityConfidence } from './risk-engine.js';
import { selectFramework } from './framework-registry.js';
import { buildStrategy } from './strategy.js';
import { createReport } from './report.js';

/** Runs a deterministic golden evaluation against explicit expectations. */
export function evaluateChange(change, expected, frameworks, policy) {
  const selection = selectFramework(frameworks, change);
  const risks = assessRisks(change);
  const confidence = qualityConfidence(risks, change.knownUnknowns);
  const strategy = buildStrategy(risks, change.knownUnknowns, policy);
  const report = createReport(change, selection, risks, confidence, strategy);
  const failures = [];
  if (selection.framework.id !== expected.framework) {
    failures.push(`Framework esperado ${expected.framework}, recebido ${selection.framework.id}.`);
  }
  for (const category of expected.mustIncludeRiskCategories ?? []) {
    if (!risks.some((risk) => risk.category === category)) failures.push(`Categoria de risco ausente: ${category}.`);
  }
  if (strategy.recommendation !== expected.expectedRecommendation) {
    failures.push(`Recomendação esperada ${expected.expectedRecommendation}, recebida ${strategy.recommendation}.`);
  }
  if (expected.evidenceBoundaryRequired && !report.evidenceBoundary) failures.push('Limite de evidência ausente no relatório.');
  if (expected.expectedConfidenceModel) {
    if (confidence.model?.id !== expected.expectedConfidenceModel.id) {
      failures.push(`Modelo de confiança esperado ${expected.expectedConfidenceModel.id}, recebido ${confidence.model?.id ?? 'ausente'}.`);
    }
    if (confidence.model?.version !== expected.expectedConfidenceModel.version) {
      failures.push(`Versão do modelo de confiança esperada ${expected.expectedConfidenceModel.version}, recebida ${confidence.model?.version ?? 'ausente'}.`);
    }
  }
  return { passed: failures.length === 0, failures, selection, risks, confidence, strategy, report };
}
