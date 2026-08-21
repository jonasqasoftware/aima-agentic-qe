# AIMA 2.0 — site público

Esta pasta contém a camada pública e editorial do AIMA 2.0.

## Objetivo

Separar a apresentação pública do método do núcleo executável do repositório, mantendo ambos versionados no mesmo projeto.

- `site/index.html` — conteúdo e estrutura da página pública;
- `site/styles.css` — sistema visual editorial;
- `site/app.mjs` — navegação mobile e filtros dos frameworks/léxico/insights na home;
- `site/layout.mjs` — header e footer compartilhados, injetados nas páginas de framework e insight;
- `site/edition.mjs` — fonte canônica da metadata editorial da Preview Edition (`label`, `version`, `status` e contadores derivados de `content.mjs`);
- `site/analyze.html`/`site/analyze.mjs` — análise do motor determinístico executada no navegador; `analyze.mjs` não contém nenhuma regra de negócio, apenas consome `analyzeChange`, copiado automaticamente do core (`src/`) durante o build — nunca duplicado manualmente aqui;
- `site/CNAME` — domínio pretendido `aima20.dev`.

## Fonte de conteúdo

A página foi reconstruída a partir da Preview Edition 0.9 e do Guia de Uso dos 20 Frameworks. A migração não copia HTML do antigo ChatGPT Site: o conteúdo passa a ser mantido diretamente no GitHub.

## Deploy

`site/` é a fonte estática; `src/` + `aima/` são o core e os dados canônicos. O workflow `.github/workflows/pages.yml` executa `npm run check:site`, que executa o build e valida o contrato editorial antes da publicação, e publica o artefato gerado, não `site/` diretamente:

```text
site/        = fonte estática
src/ + aima/ = core e dados canônicos
       ↓ npm run check:site (valida e constrói)
dist/site/   = artefato publicado no GitHub Pages
```

O deploy dispara em pushes para `main` que alterem o site, o core, os dados de `aima/`, o script de build ou o próprio workflow, além de permitir execução manual.

O repositório precisa estar configurado para usar **GitHub Actions** como fonte do GitHub Pages. O domínio personalizado também precisa ser confirmado nas configurações do GitHub Pages e no DNS do domínio; o arquivo `CNAME` sozinho não conclui essa configuração.

## Desenvolvimento local

Servir `site/` diretamente **não é suficiente** para `analyze.html`: `core/` e `generated/` só existem no artefato de build. Gere o build primeiro:

```bash
npm run build:site
cd dist/site
python3 -m http.server 8080
```

Depois acesse `http://localhost:8080`. `dist/` não é versionado (ver `.gitignore` na raiz) e é recriado a cada build.

## Princípio arquitetural

O diretório `site/` não deve incorporar regras de negócio do mecanismo AIMA. O núcleo técnico, frameworks estruturados, políticas, evals e relatórios continuam sendo mantidos nas áreas existentes do repositório. `site/analyze.mjs` é a única exceção aparente — ele *consome* o core (`analyzeChange`), mas não o define: a lógica em si só existe em `src/`, e o build a copia para `dist/site/core/` sem que `site/` precise manter uma cópia própria.
