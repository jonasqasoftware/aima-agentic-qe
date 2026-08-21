import { insights } from './content.mjs';
import { mountChrome } from './layout.mjs';
import { edition } from './edition.mjs';

const slug = document.body.dataset.insight;
const insight = insights.find((item) => item.slug === slug);
const root = document.querySelector('#insight-root');

mountChrome({ base: '../', rootId: 'insight-root', current: 'insights' });

if (!insight || !root) {
  if (root) root.innerHTML = '<section class="article-shell"><h1>Insight não encontrado</h1><a href="../insights.html">Voltar aos Insights</a></section>';
} else {
  document.title = `${insight.title} — AIMA Insights`;
  root.innerHTML = `
    <article class="article-shell">
      <a class="back-link" href="../insights.html">← Voltar aos AIMA Insights</a>
      <div class="eyebrow">AIMA INSIGHTS · RELEASE ${edition.version}</div>
      <h1>${insight.title}</h1>
      <p class="lead">${insight.description}</p>
      <div class="article-body">${insight.body.map((paragraph) => `<p>${paragraph}</p>`).join('')}</div>
      <aside class="article-note">AIMA 2.0 trata métricas, automação e IA como meios para produzir evidências e melhorar decisões — não como fins isolados.</aside>
      <div class="hero-actions"><a class="button button-primary" href="../assessment.html">Aplicar ao meu contexto</a><a class="button button-secondary" href="../index.html#frameworks">Explorar frameworks</a></div>
    </article>`;
}
