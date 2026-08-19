# AIMA 2.0 — site público

Esta pasta contém a camada pública e editorial do AIMA 2.0.

## Objetivo

Separar a apresentação pública do método do núcleo executável do repositório, mantendo ambos versionados no mesmo projeto.

- `site/index.html` — conteúdo e estrutura da página pública;
- `site/styles.css` — sistema visual editorial;
- `site/app.mjs` — navegação mobile e filtros dos frameworks/léxico/insights na home;
- `site/layout.mjs` — header e footer compartilhados, injetados nas páginas de framework e insight;
- `site/CNAME` — domínio pretendido `aima20.dev`.

## Fonte de conteúdo

A página foi reconstruída a partir da Preview Edition 0.9 e do Guia de Uso dos 20 Frameworks. A migração não copia HTML do antigo ChatGPT Site: o conteúdo passa a ser mantido diretamente no GitHub.

## Deploy

O workflow `.github/workflows/pages.yml` publica o diretório `site/` no GitHub Pages em pushes para `main` que alterem o site, além de permitir execução manual.

O repositório precisa estar configurado para usar **GitHub Actions** como fonte do GitHub Pages. O domínio personalizado também precisa ser confirmado nas configurações do GitHub Pages e no DNS do domínio; o arquivo `CNAME` sozinho não conclui essa configuração.

## Desenvolvimento local

Como o site é estático, basta servir esta pasta com qualquer servidor HTTP local. Exemplo com Python:

```bash
python3 -m http.server 8080 --directory site
```

Depois acesse `http://localhost:8080`.

## Princípio arquitetural

O diretório `site/` não deve incorporar regras de negócio do mecanismo AIMA. O núcleo técnico, frameworks estruturados, políticas, evals e relatórios continuam sendo mantidos nas áreas existentes do repositório.
