# ADR 0005: Google Analytics 4 com consentimento prévio

- **Estado:** aceito
- **Data:** 2026-11-18
- **Complementa:** [ADR 0004](0004-contagem-de-visitas-sem-cookies.md)

## Contexto

O GoatCounter (ADR 0004) conta visitas e campanhas sem cookies. O Jonas quer também o Google Analytics 4, para ter no aima20.dev o mesmo painel que usa no portfólio (`jonasdavila.com.br`). O ADR 0004 rejeitou o GA4 como contador único porque ele grava cookies e, sob a LGPD, precisa de consentimento. Em 18/11 o Jonas decidiu: GA4 nos dois sites, **só depois do aceite** do visitante, com o GoatCounter mantido.

## Decisão

- As páginas editoriais carregam `site/analytics-ga4.js` (uma vez, `defer`). `analyze.html` e `assessment.html` não carregam.
- O arquivo não faz nada enquanto `GA4_MEASUREMENT_ID` estiver vazio, nem fora de `aima20.dev`/`www.aima20.dev` (localhost, prévias e a suíte `integrations/site-quality` não medem nem mostram o banner).
- Sem escolha registrada, mostra um banner com **Aceitar** e **Recusar**. Nada do Google é carregado antes do aceite. A escolha fica em `localStorage` (`aima-ga-consent`); "Recusar" não volta a perguntar.
- Com o aceite, carrega `gtag.js` com o ID configurado. O GA4 lê `utm_source`, `utm_medium` e `utm_campaign` da URL sem configuração extra.
- O GoatCounter continua em todas as páginas editoriais, com ou sem aceite.
- `scripts/check-site.mjs` exige a tag nas páginas editoriais, proíbe nas ferramentas, valida o formato do ID e garante que `loadGa4()` só é chamado nos dois pontos de aceite.

## Ativação

1. Colar o ID de medição (`G-XXXXXXX`) em `GA4_MEASUREMENT_ID`, em `site/analytics-ga4.js`.
2. No mesmo PR, atualizar a linha "Análise local" da seção Transparência da home para citar o GA4 com aceite, e regerar o snapshot visual da home.

## Consequências

- Os números do GA4 serão menores que os do GoatCounter (só quem aceita entra); o GoatCounter segue como total de referência.
- Para revogar o aceite, hoje o visitante limpa os dados do site no navegador. Um link "Preferências de cookies" no rodapé fica como melhoria.
- Reverter é remover a tag das páginas, o arquivo e a verificação em `scripts/check-site.mjs`.
