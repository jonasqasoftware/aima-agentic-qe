export function buildStrategy(risks, unknowns, policy) {
  const tests = [...new Set(risks.flatMap((risk) => risk.recommendedTests))];
  const highest = risks[0];
  const hasHighRisk = highest?.level === 'HIGH';
  const hasUnknowns = unknowns.length > 0;
  const blockForUnknowns = hasUnknowns && policy.blockOnAnyUnknown;
  const blockForHighRisk = hasHighRisk && hasUnknowns && policy.blockOnHighRiskWithUnknown;
  const decision = blockForUnknowns || blockForHighRisk
    ? 'NO-GO'
    : hasHighRisk
      ? policy.recommendationWhenHighRisk
      : policy.recommendationWhenNoHighRisk;
  const rationale = blockForUnknowns
    ? 'A política de release bloqueia mudanças com evidências declaradas como ausentes.'
    : blockForHighRisk
      ? 'A política de release bloqueia riscos altos quando há evidências declaradas como ausentes.'
      : 'A recomendação exige revisão humana dos riscos e execução das verificações priorizadas.';
  return {
    recommendedTests: tests,
    missingEvidence: unknowns,
    recommendation: decision,
    rationale,
    policy: { id: policy.id, name: policy.name, version: policy.version }
  };
}
