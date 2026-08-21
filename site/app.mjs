import { frameworks, lexicon, insights } from './content.mjs';
import { mountChrome } from './layout.mjs';

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

const frameworkGrid = document.querySelector('#framework-grid');
const filterButtons = document.querySelectorAll('.filter-button');
let activeFilter = 'all';

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
}

filterButtons.forEach((button) => button.addEventListener('click', () => {
  activeFilter = button.dataset.filter;
  filterButtons.forEach((item) => item.classList.toggle('active', item === button));
  renderFrameworks();
}));
renderFrameworks();

const lexiconSearch = document.querySelector('#lexicon-search');
const lexiconCategory = document.querySelector('#lexicon-category');
const lexiconGrid = document.querySelector('#lexicon-grid');
const lexiconCount = document.querySelector('#lexicon-count');

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
  lexiconGrid.innerHTML = visible.map((item) => `
    <article class="lexicon-card">
      <div><span>${String(item.id).padStart(2, '0')}</span><small>${item.category}</small></div>
      <h3>${item.term}</h3>
      <p>${item.definition}</p>
      <blockquote>${item.synthesis}</blockquote>
    </article>`).join('') || '<p class="empty-state">Nenhum conceito encontrado para esta busca.</p>';
  if (lexiconCount) lexiconCount.textContent = `${visible.length} de ${lexicon.length} conceitos`;
}

lexiconSearch?.addEventListener('input', renderLexicon);
lexiconCategory?.addEventListener('change', renderLexicon);
renderLexicon();

const diagramGrid = document.querySelector('#diagram-grid');
if (diagramGrid) {
  diagramGrid.innerHTML = frameworks.map((item) => `
    <a class="diagram-card" href="./frameworks/${item.slug}.html">
      <div class="diagram-card-head"><span>${String(item.id).padStart(2, '0')}</span><strong>${item.name}</strong></div>
      <div class="mini-flow" aria-label="${item.name}: ${item.flow.join(' para ')}">
        ${item.flow.map((step) => `<span>${step}</span>`).join('<b aria-hidden="true">→</b>')}
      </div>
    </a>`).join('');
}

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
