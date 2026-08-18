# Roadmap

## Concluído

- **MVP 0:** análise determinística de mudança declarada, registry AIMA, riscos, estratégia e relatórios auditáveis.
- **MVP 1:** adaptadores de diff Git local e de PRs do GitHub por leitura autorizada do GitHub CLI.
- **MVP 2:** execução estruturada de evidências, importadores JUnit/JSON/LCOV, correlação de cobertura, manifesto e relatório no GitHub Actions.

## MVP 3: em andamento

- Interface web local para iniciar análise de entrada declarada sem depender diretamente da CLI.
- Evolução do dashboard local para navegação de histórico e comparação de execuções.
- Governança explícita de permissões para novas integrações, mantendo operações externas de escrita sob aprovação humana.
- Expansão de agentes somente quando houver uma etapa real que não seja resolvida por regras determinísticas e evidências rastreáveis.

Cada novo marco deve preservar autonomia limitada, incertezas explícitas, evidências rastreáveis e aprovação humana para escritas externas. O resumo público dos marcos também está no [README](README.md#roadmap).
