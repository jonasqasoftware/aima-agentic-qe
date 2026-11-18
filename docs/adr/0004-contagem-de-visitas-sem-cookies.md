# ADR 0004: Contagem de visitas do site público sem cookies

- **Estado:** aceito
- **Data:** 2026-11-18

## Contexto

O site `aima20.dev` é publicado no GitHub Pages, que não oferece logs de acesso nem estatísticas de visitas. Sem nenhuma medição, não é possível saber quantas pessoas chegam ao site, de onde vêm, nem se um link com parâmetros de campanha (`utm_source`, `utm_medium`, `utm_campaign`) gerou visitas. O site também declara que o Analisador e o Assessment rodam no navegador e não enviam dados — essa promessa precisa continuar verdadeira.

## Decisão

As páginas editoriais do site carregam o contador do [GoatCounter](https://www.goatcounter.com) (serviço hospedado, código aberto, sem cookies), com a tag fixa:

```html
<script data-goatcounter="https://jonasdaviladasilva.goatcounter.com/count" async src="https://gc.zgo.at/count.v5.js" integrity="sha384-…" crossorigin="anonymous"></script>
```

- O script é versionado (`count.v5.js`) e protegido por SRI: se o arquivo servido mudar, o navegador não o executa.
- O GoatCounter não grava cookies nem guarda o IP; registra caminho, referência, tamanho de tela e os parâmetros de campanha (`utm_campaign`/`campaign` e `utm_source`/`ref`/`source`), exibidos no widget *Campaigns*.
- `analyze.html` e `assessment.html` **não** carregam o contador. A promessa "nada sai do navegador" das ferramentas permanece literal, e `checkNoNetworkApi` continua valendo para `analyze.mjs` e `assessment.mjs`.
- O contador ignora `localhost` e redes privadas, então desenvolvimento local e a suíte `integrations/site-quality` não geram visitas.
- `scripts/check-site.mjs` exige a tag exata, uma vez, em toda página editorial; proíbe o contador nas duas páginas de ferramenta; e recusa outros provedores de analytics. Qualquer desvio bloqueia o deploy.
- A seção "Transparência" da home passa a declarar a contagem anônima de visitas.

## Alternativas consideradas

- **Google Analytics 4:** usa cookies e identificadores, exige banner de consentimento sob a LGPD e é mais pesado. Rejeitada.
- **Plausible:** sem cookies e com UTMs nativas, mas pago. Viável se o volume crescer.
- **Cloudflare Web Analytics:** gratuito e sem cookies, mas não separa visitas por parâmetro de campanha.
- **Vercel Web Analytics:** exige hospedar na Vercel; o site está no GitHub Pages.
- **Umami auto-hospedado:** sem custo de licença, mas exige operar servidor e banco. Desproporcional para o volume atual.

## Consequências

- A contagem usa a conta `jonasdaviladasilva` do GoatCounter. Se a conta deixar de existir, as chamadas falham em silêncio, sem afetar o site.
- Bloqueadores de anúncio podem impedir a contagem: o número é um piso, não o total.
- Reverter é remover a tag das páginas e a verificação em `scripts/check-site.mjs`.
