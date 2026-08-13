# AIMA Agentic QE

> Laboratório de Quality Engineering orientado por agentes que transforma uma mudança declarada em riscos, estratégia de testes, evidências ausentes e uma recomendação de release auditável.

O projeto explora a transição de *AI-assisted testing* para **Agentic Quality Engineering**: o objetivo não é gerar testes indiscriminadamente, mas responder se há evidências suficientes para confiar em uma mudança.

## O que o MVP faz

O comando `analyze-pr` recebe um arquivo JSON que descreve uma mudança. Ele então:

1. valida o contexto fornecido;
2. seleciona o framework AIMA **Risk-Based Testing** pelo registry;
3. identifica sinais de risco a partir dos arquivos declarados;
4. recomenda verificações priorizadas;
5. declara incertezas e evidências ausentes;
6. calcula um **Quality Confidence** experimental e explicável;
7. gera relatórios JSON e Markdown com recomendação `GO`, `GO WITH RISKS` ou `NO-GO`.

O fluxo é deliberadamente determinístico e offline. Ele **não** acessa PRs remotos, não usa LLM, não executa testes de uma aplicação externa e não publica comentários. Essas integrações pertencem a incrementos posteriores, quando houver uma implementação real para sustentá-las.

## Demonstração

Requer Node.js 20 ou superior. Não há dependências externas.

```bash
npm test
node src/cli.js analyze-pr \
  --change examples/payment-refactor.change.json \
  --out reports
```

Saída resumida do cenário sintético:

```text
AIMA Agentic QE: NO-GO
Quality Confidence experimental: <score>/100
```

Os relatórios gerados são:

- `reports/aima-quality-report.json`
- `reports/aima-quality-report.md`

## Exemplo de entrada

```json
{
  "id": "DEMO-PR-482",
  "summary": "Refatoração do fluxo de autorização de pagamentos",
  "changedFiles": ["src/payments/authorization.js"],
  "businessImpact": "high",
  "technicalComplexity": "high",
  "knownUnknowns": ["Não foi fornecido resultado de teste de carga."]
}
```

## Framework Registry AIMA

Os frameworks AIMA são dados estruturados em [`aima/frameworks`](aima/frameworks), com objetivo, entradas, processo, saídas, agentes e ferramentas recomendadas. O MVP usa arquivos YAML compatíveis com JSON para não introduzir dependência de parser; a migração para YAML completo será justificada quando o registry exigir sintaxe mais rica.

```text
Contexto declarado
       ↓
Framework AIMA selecionado
       ↓
Riscos + evidências + incertezas
       ↓
Estratégia de testes
       ↓
Quality Confidence experimental
       ↓
Recomendação de release
```

## Qualidade e segurança de agentes

- Recomendações distinguem fatos declarados, inferências e incertezas.
- O relatório estabelece o limite das evidências antes de apresentar qualquer decisão.
- O score é experimental: não é uma métrica científica nem aprovação automática.
- O projeto não contém credenciais, dados de clientes ou integrações externas.
- As regras de autonomia e evolução estão em [AGENTS.md](AGENTS.md).

## Avaliações

O diretório [`evals/golden`](evals/golden) contém expectativas conhecidas para o cenário de pagamento. Os testes verificam seleção de framework, categorias de risco, recomendação e limite de evidência, evitando que a ferramenta passe a inventar contexto.

## Arquitetura

```text
src/
  change-input      entrada e validação
  framework-registry registry AIMA extensível
  risk-engine       hipóteses de risco determinísticas
  strategy          verificações e recomendação
  report            relatório e rastreabilidade

aima/frameworks/    frameworks como dados
examples/           mudanças sintéticas
evals/golden/       resultados esperados
tests/              testes do fluxo ponta a ponta
```

## Roadmap

- **MVP 0 (atual):** CLI, registry, avaliação de risco e relatório determinístico.
- **MVP 1:** adaptador autorizado para PRs do GitHub e análise de diffs reais.
- **MVP 2:** execução de testes, coleta de evidências e análise de falhas.
- **MVP 3:** orquestração multiagente, permissões e dashboard.

## Limitações

- Os sinais de risco dependem integralmente da mudança declarada.
- Não há LLM, memória persistente, MCP nem provider externo nesta versão.
- A recomendação de release requer revisão humana e evidências de execução no sistema alvo.

## Licença

[MIT](LICENSE)
