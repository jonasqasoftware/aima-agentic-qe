# Changelog

## Em desenvolvimento

- Documentação viva com diagrama Mermaid, modelo de decisão de qualidade e ADR inicial.
- Guia de uso orientado a tarefas, com exemplos de entrada, fluxo visual e solução de problemas.
- Adaptador de diff Git local que transforma nomes de arquivos alterados em contexto de análise, sem ler conteúdo ou serviços remotos.
- Ledger de evidências no relatório, separando fatos, inferências determinísticas e informações `UNKNOWN`.
- Relatório HTML autocontido, com painel visual de riscos, recomendação e ledger auditável.
- Política de release JSON versionada e opção `--policy` para governar recomendações de modo explícito.
- Suporte a evidências declaradas na entrada, preservadas no ledger como não verificadas.
- Exportação SARIF 2.1.0 para interoperabilidade com ferramentas de análise, sem upload automático.
- Comparação opcional com relatório baseline para destacar riscos novos, resolvidos e variação de confiança.
- Artefatos locais de evidência com hash SHA-256 no ledger, mantendo resultado de teste como não confiado automaticamente.
- Gate de CI opcional via `--fail-on`, que preserva relatórios antes de retornar falha.
- Execução manual do GitHub Actions com escolha do modo de gate e preservação de artefatos após falha.
- Manifesto SHA-256 e comando `verify-report` para verificar integridade dos relatórios gerados.
- Framework Data Quality Validation no registry, selecionado para superfícies de schema, migração, banco ou dados.
- Runner de avaliação golden integrado a `npm run check` para detectar regressões nas regras determinísticas.
- Dashboard HTML local para consolidar confiança, recomendações, políticas e riscos de vários relatórios.
- Opção `--include-stats` para registrar estatísticas de linhas do diff Git local como fatos auditáveis.
- Adaptador autorizado de PR do GitHub via CLI, com metadados, nomes de arquivos e checks de CI como evidência remota rastreável.

## 0.1.0

- CLI determinístico para análise de mudança declarada.
- Framework Registry com Risk-Based Testing.
- Relatório de riscos, estratégia, incertezas e recomendação de release.
