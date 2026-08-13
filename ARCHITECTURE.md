# Arquitetura

O MVP implementa uma fatia vertical, não uma plataforma completa. O CLI coordena módulos determinísticos: entrada, registry, risco, estratégia e relatório.

## Decisões

| Decisão | Motivo | Limite atual |
| --- | --- | --- |
| Node.js sem dependências | Execução simples e reprodutível | Não há parser YAML completo; os arquivos usam subconjunto JSON compatível. |
| Framework Registry | Evita hardcode de metodologias AIMA | Só há um framework inicial. |
| Sinais de risco explícitos | Evita alegações de análise mágica ou leitura remota | Não substitui análise de diff real. |
| Quality Confidence explicável | Mostra trade-offs e incertezas | Métrica experimental, não preditiva. |

O próximo adaptador deve implementar leitura autorizada de um diff real antes de adicionar novos agentes ou LLMs.
