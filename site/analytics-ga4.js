// Google Analytics 4 com consentimento prévio (ver docs/adr/0005).
//
// - Enquanto GA4_MEASUREMENT_ID estiver vazio, este arquivo não faz nada.
// - Só roda no domínio público (aima20.dev): localhost, prévias e testes não medem.
// - Nada do Google é carregado antes de o visitante clicar em "Aceitar".
//   "Recusar" fica guardado e o banner não volta.
// - O GoatCounter (sem cookies) continua contando todas as visitas, com ou sem aceite.
// - As páginas de ferramenta (analyze.html, assessment.html) não carregam este arquivo.
(function () {
  var GA4_MEASUREMENT_ID = '';
  var CONSENT_KEY = 'aima-ga-consent';
  var host = location.hostname;

  if (!/^G-[A-Z0-9]{4,}$/.test(GA4_MEASUREMENT_ID)) return;
  if (host !== 'aima20.dev' && host !== 'www.aima20.dev') return;

  function readConsent() {
    try { return localStorage.getItem(CONSENT_KEY); } catch (error) { return null; }
  }

  function saveConsent(value) {
    try { localStorage.setItem(CONSENT_KEY, value); } catch (error) { /* vale só nesta visita */ }
  }

  function loadGa4() {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA4_MEASUREMENT_ID);
    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA4_MEASUREMENT_ID);
    document.head.appendChild(script);
  }

  function showBanner() {
    var banner = document.createElement('section');
    banner.className = 'consent-banner';
    banner.setAttribute('aria-label', 'Consentimento de cookies');
    banner.innerHTML =
      '<p>Posso usar o Google Analytics (com cookies) para entender quais conteúdos são úteis? ' +
      'Sem o seu aceite, só conto visitas de forma anônima e sem cookies.</p>' +
      '<div class="consent-actions">' +
      '<button type="button" class="button button-primary" data-consent="granted">Aceitar</button>' +
      '<button type="button" class="button button-secondary" data-consent="denied">Recusar</button>' +
      '</div>';
    banner.addEventListener('click', function (event) {
      var choice = event.target && event.target.getAttribute('data-consent');
      if (!choice) return;
      saveConsent(choice);
      banner.remove();
      if (choice === 'granted') loadGa4();
    });
    document.body.appendChild(banner);
  }

  var consent = readConsent();
  if (consent === 'granted') {
    loadGa4();
  } else if (consent !== 'denied') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', showBanner);
    } else {
      showBanner();
    }
  }
})();
