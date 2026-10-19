// Aplica o tema salvo antes da primeira pintura, para não piscar.
// Padrão: escuro. "light" só quando o visitante escolheu o tema claro.
// localStorage pode estar bloqueado (aba privada, política do navegador): falha em silêncio.
(function () {
  try {
    if (localStorage.getItem('aima-theme') === 'light') document.documentElement.dataset.theme = 'light';
  } catch (error) { /* mantém o tema escuro */ }
})();
