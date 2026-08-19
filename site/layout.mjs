const NAV_LINKS = [
  ['Método', 'index.html#metodo'],
  ['Frameworks', 'index.html#frameworks'],
  ['Léxico', 'index.html#lexico'],
  ['Diagramas', 'index.html#diagramas'],
  ['Assessment', 'assessment.html'],
  ['Preview', 'preview.html'],
  ['Insights', 'insights.html'],
];

export function mountChrome({ base, rootId }) {
  let skipLink = document.querySelector('.skip-link');
  if (!skipLink) {
    document.body.insertAdjacentHTML('afterbegin', `<a class="skip-link" href="#${rootId}">Ir para o conteúdo</a>`);
    skipLink = document.querySelector('.skip-link');
  }

  const links = NAV_LINKS.map(([label, href]) => `<a href="${base}${href}">${label}</a>`).join('');
  skipLink.insertAdjacentHTML('afterend', `
    <header class="topbar">
      <a class="brand" href="${base}index.html" aria-label="AIMA 2.0 — início"><span class="brand-mark">AIMA</span><span class="brand-version">2.0</span></a>
      <nav class="nav" id="site-nav" aria-label="Navegação principal">${links}<a class="nav-cta" href="https://github.com/jonasqasoftware/aima-agentic-qe">GitHub</a></nav>
      <button class="menu-button" type="button" aria-label="Abrir menu" aria-expanded="false" aria-controls="site-nav">Menu</button>
    </header>`);

  document.body.insertAdjacentHTML('beforeend', `
    <footer class="footer section-shell">
      <div><strong>AIMA 2.0</strong><p>AI-driven Intelligent Method for Assurance</p></div>
      <div><span>Jonas Dávila da Silva</span><p>Quality Engineer · Porto Alegre · 2026</p></div>
      <div><a href="${base}preview.html">Preview</a><a href="${base}assessment.html">Assessment</a><a href="https://github.com/jonasqasoftware/aima-agentic-qe">GitHub</a></div>
    </footer>`);

  const menuButton = document.querySelector('.menu-button');
  const nav = document.querySelector('.nav');
  if (menuButton && nav) {
    menuButton.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('open');
      menuButton.setAttribute('aria-expanded', String(isOpen));
    });
    nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
      nav.classList.remove('open');
      menuButton.setAttribute('aria-expanded', 'false');
    }));
  }
}
