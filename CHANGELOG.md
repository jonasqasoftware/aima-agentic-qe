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

## 0.1.0

- CLI determinístico para análise de mudança declarada.
- Framework Registry com Risk-Based Testing.
- Relatório de riscos, estratégia, incertezas e recomendação de release.
