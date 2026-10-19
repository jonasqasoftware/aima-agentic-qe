import { analyzeChange } from './core/analyze-change.js';
import { frameworks, releasePolicy } from './generated/aima-data.mjs';
import { mountChrome } from './layout.mjs';

mountChrome({ base: './', rootId: 'analyze', current: 'analyze' });

const form = document.querySelector('#analyze-form');
const result = document.querySelector('#analyze-result');

function el(tag, options = {}, children = []) {
  const node = document.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.text !== undefined) node.textContent = options.text;
  for (const child of children) node.append(child);
  return node;
}

// --- Progressive evidence UX -------------------------------------------
// Two ways to declare evidence: a simple row-based list, or an advanced
// JSON textarea for power users. They are never merged. The rule is
// deterministic and surfaced in the UI, not silent: whenever the JSON
// field has content, it wins outright and the simple list is disabled.
const evidenceList = document.querySelector('#evidence-list');
const evidenceAddButton = document.querySelector('#evidence-add');
const evidenceJson = document.querySelector('#evidence-json');
const evidenceModeNote = document.querySelector('#evidence-mode-note');

function createEvidenceRow() {
  const row = document.createElement('div');
  row.className = 'evidence-row';

  const typeLabel = document.createElement('label');
  typeLabel.textContent = 'Tipo';
  const typeInput = document.createElement('input');
  typeInput.type = 'text';
  typeInput.dataset.field = 'type';
  typeInput.placeholder = 'unit-test';
  typeLabel.append(typeInput);

  const summaryLabel = document.createElement('label');
  summaryLabel.textContent = 'Descrição';
  const summaryInput = document.createElement('input');
  summaryInput.type = 'text';
  summaryInput.dataset.field = 'summary';
  summaryInput.placeholder = 'Suíte executada localmente pelo autor';
  summaryLabel.append(summaryInput);

  const idLabel = document.createElement('label');
  idLabel.textContent = 'Identificador (opcional)';
  const idInput = document.createElement('input');
  idInput.type = 'text';
  idInput.dataset.field = 'id';
  idInput.placeholder = 'UNIT-1';
  idLabel.append(idInput);

  const removeButton = document.createElement('button');
  removeButton.type = 'button';
  removeButton.className = 'evidence-remove';
  removeButton.setAttribute('aria-label', 'Remover esta evidência');
  removeButton.textContent = '×';
  removeButton.addEventListener('click', () => row.remove());

  row.append(typeLabel, summaryLabel, idLabel, removeButton);
  return row;
}

evidenceAddButton?.addEventListener('click', () => {
  evidenceList.append(createEvidenceRow());
});

function syncEvidenceMode() {
  const jsonActive = Boolean(evidenceJson?.value.trim());
  evidenceList.toggleAttribute('inert', jsonActive);
  evidenceList.classList.toggle('evidence-list-disabled', jsonActive);
  if (evidenceAddButton) evidenceAddButton.disabled = jsonActive;
  if (evidenceModeNote) evidenceModeNote.hidden = !jsonActive;
}

evidenceJson?.addEventListener('input', syncEvidenceMode);
syncEvidenceMode();

// The core's declaredEvidence contract requires id, type, and summary
// (see src/change-input-core.js). The UI treats id as optional and fills
// a fallback so the schema is never violated from the browser layer.
function readDeclaredEvidence() {
  const jsonText = (evidenceJson?.value ?? '').trim();
  if (jsonText) return JSON.parse(jsonText);
  return [...evidenceList.querySelectorAll('.evidence-row')]
    .map((row, index) => ({
      type: row.querySelector('[data-field="type"]').value.trim(),
      summary: row.querySelector('[data-field="summary"]').value.trim(),
      id: row.querySelector('[data-field="id"]').value.trim() || `EVID-${index + 1}`
    }))
    .filter((item) => item.type && item.summary);
}

function linesOf(value) {
  return String(value ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function readInput(formData) {
  return {
    id: formData.get('id'),
    summary: formData.get('summary'),
    businessImpact: formData.get('businessImpact'),
    technicalComplexity: formData.get('technicalComplexity'),
    changedFiles: linesOf(formData.get('changedFiles')),
    knownUnknowns: linesOf(formData.get('knownUnknowns')),
    declaredEvidence: readDeclaredEvidence()
  };
}

function showResult(nodes, { focusId } = {}) {
  result.replaceChildren(...nodes);
  result.hidden = false;
  const target = focusId ? result.querySelector(`#${focusId}`) : null;
  if (target) {
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  }
  result.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderError(message, field) {
  const evidenceJsonField = document.querySelector('#evidence-json');
  evidenceJsonField?.removeAttribute('aria-invalid');
  if (field === 'evidence-json' && evidenceJsonField) evidenceJsonField.setAttribute('aria-invalid', 'true');
  const hint = field === 'evidence-json'
    ? ' Corrija o JSON do modo avançado ou esvazie o campo para usar a lista simples de evidências.'
    : '';
  const error = el('p', { className: 'analyze-error', text: `Não foi possível analisar: ${message}${hint}` });
  error.id = 'analyze-error';
  error.setAttribute('role', 'alert');
  showResult([error], { focusId: 'analyze-error' });
}

function recommendationClass(recommendation) {
  return recommendation.toLowerCase().replaceAll(' ', '-');
}

function section(id, title, children) {
  const heading = el('h2', { text: title });
  heading.id = id;
  const node = document.createElement('section');
  node.setAttribute('aria-labelledby', id);
  node.append(heading, ...children);
  return node;
}

function riskCard(risk, { top = false } = {}) {
  return el('article', { className: `analyze-risk ${risk.level.toLowerCase()} ${top ? 'analyze-top-risk' : ''}`.trim() }, [
    el('p', { className: 'analyze-muted', text: `${top ? 'Maior risco · ' : ''}${risk.id} · ${risk.category} · nível ${risk.level} · ${risk.score}/100` }),
    el('h3', { text: risk.statement }),
    el('p', { text: risk.inference })
  ]);
}

// Ordem de leitura: Recomendação → Riscos → Evidências → Lacunas →
// Próximas verificações → Explicabilidade. Todo o conteúdo vem do relatório do
// core; esta camada apenas organiza e rotula (fato declarado / inferência / UNKNOWN).
function renderReport(report) {
  const { strategy, qualityConfidence, framework } = report;
  const sections = [];

  sections.push(section('res-recomendacao', 'Recomendação', [
    el('p', { className: `analyze-decision ${recommendationClass(strategy.recommendation)}`, text: strategy.recommendation }),
    el('p', { text: strategy.rationale }),
    el('p', {
      className: 'analyze-muted',
      text: `Política: ${strategy.policy.name} (${strategy.policy.id} · v${strategy.policy.version})${strategy.decisionReasonCode ? ` · ${strategy.decisionReasonCode}` : ''}`
    }),
    el('p', { className: 'analyze-human', text: 'Revisão humana necessária: esta recomendação é uma inferência determinística a partir do que foi declarado. Ela não aprova nem bloqueia um release por conta própria.' })
  ]));

  const riskChildren = [];
  if (report.risks[0]) riskChildren.push(riskCard(report.risks[0], { top: true }));
  const otherRisks = report.risks.slice(1);
  if (otherRisks.length) riskChildren.push(el('div', { className: 'analyze-risks' }, otherRisks.map((risk) => riskCard(risk))));
  sections.push(section('res-riscos', 'Riscos', riskChildren));

  const table = el('table', { className: 'analyze-ledger' });
  table.append(
    el('caption', { className: 'sr-only', text: 'Evidências utilizadas na análise' }),
    el('thead', {}, [el('tr', {}, ['ID', 'Tipo', 'Origem', 'Declaração'].map((label) => {
      const th = el('th', { text: label });
      th.scope = 'col';
      return th;
    }))]),
    el('tbody', {}, report.evidenceLedger.map((item) => el('tr', { className: `analyze-kind-${item.kind}` }, [
      el('td', { text: item.id }), el('td', { text: item.kind }), el('td', { text: item.source }), el('td', { text: item.statement })
    ])))
  );
  sections.push(section('res-evidencias', 'Evidências', [
    el('p', { className: 'analyze-muted', text: 'Cada linha é um fato declarado, uma inferência do motor ou um UNKNOWN. Evidência declarada não foi verificada pelo AIMA.' }),
    el('div', { className: 'analyze-table-wrap' }, [table]),
    el('p', { className: 'article-note', text: report.evidenceBoundary })
  ]));

  sections.push(section('res-lacunas', 'Lacunas', [
    strategy.missingEvidence.length
      ? el('ul', {}, strategy.missingEvidence.map((item) => el('li', { className: 'analyze-unknown', text: item })))
      : el('p', { className: 'analyze-muted', text: 'Nenhuma incerteza declarada. Isso não significa que não existam lacunas — apenas que nenhuma foi informada.' })
  ]));

  sections.push(section('res-verificacoes', 'Próximas verificações', [
    el('ol', {}, strategy.recommendedTests.map((test) => el('li', { text: test })))
  ]));

  const explain = [
    el('h3', { text: `Framework executável sugerido: ${framework.name}` }),
    el('p', { className: 'analyze-muted', text: 'O motor executável utiliza atualmente um subconjunto machine-readable da biblioteca pública de frameworks.' }),
    el('ul', {}, framework.selectionEvidence.map((item) => el('li', { text: item }))),
    el('h3', { text: 'Por que esse resultado?' }),
    el('p', { text: `Quality Confidence experimental: ${qualityConfidence.score}/100` }),
    el('p', { className: 'analyze-muted', text: 'Quality Confidence ≠ Recomendação: a recomendação vem da política, não do score de Quality Confidence.' })
  ];
  for (const factor of qualityConfidence.factors) explain.push(el('p', { className: 'analyze-muted', text: factor }));
  const { model, calculation } = qualityConfidence;
  if (model && calculation) {
    explain.push(el('details', { className: 'analyze-calculation' }, [
      el('summary', { text: 'Como este resultado foi calculado?' }),
      el('p', { text: `Modelo: ${model.id} v${model.version}` }),
      el('p', { text: `Maior risco: ${calculation.highestRiskScore}/100` }),
      el('p', { text: `Penalidade de risco: ${calculation.riskPenalty} ponto(s) (limite: ${calculation.caps.riskPenalty})` }),
      el('p', { text: `UNKNOWNs declarados: ${calculation.unknownCount}` }),
      el('p', { text: `Penalidade de incerteza: ${calculation.unknownPenalty} ponto(s) (limite: ${calculation.caps.unknownPenalty})` }),
      el('p', { text: `Total: 100 − ${calculation.riskPenalty} − ${calculation.unknownPenalty} = ${qualityConfidence.score}` }),
      el('p', { className: 'analyze-muted', text: 'Quality Confidence não é probabilidade, não aumenta com evidências positivas nesta versão e não aprova releases.' })
    ]));
  }
  sections.push(section('res-explicabilidade', 'Explicabilidade', explain));

  const interpretLink = el('a', { text: 'Como interpretar este resultado' });
  interpretLink.href = './como-usar.html#como-interpretar-o-resultado';
  sections.push(el('p', { className: 'analyze-nextlinks' }, [interpretLink]));

  showResult(sections, { focusId: 'res-recomendacao' });
}

form?.addEventListener('submit', (event) => {
  event.preventDefault();
  try {
    document.querySelector('#evidence-json')?.removeAttribute('aria-invalid');
    const input = readInput(new FormData(form));
    const report = analyzeChange(input, { frameworks, releasePolicy });
    renderReport(report);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const jsonProblem = error instanceof SyntaxError && Boolean(evidenceJson?.value.trim());
    renderError(message, jsonProblem ? 'evidence-json' : undefined);
  }
});
