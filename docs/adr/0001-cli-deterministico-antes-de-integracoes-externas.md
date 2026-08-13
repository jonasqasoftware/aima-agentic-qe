# ADR 0001: CLI determinístico antes de integrações externas

- **Estado:** aceito
- **Data:** 2026-08-13

## Contexto

O AIMA Agentic QE pretende apoiar decisões de qualidade com agentes e, futuramente, integrações de pull request, execução de testes e modelos de linguagem. Introduzir essas integrações antes de estabelecer contratos, evidências e testes tornaria os resultados difíceis de reproduzir e auditar.

## Decisão

O primeiro MVP é um CLI offline e determinístico. Ele recebe apenas uma mudança explicitamente declarada, seleciona um framework estruturado, aplica regras de risco e produz uma recomendação explicável. Não realiza leituras ou escritas externas.

## Consequências

### Positivas

- Execução reproduzível em ambiente local e CI.
- Testes golden podem validar o comportamento end-to-end.
- Limites de evidência ficam claros desde o início.

### Negativas

- A entrada depende de contexto manual ou sintético.
- Não há análise de diff real, coleta de evidências ou automação de comentários.

## Próximo passo

Um adaptador de pull request só poderá ser adicionado após definir autorização, origem dos dados, tratamento de falha e testes que comprovem que o relatório não inventa evidências remotas.
