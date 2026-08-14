import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { buildEvidenceLedger } from './evidence-ledger.js';
import { createReportManifest } from './report-manifest.js';

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function createReport(change, selection, risks, confidence, strategy) {
  const evidenceBoundary = change.source === 'local-git-diff-stats'
    ? 'Relatório baseado nos nomes de arquivos e estatísticas de linhas de um diff Git local, além de regras determinísticas. Não afirma leitura do conteúdo do diff, de PR remoto, execução de testes ou aprovação de release.'
    : change.source === 'local-git-name-only'
    ? 'Relatório baseado nos nomes de arquivos de um diff Git local e em regras determinísticas. Não afirma leitura do conteúdo do diff, de PR remoto, execução de testes ou aprovação de release.'
    : change.source === 'github-pr-metadata'
    ? 'Relatório baseado em metadados autenticados, nomes de arquivos e checks de CI disponíveis de um PR do GitHub, além de regras determinísticas. Não afirma leitura do conteúdo do diff, cobertura dos checks, aprovações ou aprovação de release.'
    : 'Relatório baseado somente na entrada declarada e em regras determinísticas. Não afirma leitura de PR remoto, execução de testes ou aprovação de release.';
  return {
    reportVersion: '0.1.0',
    evidenceBoundary,
    context: {
      changeId: change.id,
      summary: change.summary,
      changedFiles: change.changedFiles,
      knownUnknowns: change.knownUnknowns,
      source: change.source || 'declared-input'
    },
    framework: {
      id: selection.framework.id,
      name: selection.framework.name,
      selectionEvidence: selection.evidence
    },
    evidenceLedger: buildEvidenceLedger(change, risks),
    risks,
    qualityConfidence: confidence,
    strategy,
    agentTrace: [
      { agent: 'context-agent', status: 'completed', output: 'Entrada declarada validada.' },
      { agent: 'risk-agent', status: 'completed', output: `${risks.length} risco(s) identificado(s).` },
      { agent: 'test-strategy-agent', status: 'completed', output: `${strategy.recommendedTests.length} verificação(ões) recomendada(s).` },
      { agent: 'release-agent', status: 'completed', output: `Decisão recomendada: ${strategy.recommendation}.` }
    ]
  };
}

export function formatMarkdown(report) {
  const risks = report.risks.map((risk) => `| ${risk.id} | ${risk.level} | ${risk.score}/100 | ${risk.statement} |`).join('\n');
  const tests = report.strategy.recommendedTests.map((test, index) => `${index + 1}. ${test}`).join('\n');
  const unknowns = report.strategy.missingEvidence.length
    ? report.strategy.missingEvidence.map((item) => `- ${item}`).join('\n')
    : '- Nenhuma incerteza declarada.';
  const evidence = report.evidenceLedger
    .map((item) => `| ${item.id} | ${item.kind} | ${item.source} | ${item.statement} |`)
    .join('\n');
  const comparison = report.baselineComparison
    ? `\n## Comparação com baseline\n\n> ${report.baselineComparison.boundary}\n\n- **Baseline:** \`${report.baselineComparison.baselineChangeId}\` (${report.baselineComparison.baselineRecommendation})\n- **Variação de Quality Confidence:** ${report.baselineComparison.qualityConfidenceDelta >= 0 ? '+' : ''}${report.baselineComparison.qualityConfidenceDelta}\n- **Riscos novos:** ${report.baselineComparison.newRisks.map((risk) => risk.id).join(', ') || 'nenhum'}\n- **Riscos resolvidos:** ${report.baselineComparison.resolvedRisks.map((risk) => risk.id).join(', ') || 'nenhum'}\n- **Riscos com score alterado:** ${report.baselineComparison.changedRisks.map((risk) => `${risk.id} (${risk.previousScore}→${risk.currentScore})`).join(', ') || 'nenhum'}\n`
    : '';
  return `# AIMA Agentic QE report\n\n> ${report.evidenceBoundary}\n\n## Contexto\n\n- **Mudança:** \`${report.context.changeId}\`\n- **Resumo:** ${report.context.summary}\n- **Arquivos declarados:** ${report.context.changedFiles.map((file) => `\`${file}\``).join(', ')}\n\n## Framework AIMA selecionado\n\n- **${report.framework.name}** (\`${report.framework.id}\`)\n${report.framework.selectionEvidence.map((item) => `- ${item}`).join('\n')}\n\n## Política de release\n\n- **${report.strategy.policy.name}** (\`${report.strategy.policy.id}\` · v${report.strategy.policy.version})\n\n## Ledger de evidências\n\n| ID | Tipo | Origem | Declaração |\n| --- | --- | --- | --- |\n${evidence}\n\n## Riscos\n\n| ID | Nível | Score | Hipótese de risco |\n| --- | --- | ---: | --- |\n${risks}\n\n## Estratégia recomendada\n\n${tests}\n\n## Evidências ausentes / incertezas\n\n${unknowns}\n\n## Quality Confidence experimental\n\n**${report.qualityConfidence.score}/100**\n\n${report.qualityConfidence.factors.map((item) => `- ${item}`).join('\n')}\n${comparison}\n## Recomendação de release\n\n**${report.strategy.recommendation}**\n\n${report.strategy.rationale}\n\n## Rastreabilidade de agentes\n\n${report.agentTrace.map((entry) => `- **${entry.agent}:** ${entry.status} — ${entry.output}`).join('\n')}\n`;
}

export function formatHtml(report) {
  const recommendationClass = report.strategy.recommendation.toLowerCase().replaceAll(' ', '-');
  const riskCards = report.risks.map((risk) => `
    <article class="risk ${risk.level.toLowerCase()}">
      <p class="eyebrow">${escapeHtml(risk.id)} · ${escapeHtml(risk.category)}</p>
      <h3>${escapeHtml(risk.statement)}</h3>
      <p class="score">${escapeHtml(risk.score)}<span>/100</span></p>
      <p>${escapeHtml(risk.inference)}</p>
    </article>`).join('');
  const evidenceRows = report.evidenceLedger.map((item) => `
    <tr><td>${escapeHtml(item.id)}</td><td><span class="kind ${escapeHtml(item.kind)}">${escapeHtml(item.kind)}</span></td><td>${escapeHtml(item.source)}</td><td>${escapeHtml(item.statement)}</td></tr>`).join('');
  const tests = report.strategy.recommendedTests.map((test) => `<li>${escapeHtml(test)}</li>`).join('');
  const unknowns = report.strategy.missingEvidence.length
    ? report.strategy.missingEvidence.map((item) => `<li>${escapeHtml(item)}</li>`).join('')
    : '<li>Nenhuma incerteza declarada.</li>';
  const files = report.context.changedFiles.map((file) => `<code>${escapeHtml(file)}</code>`).join('');
  const comparison = report.baselineComparison
    ? `<section class="two-columns"><article class="panel"><p class="eyebrow">Comparação com baseline</p><h3>${escapeHtml(report.baselineComparison.baselineChangeId)}</h3><p>Quality Confidence: ${report.baselineComparison.qualityConfidenceDelta >= 0 ? '+' : ''}${escapeHtml(report.baselineComparison.qualityConfidenceDelta)}</p></article><article class="panel"><p class="eyebrow">Mudanças de risco</p><p>Novos: ${escapeHtml(report.baselineComparison.newRisks.map((risk) => risk.id).join(', ') || 'nenhum')}</p><p>Resolvidos: ${escapeHtml(report.baselineComparison.resolvedRisks.map((risk) => risk.id).join(', ') || 'nenhum')}</p></article></section>`
    : '';
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>AIMA Quality Report · ${escapeHtml(report.context.changeId)}</title>
  <style>
    :root { color-scheme: dark; --ink:#e7edf7; --muted:#9babc1; --panel:#101826; --line:#26364f; --bg:#09111f; --blue:#78b7ff; --green:#5ee6b2; --yellow:#ffd166; --red:#ff7a90; }
    * { box-sizing:border-box; } body { margin:0; background:radial-gradient(circle at top right,#183257,transparent 36%),var(--bg); color:var(--ink); font:16px/1.5 Inter,ui-sans-serif,system-ui,sans-serif; }
    main { width:min(1120px,calc(100% - 32px)); margin:0 auto; padding:52px 0 72px; } .eyebrow { margin:0 0 8px; color:var(--blue); font:600 12px/1.2 ui-monospace,SFMono-Regular,monospace; letter-spacing:.08em; text-transform:uppercase; }
    h1 { font-size:clamp(2rem,6vw,4.75rem); line-height:.98; margin:0; letter-spacing:-.06em; } h2 { margin:42px 0 16px; font-size:1.25rem; } h3 { margin:0; font-size:1.05rem; } p { color:var(--muted); } .boundary { border-left:3px solid var(--yellow); padding:12px 16px; background:#171a1d; border-radius:0 8px 8px 0; }
    .summary { display:grid; grid-template-columns:1.45fr .8fr; gap:16px; margin-top:28px; } .panel,.risk { border:1px solid var(--line); background:color-mix(in srgb,var(--panel) 92%,transparent); border-radius:16px; padding:22px; }
    .decision { display:flex; flex-direction:column; justify-content:space-between; } .decision strong { font-size:1.75rem; letter-spacing:-.04em; } .decision .no-go { color:var(--red); } .decision .go-with-risks { color:var(--yellow); } .decision .go { color:var(--green); }
    .confidence { font-size:4rem; line-height:1; color:var(--blue); letter-spacing:-.08em; margin:14px 0; } .confidence span,.score span { font-size:.42em; color:var(--muted); letter-spacing:0; }
    .files { display:flex; flex-wrap:wrap; gap:8px; } code { color:#c7ddff; background:#17243a; padding:3px 7px; border-radius:5px; overflow-wrap:anywhere; } .risk-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(230px,1fr)); gap:14px; }
    .risk.high { border-top:3px solid var(--red); } .risk.medium { border-top:3px solid var(--yellow); } .risk.low { border-top:3px solid var(--green); } .score { margin:16px 0 6px; color:var(--ink); font-size:2rem; font-weight:700; }
    .two-columns { display:grid; grid-template-columns:1fr 1fr; gap:16px; } ul { padding-left:20px; color:var(--muted); } li+li { margin-top:8px; } .table-wrap { overflow:auto; border:1px solid var(--line); border-radius:12px; } table { width:100%; border-collapse:collapse; min-width:700px; } th,td { padding:12px 14px; text-align:left; border-bottom:1px solid var(--line); vertical-align:top; } th { color:var(--muted); font-size:.75rem; text-transform:uppercase; letter-spacing:.08em; } .kind { font:600 11px ui-monospace,SFMono-Regular,monospace; padding:4px 6px; border-radius:99px; } .FACT { color:var(--blue); background:#14345d; } .DECLARED_EVIDENCE { color:#d5b7ff; background:#35245a; } .ARTIFACT_EVIDENCE { color:#77e4dd; background:#114349; } .INFERENCE { color:var(--green); background:#123d32; } .UNKNOWN { color:var(--yellow); background:#493a10; }
    .REMOTE_EVIDENCE { color:#b8c7ff; background:#242c64; } .EXECUTED_EVIDENCE { color:#ffb7ea; background:#54204b; } footer { margin-top:46px; color:var(--muted); font-size:.875rem; } @media (max-width:700px) { main { padding-top:32px; } .summary,.two-columns { grid-template-columns:1fr; } }
  </style>
</head>
<body><main>
  <p class="eyebrow">AIMA Agentic QE · relatório auditável</p>
  <h1>${escapeHtml(report.context.changeId)}</h1>
  <p>${escapeHtml(report.context.summary)}</p>
  <p class="boundary">${escapeHtml(report.evidenceBoundary)}</p>
  <section class="summary">
    <article class="panel decision"><div><p class="eyebrow">Recomendação de release</p><strong class="${recommendationClass}">${escapeHtml(report.strategy.recommendation)}</strong><p>${escapeHtml(report.strategy.rationale)}</p></div><p class="eyebrow">Framework · ${escapeHtml(report.framework.name)}</p><p class="eyebrow">Política · ${escapeHtml(report.strategy.policy.name)} · v${escapeHtml(report.strategy.policy.version)}</p></article>
    <article class="panel"><p class="eyebrow">Quality Confidence experimental</p><p class="confidence">${escapeHtml(report.qualityConfidence.score)}<span>/100</span></p>${report.qualityConfidence.factors.map((item) => `<p>${escapeHtml(item)}</p>`).join('')}</article>
  </section>
  <h2>Superfície de mudança</h2><div class="files">${files}</div>
  <h2>Riscos priorizados</h2><section class="risk-grid">${riskCards}</section>
  <section class="two-columns"><article class="panel"><h2>Verificações recomendadas</h2><ol>${tests}</ol></article><article class="panel"><h2>Evidências ausentes</h2><ul>${unknowns}</ul></article></section>
  ${comparison}
  <h2>Ledger de evidências</h2><div class="table-wrap"><table><thead><tr><th>ID</th><th>Tipo</th><th>Origem</th><th>Declaração</th></tr></thead><tbody>${evidenceRows}</tbody></table></div>
  <footer>Gerado pelo AIMA Agentic QE · relatório baseado em evidências declaradas e regras determinísticas.</footer>
</main></body></html>`;
}

function sarifLevel(level) {
  return level === 'HIGH' ? 'error' : level === 'MEDIUM' ? 'warning' : 'note';
}

/**
 * Emits a SARIF 2.1.0 document for consumers that understand static-analysis
 * findings. Locations identify the declared change surface, not a proven line.
 */
export function formatSarif(report) {
  const rules = report.risks.map((risk) => ({
    id: risk.id,
    name: risk.category,
    shortDescription: { text: risk.statement },
    defaultConfiguration: { level: sarifLevel(risk.level) },
    properties: { aimaRiskLevel: risk.level, aimaRiskScore: risk.score }
  }));
  const results = report.risks.map((risk) => {
    const files = risk.facts.length ? risk.facts : report.context.changedFiles;
    return {
      ruleId: risk.id,
      level: sarifLevel(risk.level),
      message: { text: `${risk.statement}. ${risk.inference}` },
      locations: files.map((uri) => ({
        physicalLocation: {
          artifactLocation: { uri },
          region: { startLine: 1 }
        }
      })),
      properties: {
        aimaRiskScore: risk.score,
        evidenceBoundary: report.evidenceBoundary,
        recommendation: report.strategy.recommendation
      }
    };
  });
  return {
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    version: '2.1.0',
    runs: [{
      tool: { driver: { name: 'AIMA Agentic QE', informationUri: 'https://github.com/jonasqasoftware/aima-agentic-qe', rules } },
      invocations: [{ executionSuccessful: true }],
      results,
      properties: {
        changeId: report.context.changeId,
        policy: report.strategy.policy,
        evidenceBoundary: report.evidenceBoundary,
        baselineComparison: report.baselineComparison
      }
    }]
  };
}

export async function writeReports(report, directory) {
  await mkdir(directory, { recursive: true });
  const jsonPath = path.join(directory, 'aima-quality-report.json');
  const markdownPath = path.join(directory, 'aima-quality-report.md');
  const htmlPath = path.join(directory, 'aima-quality-report.html');
  const sarifPath = path.join(directory, 'aima-quality-report.sarif');
  const manifestPath = path.join(directory, 'aima-quality-report.manifest.json');
  const artifacts = {
    'aima-quality-report.json': `${JSON.stringify(report, null, 2)}\n`,
    'aima-quality-report.md': formatMarkdown(report),
    'aima-quality-report.html': formatHtml(report),
    'aima-quality-report.sarif': `${JSON.stringify(formatSarif(report), null, 2)}\n`
  };
  const manifest = createReportManifest(report, artifacts);
  await Promise.all([
    ...Object.entries(artifacts).map(([filename, content]) => writeFile(path.join(directory, filename), content)),
    writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
  ]);
  return { jsonPath, markdownPath, htmlPath, sarifPath, manifestPath };
}
