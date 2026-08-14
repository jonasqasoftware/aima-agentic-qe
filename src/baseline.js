import { readFile } from 'node:fs/promises';

export async function loadBaselineReport(file) {
  let baseline;
  try {
    baseline = JSON.parse(await readFile(file, 'utf8'));
  } catch (error) {
    throw new Error(`Unable to load baseline report: ${error.message}`);
  }
  if (!baseline?.context?.changeId || !Array.isArray(baseline.risks) || typeof baseline?.qualityConfidence?.score !== 'number') {
    throw new Error('Baseline report requires context.changeId, risks, and qualityConfidence.score.');
  }
  return baseline;
}

/** Compares declared analysis outputs; it does not infer regression from code. */
export function compareWithBaseline(current, baseline) {
  const previousById = new Map(baseline.risks.map((risk) => [risk.id, risk]));
  const currentById = new Map(current.risks.map((risk) => [risk.id, risk]));
  const newRisks = current.risks
    .filter((risk) => !previousById.has(risk.id))
    .map((risk) => ({ id: risk.id, score: risk.score, level: risk.level }));
  const resolvedRisks = baseline.risks
    .filter((risk) => !currentById.has(risk.id))
    .map((risk) => ({ id: risk.id, score: risk.score, level: risk.level }));
  const changedRisks = current.risks
    .filter((risk) => previousById.has(risk.id) && previousById.get(risk.id).score !== risk.score)
    .map((risk) => ({ id: risk.id, previousScore: previousById.get(risk.id).score, currentScore: risk.score }));
  return {
    baselineChangeId: baseline.context.changeId,
    baselineRecommendation: baseline.strategy?.recommendation ?? 'UNKNOWN',
    currentRecommendation: current.strategy.recommendation,
    qualityConfidenceDelta: current.qualityConfidence.score - baseline.qualityConfidence.score,
    newRisks,
    resolvedRisks,
    changedRisks,
    boundary: 'Comparação entre relatórios declarados. Não comprova regressão de código nem execução de testes.'
  };
}
