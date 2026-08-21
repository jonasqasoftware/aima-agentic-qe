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

function renderError(message) {
  result.replaceChildren(el('p', { className: 'analyze-error', text: `Não foi possível analisar: ${message}` }));
  result.hidden = false;
}

function recommendationClass(recommendation) {
  return recommendation.toLowerCase().replaceAll(' ', '-');
}

function renderReport(report) {
  const nodes = [];
  const topRisk = report.risks[0];

  nodes.push(el('span', { className: 'kicker', text: 'RESULTADO DA ANÁLISE' }));

  const decision = el('p', { className: `analyze-decision ${recommendationClass(report.strategy.recommendation)}`, text: report.strategy.recommendation });
  nodes.push(decision);
  nodes.push(el('p', { text: report.strategy.rationale }));
  nodes.push(el('p', {
    className: 'analyze-muted',
    text: `Política: ${report.strategy.policy.name} (${report.strategy.policy.id} · v${report.strategy.policy.version})${report.strategy.decisionReasonCode ? ` · ${report.strategy.decisionReasonCode}` : ''}`
  }));
  nodes.push(el('p', { text: `Quality Confidence experimental: ${report.qualityConfidence.score}/100` }));
  nodes.push(el('p', { className: 'analyze-muted', text: 'Quality Confidence ≠ Recomendação: a recomendação vem da política acima, não do score de Quality Confidence.' }));

  if (topRisk) {
    nodes.push(el('div', { className: `analyze-risk analyze-top-risk ${topRisk.level.toLowerCase()}` }, [
      el('p', { className: 'analyze-muted', text: `Maior risco · ${topRisk.id} · ${topRisk.score}/100` }),
      el('h3', { text: topRisk.statement }),
      el('p', { text: topRisk.inference })
    ]));
  }

  nodes.push(el('h3', { text: `Framework executável sugerido: ${report.framework.name}` }));
  nodes.push(el('p', { className: 'analyze-muted', text: 'O motor executável utiliza atualmente um subconjunto machine-readable da biblioteca pública de frameworks.' }));
  const frameworkEvidence = el('ul', {}, report.framework.selectionEvidence.map((item) => el('li', { text: item })));
  nodes.push(frameworkEvidence);

  nodes.push(el('h3', { text: 'Por que esse resultado?' }));
  for (const factor of report.qualityConfidence.factors) nodes.push(el('p', { className: 'analyze-muted', text: factor }));

  const { model, calculation } = report.qualityConfidence;
  if (model && calculation) {
    const details = el('details', { className: 'analyze-calculation' }, [
      el('summary', { text: 'Como este resultado foi calculado?' }),
      el('p', { text: `Modelo: ${model.id} v${model.version}` }),
      el('p', { text: `Maior risco: ${calculation.highestRiskScore}/100` }),
      el('p', { text: `Penalidade de risco: ${calculation.riskPenalty} ponto(s) (limite: ${calculation.caps.riskPenalty})` }),
      el('p', { text: `UNKNOWNs declarados: ${calculation.unknownCount}` }),
      el('p', { text: `Penalidade de incerteza: ${calculation.unknownPenalty} ponto(s) (limite: ${calculation.caps.unknownPenalty})` }),
      el('p', { text: `Total: 100 − ${calculation.riskPenalty} − ${calculation.unknownPenalty} = ${report.qualityConfidence.score}` }),
      el('p', { className: 'analyze-muted', text: 'Quality Confidence não é probabilidade, não aumenta com evidências positivas nesta versão e não aprova releases.' })
    ]);
    nodes.push(details);
  }

  nodes.push(el('h3', { text: 'O que testar agora?' }));
  const riskList = el('div', { className: 'analyze-risks' }, report.risks.map((risk) => el('article', { className: `analyze-risk ${risk.level.toLowerCase()}` }, [
    el('p', { className: 'analyze-muted', text: `${risk.id} · ${risk.category} · ${risk.score}/100` }),
    el('h4', { text: risk.statement }),
    el('p', { text: risk.inference })
  ])));
  nodes.push(riskList);
  nodes.push(el('ol', {}, report.strategy.recommendedTests.map((test) => el('li', { text: test }))));

  nodes.push(el('h3', { text: 'O que ainda não sabemos?' }));
  nodes.push(
    report.strategy.missingEvidence.length
      ? el('ul', {}, report.strategy.missingEvidence.map((item) => el('li', { className: 'analyze-unknown', text: item })))
      : el('p', { className: 'analyze-muted', text: 'Nenhuma incerteza declarada.' })
  );

  nodes.push(el('h3', { text: 'Evidências utilizadas' }));
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

  const interpretLink = el('a', { text: 'Como interpretar este resultado' });
  interpretLink.href = './como-usar.html#como-interpretar-o-resultado';
  nodes.push(el('p', {}, [interpretLink]));

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
