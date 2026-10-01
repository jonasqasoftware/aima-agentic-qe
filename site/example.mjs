import { examples } from './content.mjs';
import { mountChrome } from './layout.mjs';
import { edition } from './edition.mjs';

const slug = document.body.dataset.example;
const example = examples.find((item) => item.slug === slug);
const root = document.querySelector('#example-root');

mountChrome({ base: '../', rootId: 'example-root', current: 'exemplos' });

if (!example || !root) {
  if (root) root.innerHTML = '<section class="section-shell"><h1>Exemplo não encontrado</h1><p>Volte aos exemplos do AIMA.</p></section>';
} else {
  document.title = `${example.title} — Exemplos AIMA`;
  root.innerHTML = `
    <section class="framework-hero section-shell">
      <a class="back-link" href="../exemplos.html">← Voltar aos exemplos</a>
      <div class="eyebrow">EXEMPLO · ${example.category.toUpperCase()} · RELEASE ${edition.version}</div>
      <h1>${example.title}</h1>
      <p class="lead">${example.summary}</p>
    </section>

    <section class="section-shell framework-detail-grid">
      <article><span class="kicker">A · ANÁLISE</span><p>${example.analise}</p></article>
      <article><span class="kicker">I · IMPACTO</span><p>${example.impacto}</p></article>
      <article><span class="kicker">M · METRIFICAÇÃO</span><p>${example.metrificacao}</p></article>
      <article><span class="kicker">A · APRESENTAÇÃO</span><p>${example.apresentacao}</p></article>
    </section>

    <section class="section-shell framework-next section-dark">
      <span class="kicker">PRÓXIMA DECISÃO</span>
      <h2>Aplique o mesmo raciocínio ao seu contexto.</h2>
      <div class="hero-actions">
        <a class="button button-primary" href="../canvas.html">Abrir o AIMA Canvas</a>
        <a class="button button-secondary" href="../exemplos.html">Ver outro exemplo</a>
      </div>
    </section>`;
}
