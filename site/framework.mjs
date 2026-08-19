import { frameworks } from './content.mjs';
import { mountChrome } from './layout.mjs';

const slug = document.body.dataset.framework;
const framework = frameworks.find((item) => item.slug === slug);
const root = document.querySelector('#framework-root');

mountChrome({ base: '../', rootId: 'framework-root' });

const list = (items, ordered = false) => {
  const tag = ordered ? 'ol' : 'ul';
  return `<${tag}>${items.map((item) => `<li>${item}</li>`).join('')}</${tag}>`;
};

if (!framework || !root) {
  if (root) root.innerHTML = '<section class="section-shell"><h1>Framework não encontrado</h1><p>Volte ao catálogo do AIMA 2.0.</p></section>';
} else {
  const number = String(framework.id).padStart(2, '0');
  document.title = `${framework.name} — AIMA 2.0`;
  root.innerHTML = `
    <section class="framework-hero section-shell">
      <a class="back-link" href="../index.html#frameworks">← Voltar aos 20 frameworks</a>
      <div class="eyebrow">AIMA 2.0 · FRAMEWORK ${number} · RELEASE 0.9</div>
      <h1>${framework.name}</h1>
      <p class="lead">${framework.summary}</p>
      <div class="framework-meta">
        <div><span>Participantes</span><strong>${framework.participants}</strong></div>
        <div><span>Duração</span><strong>${framework.duration}</strong></div>
        <div><span>Categoria</span><strong>${framework.categoryLabel}</strong></div>
      </div>
    </section>

    <section class="section-shell section-dark">
      <span class="kicker">FLUXO CONCEITUAL</span>
      <div class="diagram-flow" aria-label="Fluxo conceitual">${framework.flow.map((step, index) => `<div><span>${String(index + 1).padStart(2, '0')}</span><strong>${step}</strong></div>`).join('')}</div>
    </section>

    <section class="section-shell framework-detail-grid">
      <article><span class="kicker">FINALIDADE</span><p class="detail-lead">${framework.purpose}</p></article>
      <article><span class="kicker">QUANDO USAR</span>${list(framework.whenUse)}</article>
      <article class="wide"><span class="kicker">PASSO A PASSO</span>${list(framework.steps, true)}</article>
      <article><span class="kicker">ENTRADAS</span>${list(framework.inputs)}</article>
      <article><span class="kicker">SAÍDAS ESPERADAS</span>${list(framework.outputs)}</article>
      <article class="wide example-panel"><span class="kicker">EXEMPLO PRÁTICO</span><p>${framework.example}</p></article>
      <article><span class="kicker">ANTI-PADRÕES</span>${list(framework.antiPatterns)}</article>
      <article><span class="kicker">MÉTRICAS DE ADOÇÃO</span>${list(framework.metrics)}</article>
    </section>

    <section class="section-shell framework-next">
      <span class="kicker">PRÓXIMA DECISÃO</span>
      <h2>Use o framework para tornar contexto, evidências e trade-offs explícitos.</h2>
      <div class="hero-actions">
        <a class="button button-primary" href="../assessment.html">Fazer o Assessment</a>
        <a class="button button-secondary" href="../index.html#frameworks">Explorar outro framework</a>
      </div>
    </section>`;
}
