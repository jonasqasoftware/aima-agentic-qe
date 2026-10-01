import { edition } from './edition.mjs';

const NAV_ITEMS = [
  { label: 'AIMA', href: 'aima.html', current: 'aima' },
  { label: 'Como usar', href: 'como-usar.html', current: 'como-usar' },
  { label: 'Exemplos', href: 'exemplos.html', current: 'exemplos' },
  { label: 'Labs', href: 'labs.html', current: 'labs' },
  { label: 'Sobre', href: 'sobre.html', current: 'sobre' }
];

const CTA = { label: 'Aplicar AIMA', href: 'canvas.html', current: 'canvas' };

const FOOTER_GROUPS = [
  {
    title: 'Produto',
    links: [
      { label: 'Aplicar AIMA', href: 'canvas.html' },
      { label: 'AIMA em 5 minutos', href: 'como-usar.html#5-minutos' },
      { label: 'Exemplos', href: 'exemplos.html' }
    ]
  },
  {
    title: 'Método',
    links: [
      { label: 'O método AIMA', href: 'aima.html' },
      { label: 'Labs', href: 'labs.html' },
      { label: 'Reference (léxico)', href: 'reference.html' },
      { label: `Sobre · Release ${edition.version}`, href: 'sobre.html' }
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
      <a class="brand" href="${base}index.html" aria-label="AIMA 2.0 — início"><span class="brand-mark">AIMA</span><span class="brand-version">2.0</span></a>
      <nav class="nav" id="site-nav" aria-label="Navegação principal">${navLinks}${ctaLink}</nav>
      <button class="menu-button" type="button" aria-label="Abrir menu" aria-expanded="false" aria-controls="site-nav">Menu</button>
    </header>`);

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
