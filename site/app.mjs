import { frameworks, lexicon, insights } from './content.mjs';
import { mountChrome } from './layout.mjs';
import { edition } from './edition.mjs';

// app.mjs is shared by every top-level page that has no page-specific
// controller of its own (index, preview, insights, como-usar). Pages with
// their own controller (assessment.mjs, analyze.mjs) mount their own chrome
// instead and do not load this script, to avoid mounting header/footer twice.
const PAGE_CHROME = {
  index: { rootId: 'conteudo' },
  preview: { rootId: 'preview' },
  insights: { rootId: 'insights', current: 'insights' },
  'como-usar': { rootId: 'como-usar', current: 'como-usar' }
};
const page = document.body.dataset.page || 'index';
mountChrome({ base: './', ...PAGE_CHROME[page] });

// Hydrates every element carrying a data-edition-* hook with the matching
// field from edition.mjs — the canonical source for editorial metadata.
// querySelectorAll returns an empty NodeList when a hook is absent from the
// page (safe no-op) and every match when a hook repeats (no unique id
// required).
function hydrateEdition() {
  const bindings = [
    ['data-edition-label', edition.label],
    ['data-edition-version', edition.version],
    ['data-edition-frameworks-count', edition.frameworksCount],
    ['data-edition-concepts-count', edition.conceptsCount],
    ['data-edition-diagrams-count', edition.diagramsCount]
  ];
  for (const [attribute, value] of bindings) {
    document.querySelectorAll(`[${attribute}]`).forEach((element) => {
      element.textContent = String(value);
    });
  }
}
hydrateEdition();

const frameworkGrid = document.querySelector('#framework-grid');
const frameworkStatus = document.querySelector('#framework-status');
const filterButtons = document.querySelectorAll('.filter-button');
let activeFilter = 'all';
const PREVIEW_LIMIT = { lexicon: 9, diagrams: 6 };
const expanded = { lexicon: false, diagrams: false };

// Botão "Mostrar todos / Mostrar menos" com estado semântico (aria-expanded).
function bindToggle(id, key, rerender) {
  const button = document.querySelector(id);
  button?.addEventListener('click', () => {
    expanded[key] = !expanded[key];
    rerender();
  });
  return button;
}
function syncToggle(button, key, total) {
  if (!button) return;
  const limit = PREVIEW_LIMIT[key];
  button.hidden = total <= limit;
  button.setAttribute('aria-expanded', String(expanded[key]));
  button.textContent = expanded[key] ? 'Mostrar menos' : `Mostrar todos (${total})`;
}

function renderFrameworks() {
  if (!frameworkGrid) return;
  const visible = frameworks.filter((item) => activeFilter === 'all' || item.category === activeFilter);
  frameworkGrid.innerHTML = visible.map((item) => `
    <a class="framework-card" data-category="${item.category}" href="./frameworks/${item.slug}.html">
      <span>${String(item.id).padStart(2, '0')}</span>
      <h3>${item.name}</h3>
      <p>${item.summary}</p>
      <small>${item.categoryLabel} →</small>
    </a>`).join('');
  if (frameworkStatus) frameworkStatus.textContent = `Exibindo ${visible.length} de ${frameworks.length} frameworks.`;
}

// Estado do filtro exposto por semântica (aria-pressed), não só por classe CSS.
filterButtons.forEach((button) => button.addEventListener('click', () => {
  activeFilter = button.dataset.filter;
  filterButtons.forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
  renderFrameworks();
}));
renderFrameworks();

const lexiconSearch = document.querySelector('#lexicon-search');
const lexiconCategory = document.querySelector('#lexicon-category');
const lexiconGrid = document.querySelector('#lexicon-grid');
const lexiconCount = document.querySelector('#lexicon-count');
const lexiconToggle = bindToggle('#lexicon-toggle', 'lexicon', () => renderLexicon());

function normalize(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function renderLexicon() {
  if (!lexiconGrid) return;
  const query = normalize(lexiconSearch?.value || '');
  const category = lexiconCategory?.value || 'all';
  const visible = lexicon.filter((item) => {
    const matchesCategory = category === 'all' || item.category === category;
    const searchable = normalize(`${item.term} ${item.definition} ${item.synthesis}`);
    return matchesCategory && (!query || searchable.includes(query));
  });
  const searching = Boolean(query) || category !== 'all';
  const shown = searching || expanded.lexicon ? visible : visible.slice(0, PREVIEW_LIMIT.lexicon);
  lexiconGrid.innerHTML = shown.map((item) => `
    <article class="lexicon-card">
      <div><span>${String(item.id).padStart(2, '0')}</span><small>${item.category}</small></div>
      <h3>${item.term}</h3>
      <p>${item.definition}</p>
      <blockquote>${item.synthesis}</blockquote>
    </article>`).join('') || '<p class="empty-state">Nenhum conceito encontrado para esta busca.</p>';
  if (lexiconCount) lexiconCount.textContent = shown.length < visible.length ? `Exibindo ${shown.length} de ${lexicon.length} conceitos` : `${visible.length} de ${lexicon.length} conceitos`;
  if (lexiconToggle) { syncToggle(lexiconToggle, 'lexicon', visible.length); if (searching) lexiconToggle.hidden = true; }
}

lexiconSearch?.addEventListener('input', renderLexicon);
lexiconCategory?.addEventListener('change', renderLexicon);
renderLexicon();

const diagramGrid = document.querySelector('#diagram-grid');
const diagramToggle = bindToggle('#diagram-toggle', 'diagrams', () => renderDiagrams());
function renderDiagrams() {
  if (!diagramGrid) return;
  const shown = expanded.diagrams ? frameworks : frameworks.slice(0, PREVIEW_LIMIT.diagrams);
  syncToggle(diagramToggle, 'diagrams', frameworks.length);
  diagramGrid.innerHTML = shown.map((item) => `
    <a class="diagram-card" href="./frameworks/${item.slug}.html">
      <div class="diagram-card-head"><span>${String(item.id).padStart(2, '0')}</span><strong>${item.name}</strong></div>
      <div class="mini-flow" aria-label="${item.name}: ${item.flow.join(' para ')}">
        ${item.flow.map((step) => `<span>${step}</span>`).join('<b aria-hidden="true">→</b>')}
      </div>
    </a>`).join('');
}
renderDiagrams();

const insightsGrid = document.querySelector('#insights-grid');
if (insightsGrid) {
  insightsGrid.innerHTML = insights.map((item, index) => `
    <a class="insight-card" href="./insights/${item.slug}.html">
      <span>INSIGHT ${String(index + 1).padStart(2, '0')}</span>
      <h3>${item.title}</h3>
      <p>${item.description}</p>
      <small>Ler →</small>
    </a>`).join('');
}
