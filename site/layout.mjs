import { edition } from './edition.mjs';

const NAV_ITEMS = [
  { label: 'Método', href: 'index.html#metodo' },
  { label: 'Como usar', href: 'como-usar.html', current: 'como-usar' },
  { label: 'Biblioteca', href: 'index.html#frameworks' },
  { label: 'Assessment', href: 'assessment.html', current: 'assessment' },
  { label: 'Insights', href: 'insights.html', current: 'insights' }
];

const CTA = { label: 'Analisar mudança', href: 'analyze.html', current: 'analyze' };

const FOOTER_GROUPS = [
  {
    title: 'Produto',
    links: [
      { label: 'Analisar mudança', href: 'analyze.html' },
      { label: 'Assessment', href: 'assessment.html' },
      { label: 'Como usar', href: 'como-usar.html' }
    ]
  },
  {
    title: 'Método',
    links: [
      { label: 'Frameworks', href: 'index.html#frameworks' },
      { label: 'Léxico', href: 'index.html#lexico' },
      { label: 'Diagramas', href: 'index.html#diagramas' },
      { label: `Release ${edition.version}`, href: 'preview.html' }
    ]
  },
  {
    title: 'Projeto',
    links: [
      { label: 'GitHub', href: 'https://github.com/jonasqasoftware/aima-agentic-qe', external: true },
      { label: 'Insights', href: 'insights.html' }
    ]
  }
];

// Tema: escuro por padrão; o botão alterna e a escolha fica no localStorage
// (lida antes da pintura por theme-init.js). O botão é uma ação: o texto
// visível diz para qual tema ele leva ("Tema claro" no escuro, "Tema escuro"
// no claro), e esse texto é o próprio nome acessível.
const THEME_KEY = 'aima-theme';
const THEME_COLOR = { dark: '#0a1a2f', light: '#f2f6fa' };

function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'light') root.dataset.theme = 'light';
  else delete root.dataset.theme;
  document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => meta.setAttribute('content', THEME_COLOR[theme]));
  const target = theme === 'light' ? 'dark' : 'light';
  document.querySelectorAll('.theme-toggle').forEach((button) => {
    button.dataset.target = target;
    button.textContent = target === 'light' ? 'Tema claro' : 'Tema escuro';
  });
}

function bindThemeToggle() {
  const current = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
  applyTheme(current);
  document.querySelector('.theme-toggle')?.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    applyTheme(next);
    try {
      if (next === 'light') localStorage.setItem(THEME_KEY, 'light');
      else localStorage.removeItem(THEME_KEY);
    } catch (error) { /* armazenamento indisponível: vale só nesta página */ }
  });
}

function resolveHref(base, href, external) {
  return external ? href : `${base}${href}`;
}

function navLinkHtml(base, item, current) {
  const isCurrent = Boolean(item.current) && item.current === current;
  return `<a href="${resolveHref(base, item.href)}"${isCurrent ? ' aria-current="page"' : ''}>${item.label}</a>`;
}

/**
 * Mounts the canonical header (skip-link, brand, nav, primary CTA, mobile
 * menu button) and footer for every top-level and generated page. `current`
 * only matches nav items that represent a real, distinct document — section
 * anchors on the home page (Método, Frameworks) never receive aria-current,
 * since no single nav item correctly represents "you are on the home page".
 */
export function mountChrome({ base, rootId, current }) {
  let skipLink = document.querySelector('.skip-link');
  if (!skipLink) {
    document.body.insertAdjacentHTML('afterbegin', `<a class="skip-link" href="#${rootId}">Ir para o conteúdo</a>`);
    skipLink = document.querySelector('.skip-link');
  }

  const navLinks = NAV_ITEMS.map((item) => navLinkHtml(base, item, current)).join('');
  const ctaLink = navLinkHtml(base, CTA, current).replace('<a ', '<a class="nav-cta" ');

  skipLink.insertAdjacentHTML('afterend', `
    <header class="topbar">
      <a class="brand" href="${base}index.html" aria-label="AIMA 2.0 — início">AIMA <span class="brand-version">2.0</span></a>
      <nav class="nav" id="site-nav" aria-label="Navegação principal">${navLinks}${ctaLink}</nav>
      <div class="topbar-tools">
        <button class="theme-toggle" type="button" data-target="light">Tema claro</button>
        <button class="menu-button" type="button" aria-label="Abrir menu" aria-expanded="false" aria-controls="site-nav">Menu</button>
      </div>
    </header>`);

  bindThemeToggle();

  const footerGroups = FOOTER_GROUPS.map((group) => `
    <div class="footer-group">
      <h4>${group.title}</h4>
      <ul>${group.links.map((link) => `<li><a href="${resolveHref(base, link.href, link.external)}">${link.label}</a></li>`).join('')}</ul>
    </div>`).join('');

  document.body.insertAdjacentHTML('beforeend', `
    <footer class="footer section-shell">
      <div class="footer-brand">
        <strong>AIMA 2.0</strong>
        <p>AI-driven Intelligent Method for Assurance</p>
        <p class="footer-author">Jonas Dávila da Silva<br />Quality Engineer · Porto Alegre · 2026</p>
      </div>
      ${footerGroups}
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
