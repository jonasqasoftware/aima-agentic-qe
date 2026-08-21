# ADR 0003: Metadata canônica da Preview Edition

- **Estado:** aceito
- **Data:** 2026-08-21

## Contexto

O site público do AIMA 2.0 exibe uma "Preview Edition 0.9" com contadores editoriais (28 conceitos, 20 frameworks, 20 diagramas). Antes desta decisão, esses valores apareciam como texto literal, repetidos em `site/index.html`, `site/preview.html`, `site/layout.mjs`, `site/framework.mjs` e `site/insight.mjs`, sem nenhuma fonte única — cada ponto podia divergir dos demais sem que nada detectasse a inconsistência. `package.json` tem sua própria versão técnica (`0.2.0`), sem nenhuma relação com a versão editorial da Preview Edition; os ciclos de evolução das duas não precisam coincidir, e derivar uma da outra criaria um acoplamento semântico indevido entre a versão do pacote npm e a maturidade editorial do método publicado.

## Decisão

`site/edition.mjs` passa a ser a fonte canônica da metadata editorial da Preview Edition. Ele exporta um único objeto `edition` com seis campos: `label`, `version` e `status` são declarativos (editados manualmente, não podem ser derivados de nenhuma outra fonte); `frameworksCount`, `conceptsCount` e `diagramsCount` são derivados computando `.length` sobre os arrays já existentes em `site/content.mjs` (`frameworks`, `lexicon`), nunca duplicados como literais.

`edition.mjs` só pode depender de `./content.mjs`. Não importa `package.json`, `node:fs`, `node:fs/promises` nem qualquer outra fonte externa de versionamento — essa ausência de acoplamento é protegida estruturalmente pela inspeção das declarações de import do arquivo em `scripts/check-site.mjs`, e não apenas por convenção documentada.

Os consumidores em JavaScript (`site/layout.mjs`, `site/framework.mjs`, `site/insight.mjs`) usam `edition.version` diretamente, interpolado nos templates que já geravam. `site/app.mjs` hidrata, via `textContent`, os atributos `data-edition-label`, `data-edition-version`, `data-edition-frameworks-count`, `data-edition-concepts-count` e `data-edition-diagrams-count` presentes no corpo de `index.html` e `preview.html` — cada atributo já carrega o valor correto como fallback estático, então a página permanece correta mesmo sem JavaScript.

O `<head>` de `index.html` e `preview.html` (title, meta description, Open Graph) e algumas representações no corpo — o badge "PREVIEW EDITION" em maiúsculo e o `aria-label` do bloco de métricas — permanecem estáticos: o primeiro para disponibilizar a metadata diretamente no HTML inicial, sem depender de execução de JavaScript; o segundo por preservar uma forma (maiúsculo) que `edition.label` não tem; o terceiro por ser um atributo HTML, não conteúdo de `textContent`. Nenhuma dessas representações é fonte autoritativa; todas são validadas contra `edition.mjs`.

`scripts/check-site.mjs` é o enforcement determinístico do contrato: valida o formato de `edition.version`, o valor de `edition.label`, o conjunto permitido de `edition.status`, a igualdade entre os contadores derivados e `frameworks.length`/`lexicon.length`, a independência estrutural do grafo de imports de `edition.mjs`, a metadata do `<head>` tag a tag, a contagem e o fallback de cada atributo `data-edition-*` dentro do `<body>`, o badge maiúsculo, o `aria-label`, a ausência de versão hardcoded reintroduzida nos consumidores, e a identidade byte-a-byte entre `dist/site/edition.mjs` e a fonte após o build. `npm run check:site` executa o build e todas essas validações numa única chamada; `.github/workflows/pages.yml` roda esse comando antes de publicar, então uma inconsistência editorial bloqueia o deploy em vez de gerar apenas um aviso.

Esta decisão vale exclusivamente para a metadata editorial do site público. Ela não altera nem redefine o Risk Engine, a estratégia de testes, a política de recomendação GO / GO WITH RISKS / NO-GO, o adaptador MCP, `package.json`, `aima/frameworks/**` ou a política de release do core executável. A metadata da Preview Edition permanece uma preocupação da camada editorial do site e não se torna fonte de comportamento para o core determinístico.

## Alternativas consideradas

### A. Usar `package.json.version` como versão da Preview Edition

Rejeitada. Misturaria a versão técnica do pacote com a versão editorial do método publicado, criando um acoplamento semântico indevido: um bump de versão do npm (motivado por mudanças no CLI, no core determinístico ou em dependências internas) passaria a implicar, sem intenção, uma nova edição da Preview.

### B. Manter os valores hardcoded em HTML/JS

Rejeitada. Era o estado anterior a este PR: múltiplas fontes autoritativas (cada arquivo com sua própria cópia do texto), sem nenhum mecanismo capaz de detectar divergência entre elas. O design atual ainda mantém representações estáticas deliberadas no HTML (o `<head>`, o badge maiúsculo, o `aria-label`) — a diferença é que elas deixam de ser autoritativas: passam a ser fallbacks/metadata validados contra `edition.mjs` por `scripts/check-site.mjs`, não fontes independentes.

### C. Gerar todo o HTML dinamicamente durante o build

Considerada, mas rejeitada para este PR. Eliminaria a necessidade de qualquer representação estática duplicada — inclusive no `<head>` — mas exigiria introduzir um mecanismo de templating/geração de HTML que o projeto não tem hoje (`site/` é HTML estático consumido por módulos ESM simples, sem bundler nem SSG). Isso não é uma rejeição do valor da ideia em absoluto: é uma avaliação de que o problema atual (drift entre valores editoriais) não exige esse aumento de complexidade e escopo para ser resolvido.

### D. Arquivo de dados dedicado (`site/edition.json`)

Considerada. Seria simples e neutro em formato, mas os contadores derivados (`frameworksCount`, `conceptsCount`, `diagramsCount`) precisariam ser calculados em algum outro lugar — no build, duplicados manualmente, ou por uma camada adicional de enriquecimento — porque um JSON estático não pode importar `content.mjs` e computar `.length` sozinho. `edition.mjs` como módulo ESM permite essa derivação diretamente, no mesmo formato que `site/content.mjs` já usa, sem introduzir uma segunda infraestrutura de dados no site.

## Consequências

### Positivas

- Um único ponto para editar `label`, `version` e `status` da Preview Edition.
- Os contadores de frameworks/conceitos/diagramas acompanham `site/content.mjs` automaticamente, sem edição manual.
- Menor risco de drift: divergências cobertas pelo contrato editorial passam a falhar `npm run check:site`, em vez de permanecer silenciosamente inconsistentes.
- O HTML continua correto sem JavaScript (fallback estático) e o `<head>` continua disponível para SEO/social preview sem depender de hidratação.
- `.github/workflows/pages.yml` bloqueia o deploy antes de publicar uma inconsistência, em vez de publicá-la e descobrir depois.
- Nenhuma dependência nova: `edition.mjs` é ESM puro, `check-site.mjs` usa só `node:fs`/`node:path` e regex já no padrão do arquivo.
- Nenhum acoplamento com o core determinístico de QE: `edition.mjs` não é lido por `src/`, `aima/frameworks/**` nem pelo adaptador MCP.

### Negativas

- Ainda existem representações estáticas duplicadas deliberadamente no HTML (`<head>`, badge maiúsculo, `aria-label`) — a duplicação física não foi eliminada, só passou a ser verificada.
- Essas duplicações exigem manutenção humana quando a edição muda: atualizar `edition.mjs` sozinho não propaga automaticamente para o `<head>` nem para o badge maiúsculo, só faz `check-site.mjs` detectar se alguém esquecer de atualizá-los.
- Todo o enforcement depende de `scripts/check-site.mjs` continuar sendo executado — ele não roda sozinho fora de `npm run check`/`npm run check:site`.
- Parte da validação estrutural (grafo de imports de `edition.mjs`, extração de atributos `data-edition-*`, extração de `<head>`/`<body>`) usa regex textual sobre o código-fonte, não um parser AST/HTML completo; é uma aproximação deliberada, documentada como tal no próprio `check-site.mjs`, não um parser geral.
- O conjunto esperado de ocorrências de cada atributo `data-edition-*` por página é explicitamente declarado em `scripts/check-site.mjs` (`EXPECTED_EDITION_HOOK_COUNTS`) e precisa ser atualizado manualmente se o markup editorial mudar de forma intencional.

## Próximo passo

Formalizar a Preview Edition como tag Git ou GitHub Release, caso o projeto decida fazer isso no futuro, exige `contents: write` e conta como escrita externa — só poderá ser adicionado após uma decisão explícita de autorização humana por ação, seguindo o mesmo modelo já usado por `write-local-report` na política de permissões e pelo adaptador MCP no ADR 0002.
