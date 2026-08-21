export function buildStrategy(risks, unknowns, policy) {
  const tests = [...new Set(risks.flatMap((risk) => risk.recommendedTests))];
  const hasHighRisk = risks.some((risk) => risk.level === 'HIGH');
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
  // Stable, machine-readable label for which of the four branches above
  // produced the decision — additive alongside the existing human rationale,
  // maps 1:1 to the same branches and never changes what they decide.
  const decisionReasonCode = blockForUnknowns
    ? 'BLOCK_ANY_UNKNOWN'
    : blockForHighRisk
      ? 'BLOCK_HIGH_RISK_WITH_UNKNOWN'
      : hasHighRisk
        ? 'POLICY_HIGH_RISK'
        : 'POLICY_NO_HIGH_RISK';
  return {
    recommendedTests: tests,
    missingEvidence: unknowns,
    recommendation: decision,
    rationale,
    decisionReasonCode,
    policy: { id: policy.id, name: policy.name, version: policy.version }
  };
}
