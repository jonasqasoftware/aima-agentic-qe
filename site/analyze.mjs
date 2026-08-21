import { analyzeChange } from './core/analyze-change.js';
import { frameworks, releasePolicy } from './generated/aima-data.mjs';

const form = document.querySelector('#analyze-form');
const result = document.querySelector('#analyze-result');

function linesOf(value) {
  return String(value ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseDeclaredEvidence(value) {
  const text = String(value ?? '').trim();
  if (!text) return [];
  return JSON.parse(text);
}

function readInput(formData) {
  return {
    id: formData.get('id'),
    summary: formData.get('summary'),
    businessImpact: formData.get('businessImpact'),
    technicalComplexity: formData.get('technicalComplexity'),
    changedFiles: linesOf(formData.get('changedFiles')),
    knownUnknowns: linesOf(formData.get('knownUnknowns')),
    declaredEvidence: parseDeclaredEvidence(formData.get('declaredEvidence'))
  };
}

function el(tag, options = {}, children = []) {
  const node = document.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.text !== undefined) node.textContent = options.text;
  for (const child of children) node.append(child);
  return node;
}

function renderError(message) {
  result.replaceChildren(el('p', { className: 'analyze-error', text: `Não foi possível analisar: ${message}` }));
  result.hidden = false;
}

function recommendationClass(recommendation) {
  return recommendation.toLowerCase().replaceAll(' ', '-');
}

function renderReport(report) {
  const nodes = [];

  nodes.push(el('span', { className: 'kicker', text: 'RESULTADO DA ANÁLISE' }));

  const decision = el('p', { className: `analyze-decision ${recommendationClass(report.strategy.recommendation)}`, text: report.strategy.recommendation });
  nodes.push(decision);
  nodes.push(el('p', { text: report.strategy.rationale }));
  nodes.push(el('p', { text: `Quality Confidence experimental: ${report.qualityConfidence.score}/100` }));
  for (const factor of report.qualityConfidence.factors) nodes.push(el('p', { className: 'analyze-muted', text: factor }));

  nodes.push(el('h3', { text: `Framework selecionado: ${report.framework.name}` }));
  const frameworkEvidence = el('ul', {}, report.framework.selectionEvidence.map((item) => el('li', { text: item })));
  nodes.push(frameworkEvidence);

  nodes.push(el('h3', { text: 'Riscos priorizados' }));
  const riskList = el('div', { className: 'analyze-risks' }, report.risks.map((risk) => el('article', { className: `analyze-risk ${risk.level.toLowerCase()}` }, [
    el('p', { className: 'analyze-muted', text: `${risk.id} · ${risk.category} · ${risk.score}/100` }),
    el('h4', { text: risk.statement }),
    el('p', { text: risk.inference })
  ])));
  nodes.push(riskList);

  nodes.push(el('h3', { text: 'Estratégia recomendada' }));
  nodes.push(el('ol', {}, report.strategy.recommendedTests.map((test) => el('li', { text: test }))));

  nodes.push(el('h3', { text: 'Evidências ausentes / incertezas (UNKNOWN)' }));
  nodes.push(
    report.strategy.missingEvidence.length
      ? el('ul', {}, report.strategy.missingEvidence.map((item) => el('li', { className: 'analyze-unknown', text: item })))
      : el('p', { className: 'analyze-muted', text: 'Nenhuma incerteza declarada.' })
  );

  nodes.push(el('h3', { text: 'Ledger de evidências' }));
  const table = el('table', { className: 'analyze-ledger' });
  const thead = el('thead', {}, [el('tr', {}, [
    el('th', { text: 'ID' }),
    el('th', { text: 'Tipo' }),
    el('th', { text: 'Origem' }),
    el('th', { text: 'Declaração' })
  ])]);
  const tbody = el('tbody', {}, report.evidenceLedger.map((item) => el('tr', { className: `analyze-kind-${item.kind}` }, [
    el('td', { text: item.id }),
    el('td', { text: item.kind }),
    el('td', { text: item.source }),
    el('td', { text: item.statement })
  ])));
  table.append(thead, tbody);
  nodes.push(el('div', { className: 'analyze-table-wrap' }, [table]));

  nodes.push(el('p', { className: 'article-note', text: report.evidenceBoundary }));

  result.replaceChildren(...nodes);
  result.hidden = false;
  result.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

form?.addEventListener('submit', (event) => {
  event.preventDefault();
  try {
    const input = readInput(new FormData(form));
    const report = analyzeChange(input, { frameworks, releasePolicy });
    renderReport(report);
  } catch (error) {
    renderError(error instanceof Error ? error.message : String(error));
  }
});
