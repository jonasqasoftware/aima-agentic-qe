const WEIGHT = { low: 1, medium: 3, high: 5 };

const SIGNALS = [
  { pattern: /payment|authorization|transaction/i, category: 'financial', label: 'Autorização e integridade financeira', tests: ['Testes de contrato da API de pagamento', 'Cenários negativos de autorização', 'Testes de idempotência'] },
  { pattern: /auth|session|token|permission/i, category: 'security', label: 'Autenticação e autorização', tests: ['Testes de autorização', 'Cenários de token inválido ou expirado'] },
  { pattern: /migration|schema|database|data/i, category: 'data', label: 'Integridade e migração de dados', tests: ['Teste de migração reversível', 'Validação de integridade e dados de borda'] },
  { pattern: /api|route|controller/i, category: 'integration', label: 'Contrato e integração de API', tests: ['Teste de contrato', 'Testes de erro e compatibilidade'] },
  { pattern: /ui|component|page|form/i, category: 'accessibility', label: 'Fluxo de interface e acessibilidade', tests: ['Teste de fluxo crítico', 'Verificação de acessibilidade por teclado e semântica'] }
];

export function assessRisks(change) {
  const signals = SIGNALS.filter((signal) => change.changedFiles.some((file) => signal.pattern.test(file)));
  const applicable = signals.length ? signals : [{ category: 'change-surface', label: 'Superfície de mudança sem domínio classificado', tests: ['Revisão de regressão direcionada'] }];
  const base = WEIGHT[change.businessImpact] * WEIGHT[change.technicalComplexity];
  const risks = applicable.map((signal) => {
    const score = Math.min(100, base * 4 + (change.changedFiles.length * 2));
    return {
      id: `R-${signal.category.toUpperCase()}`,
      category: signal.category,
      score,
      level: score >= 70 ? 'HIGH' : score >= 35 ? 'MEDIUM' : 'LOW',
      statement: signal.label,
      facts: change.changedFiles.filter((file) => signal.pattern?.test(file)),
      inference: `Impacto ${change.businessImpact} e complexidade ${change.technicalComplexity} elevam a prioridade de verificação.`,
      recommendedTests: signal.tests
    };
  });
  return risks.sort((left, right) => right.score - left.score || left.id.localeCompare(right.id));
}

export function qualityConfidence(risks, unknowns) {
  const riskPenalty = Math.min(55, Math.round(risks.reduce((total, risk) => total + risk.score, 0) / Math.max(risks.length, 1) * 0.55));
  const unknownPenalty = Math.min(30, unknowns.length * 10);
  const score = Math.max(0, 100 - riskPenalty - unknownPenalty);
  return {
    score,
    factors: [
      `Penalidade de risco: ${riskPenalty} ponto(s), calculada a partir de sinais declarados.`,
      `Penalidade de incerteza: ${unknownPenalty} ponto(s), baseada em ${unknowns.length} desconhecido(s) declarado(s).`,
      'O score é experimental; não representa aprovação automática de release.'
    ]
  };
}
