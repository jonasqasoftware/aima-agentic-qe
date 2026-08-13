import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { buildEvidenceLedger } from './evidence-ledger.js';

export function createReport(change, selection, risks, confidence, strategy) {
  const evidenceBoundary = change.source === 'local-git-name-only'
    ? 'Relatório baseado nos nomes de arquivos de um diff Git local e em regras determinísticas. Não afirma leitura do conteúdo do diff, de PR remoto, execução de testes ou aprovação de release.'
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
  return `# AIMA Agentic QE report\n\n> ${report.evidenceBoundary}\n\n## Contexto\n\n- **Mudança:** \`${report.context.changeId}\`\n- **Resumo:** ${report.context.summary}\n- **Arquivos declarados:** ${report.context.changedFiles.map((file) => `\`${file}\``).join(', ')}\n\n## Framework AIMA selecionado\n\n- **${report.framework.name}** (\`${report.framework.id}\`)\n${report.framework.selectionEvidence.map((item) => `- ${item}`).join('\n')}\n\n## Ledger de evidências\n\n| ID | Tipo | Origem | Declaração |\n| --- | --- | --- | --- |\n${evidence}\n\n## Riscos\n\n| ID | Nível | Score | Hipótese de risco |\n| --- | --- | ---: | --- |\n${risks}\n\n## Estratégia recomendada\n\n${tests}\n\n## Evidências ausentes / incertezas\n\n${unknowns}\n\n## Quality Confidence experimental\n\n**${report.qualityConfidence.score}/100**\n\n${report.qualityConfidence.factors.map((item) => `- ${item}`).join('\n')}\n\n## Recomendação de release\n\n**${report.strategy.recommendation}**\n\n${report.strategy.rationale}\n\n## Rastreabilidade de agentes\n\n${report.agentTrace.map((entry) => `- **${entry.agent}:** ${entry.status} — ${entry.output}`).join('\n')}\n`;
}

export async function writeReports(report, directory) {
  await mkdir(directory, { recursive: true });
  const jsonPath = path.join(directory, 'aima-quality-report.json');
  const markdownPath = path.join(directory, 'aima-quality-report.md');
  await Promise.all([
    writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`),
    writeFile(markdownPath, formatMarkdown(report))
  ]);
  return { jsonPath, markdownPath };
}
