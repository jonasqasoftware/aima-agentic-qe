export function buildStrategy(risks, unknowns) {
  const tests = [...new Set(risks.flatMap((risk) => risk.recommendedTests))];
  const highest = risks[0];
  const decision = highest?.level === 'HIGH' && unknowns.length > 0 ? 'NO-GO' : highest?.level === 'HIGH' ? 'GO WITH RISKS' : 'GO WITH RISKS';
  return {
    recommendedTests: tests,
    missingEvidence: unknowns,
    recommendation: decision,
    rationale: decision === 'NO-GO'
      ? 'Existem riscos altos e evidências declaradas como ausentes; a mudança precisa de validação adicional.'
      : 'A recomendação exige revisão humana dos riscos e execução das verificações priorizadas.'
  };
}
