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
  for (const check of change.ciChecks ?? []) {
    if (check.outcome !== 'failed') continue;
    risks.push({
      id: `R-CI-${check.name.replace(/[^a-z0-9]+/gi, '-').replace(/(^-|-$)/g, '').toUpperCase() || 'FAILED'}`,
      category: 'ci',
      score: 90,
      level: 'HIGH',
      statement: `Check de CI com falha: ${check.name}`,
      facts: [],
      inference: 'Um check concluído com falha é evidência remota autenticada de que a mudança exige investigação antes do release.',
      recommendedTests: [`Investigar e corrigir o check de CI: ${check.name}`]
    });
  }
  for (const evidence of change.executionEvidence ?? []) {
    if (evidence.status !== 'failed') continue;
    risks.push({
      id: `R-EXECUTION-${evidence.id.replace(/[^a-z0-9]+/gi, '-').replace(/(^-|-$)/g, '').toUpperCase() || 'FAILED'}`,
      category: 'execution',
      score: 90,
      level: 'HIGH',
      statement: `Comando de evidência com falha: ${evidence.id}`,
      facts: [],
      inference: 'Um comando executado localmente retornou falha; investigue o resultado antes de liberar a mudança.',
      recommendedTests: [`Investigar e corrigir a execução de evidência: ${evidence.id}`]
    });
  }
  for (const result of change.testResults ?? []) {
    if (result.status !== 'failed') continue;
    risks.push({
      id: `R-TEST-RESULTS-${result.id.replace(/[^a-z0-9]+/gi, '-').replace(/(^-|-$)/g, '').toUpperCase()}`,
      category: 'test-results',
      score: 90,
      level: 'HIGH',
      statement: `Resultado de teste com falhas: ${result.failed}/${result.total}`,
      facts: [],
      inference: `O parser JUnit encontrou falhas em ${result.failedCases.map((item) => `${item.suite} › ${item.name}`).join('; ')}.`,
      recommendedTests: ['Investigar as falhas registradas no resultado JUnit e executar novamente a suíte afetada']
    });
  }
  if (change.coverage?.minimum != null && change.coverage.lineCoverage != null && change.coverage.lineCoverage < change.coverage.minimum) {
    const deficit = change.coverage.minimum - change.coverage.lineCoverage;
    risks.push({
      id: 'R-COVERAGE-THRESHOLD',
      category: 'coverage',
      score: deficit >= 20 ? 80 : 50,
      level: deficit >= 20 ? 'HIGH' : 'MEDIUM',
      statement: `Cobertura de linhas abaixo do limite: ${change.coverage.lineCoverage}% < ${change.coverage.minimum}%.`,
      facts: [],
      inference: 'O arquivo LCOV fornecido ficou abaixo do limite declarado pelo operador; cobertura não substitui revisão dos cenários de risco.',
      recommendedTests: ['Adicionar testes para os caminhos não cobertos e executar novamente a coleta de cobertura']
    });
  }
  if (change.coverage?.minimum != null && change.coverage.correlation) {
    const missing = change.coverage.correlation.uncoveredChangedFiles;
    const below = change.coverage.correlation.coveredChangedFiles.filter((item) => item.lineCoverage != null && item.lineCoverage < change.coverage.minimum);
    if (missing.length || below.length) risks.push({
      id: 'R-CHANGED-FILE-COVERAGE',
      category: 'coverage-change-correlation',
      score: missing.length ? 80 : 60,
      level: missing.length ? 'HIGH' : 'MEDIUM',
      statement: `Cobertura insuficiente na superfície alterada: ${missing.length} arquivo(s) sem registro e ${below.length} abaixo do limite.`,
      facts: [...missing, ...below.map((item) => item.changedFile)],
      inference: 'A correlação usa caminhos de arquivos e dados LCOV fornecidos; não prova que todos os caminhos de execução relevantes foram testados.',
      recommendedTests: ['Adicionar cobertura para os arquivos alterados sem registro ou abaixo do limite e coletar LCOV novamente']
    });
  }
  return risks.sort((left, right) => right.score - left.score || left.id.localeCompare(right.id));
}

export const CONFIDENCE_MODEL = { id: 'highest-risk-residual-confidence', version: '1.0.0' };
const RISK_MULTIPLIER = 0.55;
const RISK_PENALTY_CAP = 55;
const UNKNOWN_PENALTY_PER_ITEM = 10;
const UNKNOWN_PENALTY_CAP = 30;

/**
 * Residual-confidence model: the penalty is driven by the single most severe
 * declared risk, not by an average of every risk. Averaging let additional,
 * weaker risks (including genuine negative evidence like a coverage or CI
 * failure) dilute a severe risk's score and raise the resulting confidence —
 * confirmed as a real, reproducible defect. Reducing to `max()` makes the
 * result independent of how many other risks are present, at the documented
 * trade-off that risks below the highest do not further lower the score.
 */
export function qualityConfidence(risks, unknowns) {
  const highestRiskScore = risks.reduce((max, risk) => Math.max(max, risk.score), 0);
  const riskPenalty = Math.min(RISK_PENALTY_CAP, Math.round(highestRiskScore * RISK_MULTIPLIER));
  const unknownCount = unknowns.length;
  const unknownPenalty = Math.min(UNKNOWN_PENALTY_CAP, unknownCount * UNKNOWN_PENALTY_PER_ITEM);
  const totalPenalty = riskPenalty + unknownPenalty;
  const score = Math.max(0, 100 - totalPenalty);
  return {
    score,
    factors: [
      `Penalidade de risco: ${riskPenalty} ponto(s), calculada a partir do maior risco declarado (${highestRiskScore}/100).`,
      `Penalidade de incerteza: ${unknownPenalty} ponto(s), baseada em ${unknownCount} desconhecido(s) declarado(s).`,
      'O score é experimental; não representa aprovação automática de release.'
    ],
    model: { ...CONFIDENCE_MODEL },
    calculation: {
      highestRiskScore,
      riskMultiplier: RISK_MULTIPLIER,
      riskPenalty,
      unknownCount,
      unknownPenaltyPerItem: UNKNOWN_PENALTY_PER_ITEM,
      unknownPenalty,
      totalPenalty,
      caps: { riskPenalty: RISK_PENALTY_CAP, unknownPenalty: UNKNOWN_PENALTY_CAP },
      rounding: 'Math.round'
    }
  };
}
