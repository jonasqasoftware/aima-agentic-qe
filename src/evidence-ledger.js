function sourceLabel(change) {
  if (change.source === 'local-git-name-only') return 'git-diff-name-only';
  if (change.source === 'local-git-diff-stats') return 'git-diff-numstat';
  if (change.source === 'github-pr-metadata') return 'github-pr-api-metadata';
  return 'declared-input';
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
  if (change.diffStats) facts.push({
    id: 'E-005',
    kind: 'FACT',
    source,
    statement: `Diff local: ${change.diffStats.additions} linha(s) adicionada(s), ${change.diffStats.deletions} removida(s) em ${change.diffStats.files} arquivo(s); ${change.diffStats.binaryFiles} binário(s).`
  });
  const unknowns = (change.knownUnknowns ?? []).map((statement, index) => ({
    id: `U-${String(index + 1).padStart(3, '0')}`,
    kind: 'UNKNOWN',
    source,
    statement
  }));
  const declaredEvidence = (change.declaredEvidence ?? []).map((item, index) => ({
    id: `D-${String(index + 1).padStart(3, '0')}`,
    kind: 'DECLARED_EVIDENCE',
    source: item.source || source,
    statement: `[${item.type}] ${item.summary}`,
    reference: item.id,
    verification: 'declared-not-verified'
  }));
  const artifactEvidence = (change.artifactEvidence ?? []).map((item, index) => ({
    id: `A-${String(index + 1).padStart(3, '0')}`,
    kind: 'ARTIFACT_EVIDENCE',
    source: 'local-evidence-artifact',
    statement: `[${item.type}/${item.status}] ${item.summary}`,
    reference: item.id,
    sha256: item.sha256,
    verification: 'sha256-verified-local-file'
  }));
  const remoteEvidence = (change.ciChecks ?? []).map((check, index) => ({
    id: `C-${String(index + 1).padStart(3, '0')}`,
    kind: 'REMOTE_EVIDENCE',
    source: 'github-check-runs-api',
    statement: `[${check.outcome}] ${check.name} — status ${check.status}${check.conclusion ? `, conclusão ${check.conclusion}` : ''}.`,
    reference: check.url || undefined,
    verification: 'authenticated-github-api-read'
  }));
  const executedEvidence = (change.executionEvidence ?? []).map((item, index) => ({
    id: `X-${String(index + 1).padStart(3, '0')}`,
    kind: 'EXECUTED_EVIDENCE',
    source: 'local-command-execution',
    statement: `[${item.status}] ${item.summary} (exit code: ${item.exitCode ?? 'não disponível'}).`,
    reference: `${item.command} ${item.args.join(' ')}`.trim(),
    sha256: item.transcriptSha256,
    verification: 'local-process-exit-code-and-transcript-hash'
  }));
  const inferences = risks.map((risk, index) => ({
    id: `I-${String(index + 1).padStart(3, '0')}`,
    kind: 'INFERENCE',
    source: 'deterministic-risk-rule',
    statement: `${risk.id}: ${risk.statement}.`,
    relatedEvidence: ['E-002', 'E-003', 'E-004']
  }));
  return [...facts, ...declaredEvidence, ...artifactEvidence, ...remoteEvidence, ...executedEvidence, ...unknowns, ...inferences];
}
