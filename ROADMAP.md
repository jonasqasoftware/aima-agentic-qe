# Roadmap

## Concluído

- **MVP 0:** análise determinística de mudança declarada, registry AIMA, riscos, estratégia e relatórios auditáveis.
- **MVP 1:** adaptadores de diff Git local e de PRs do GitHub por leitura autorizada do GitHub CLI.
- **MVP 2:** execução estruturada de evidências, importadores JUnit/JSON/LCOV, correlação de cobertura, manifesto e relatório no GitHub Actions.
- **MVP 3:** interface local, geração de pacotes de relatório, dashboard de histórico e tendências, e política operacional de permissões.

## Em andamento: MVP 4

Já entregue:

- Adaptador MCP local e somente leitura ([`integrations/mcp`](integrations/mcp)).
- Core browser-portable e análise pública executada no navegador (`site/analyze.html`).
- Evolução da camada pública e da arquitetura de informação do site.
- Metadata editorial canônica da Preview Edition (`site/edition.mjs`), com validação determinística contra drift antes da publicação no GitHub Pages.

Pendente:

- Integrações autorizadas de escrita orientadas por evidências, com escopo mínimo e aprovação humana explícita.
- Expansão de agentes somente quando houver uma etapa real que não seja resolvida por regras determinísticas e evidências rastreáveis.

Cada novo marco deve preservar autonomia limitada, incertezas explícitas, evidências rastreáveis e aprovação humana para escritas externas. O resumo público dos marcos também está no [README](README.md#roadmap).
