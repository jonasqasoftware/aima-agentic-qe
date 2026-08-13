function sourceLabel(change) {
  return change.source === 'local-git-name-only' ? 'git-diff-name-only' : 'declared-input';
}

/** Builds an inspectable ledger; it never upgrades unknowns into evidence. */
export function buildEvidenceLedger(change, risks) {
  const source = sourceLabel(change);
  const facts = [
    { id: 'E-001', kind: 'FACT', source, statement: `Origem do contexto: ${source}.` },
    { id: 'E-002', kind: 'FACT', source, statement: `Impacto de negócio informado como ${change.businessImpact}.` },
    { id: 'E-003', kind: 'FACT', source, statement: `Complexidade técnica informada como ${change.technicalComplexity}.` },
    { id: 'E-004', kind: 'FACT', source, statement: `${change.changedFiles.length} arquivo(s) incluído(s) na superfície de mudança.` }
  ];
  const unknowns = change.knownUnknowns.map((statement, index) => ({
    id: `U-${String(index + 1).padStart(3, '0')}`,
    kind: 'UNKNOWN',
    source,
    statement
  }));
  const inferences = risks.map((risk, index) => ({
    id: `I-${String(index + 1).padStart(3, '0')}`,
    kind: 'INFERENCE',
    source: 'deterministic-risk-rule',
    statement: `${risk.id}: ${risk.statement}.`,
    relatedEvidence: ['E-002', 'E-003', 'E-004']
  }));
  return [...facts, ...unknowns, ...inferences];
}
