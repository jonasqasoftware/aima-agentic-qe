# Documentação viva

Este projeto trata documentação como parte do produto. Toda afirmação deve ser verificável pelo código, pelos testes ou por uma fonte explicitamente indicada.

## Padrões usados

| Artefato | Finalidade | Quando atualizar |
| --- | --- | --- |
| `README.md` | Proposta de valor, início rápido e limites públicos | Quando o uso, escopo ou resultado mudar |
| `ARCHITECTURE.md` | Fluxo atual, componentes e contratos | Quando módulos ou integrações mudarem |
| `docs/QUALITY_DECISION_MODEL.md` | Explicação da decisão de release | Quando risco, evidência ou score mudar |
| `docs/adr/` | Decisões relevantes e trade-offs | Antes ou junto de mudanças difíceis de reverter |
| `ROADMAP.md` e `CHANGELOG.md` | Próximos passos e histórico | Ao planejar ou concluir uma entrega |

## Regras de escrita

1. Diferencie **fato**, **inferência**, **hipótese** e **recomendação**.
2. Nomeie incertezas como `UNKNOWN`; não as transforme em evidência.
3. Use diagramas Mermaid para fluxos com mais de dois componentes.
4. Descreva o comportamento entregue, não a intenção futura, no presente.
5. Prefira links para código, testes e contratos a explicações duplicadas.

## Checklist de pull request

- [ ] O README ainda permite executar o caminho principal?
- [ ] A arquitetura corresponde ao fluxo executável?
- [ ] Novos campos, regras e relatórios foram documentados?
- [ ] Uma decisão arquitetural relevante recebeu ADR?
- [ ] O changelog registra mudança visível para usuários ou contribuidores?

## Convenção de ADR

Arquivos em `docs/adr` seguem `NNNN-titulo-curto.md`. Cada ADR possui contexto, decisão, consequências e estado. ADRs são aditivos: uma decisão substituída é marcada como substituída, sem apagar seu histórico.
