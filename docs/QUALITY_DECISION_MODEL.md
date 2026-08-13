# Modelo de decisão de qualidade

## Objetivo

Transformar uma mudança declarada em uma recomendação de release explicável, sem confundir ausência de evidência com evidência de ausência de risco.

```mermaid
flowchart TD
  Context["Contexto declarado"] --> Classification["Classificação de impacto e complexidade"]
  Classification --> Signals["Sinais de risco"]
  Signals --> Evidence["Evidências fornecidas\ne ausentes"]
  Evidence --> Confidence["Quality Confidence\nexperimental"]
  Confidence --> Recommendation{"Recomendação"}
  Recommendation -->|"GO"| Go["Risco residual aceitável\npara revisão humana"]
  Recommendation -->|"GO WITH RISKS"| Risks["Riscos explícitos\ne plano de mitigação"]
  Recommendation -->|"NO-GO"| NoGo["Evidências críticas ausentes\nou risco elevado"]
```

## Tipos de afirmação

| Tipo | Definição | Exemplo no MVP |
| --- | --- | --- |
| Fato | Informação entregue na entrada | `businessImpact: high` |
| Inferência | Resultado de regra determinística sobre fatos | Arquivo de pagamento gera sinal financeiro |
| Hipótese | Possibilidade ainda não comprovada | Uma alteração pode exigir teste de carga |
| Recomendação | Próxima ação proposta a uma pessoa responsável | Executar teste de carga antes do release |
| `UNKNOWN` | Informação necessária que não está disponível | Resultado de teste de carga não fornecido |

## Limites do score

O **Quality Confidence** é uma visualização de cobertura de evidências e risco declarado. Ele é experimental, não prediz defeitos e não autoriza deploys. Uma recomendação `GO` continua exigindo validação humana e governança do produto.

## Evolução segura

Antes de alterar regras, acrescente ou atualize um cenário em `evals/golden` e teste o resultado esperado. Quando uma regra passar a depender de dados externos, registre a permissão, a origem da evidência e a degradação esperada em caso de indisponibilidade.
