# AIMA Agentic QE

> Laboratório de Quality Engineering orientado por agentes que transforma uma mudança declarada em riscos, estratégia de testes, evidências ausentes e uma recomendação de release auditável.

O projeto explora a transição de *AI-assisted testing* para **Agentic Quality Engineering**: o objetivo não é gerar testes indiscriminadamente, mas responder se há evidências suficientes para confiar em uma mudança.

## O que o MVP faz

O comando `analyze-pr` recebe um arquivo JSON que descreve uma mudança. Ele então:

1. valida o contexto fornecido;
2. seleciona um framework AIMA pelo registry, incluindo **Risk-Based Testing** e **Data Quality Validation**;
3. identifica sinais de risco a partir dos arquivos declarados;
4. recomenda verificações priorizadas;
5. declara incertezas e evidências ausentes;
6. calcula um **Quality Confidence** experimental e explicável;
7. gera relatórios JSON, Markdown, HTML e SARIF com recomendação `GO`, `GO WITH RISKS` ou `NO-GO`.

Além do JSON declarado, o MVP também pode criar esse contexto a partir dos **nomes de arquivos** entre duas referências de um repositório Git local. Ele não lê conteúdo de diff, nem consulta GitHub remoto.

A recomendação é governada por uma [política de release versionada](aima/policies/evidence-aware-release.json), que pode ser substituída via `--policy` para refletir regras mais restritivas do produto.

Use `--baseline <aima-quality-report.json>` para comparar riscos e confiança com uma análise anterior, mantendo a comparação limitada ao que cada relatório declarou.

Para pipelines, `--fail-on no-go` converte a recomendação em gate de CI opcional, sem deixar de gerar os relatórios de diagnóstico.

O workflow do GitHub Actions pode ser disparado manualmente com a escolha do modo de gate, mantendo push e pull request no modo informativo.

O fluxo é deliberadamente determinístico e offline. Ele **não** acessa PRs remotos, não usa LLM, não executa testes de uma aplicação externa e não publica comentários. Essas integrações pertencem a incrementos posteriores, quando houver uma implementação real para sustentá-las.

## Demonstração

Requer Node.js 20 ou superior. Não há dependências externas.

```bash
npm test
node src/cli.js analyze-pr \
  --change examples/payment-refactor.change.json \
  --out reports
```

Para analisar a superfície de arquivos de um diff local:

```bash
node src/cli.js analyze-diff \
  --repo /caminho/do/repositorio \
  --base main \
  --impact high \
  --complexity medium \
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
- `reports/aima-quality-report.html` — painel visual, portátil e sem dependências externas
- `reports/aima-quality-report.sarif` — formato interoperável para ferramentas de análise
- `reports/aima-quality-report.manifest.json` — hashes SHA-256 para verificar integridade do pacote

Para um passo a passo com cenário, comandos, leitura do relatório e resolução de erros, consulte o [Guia de uso](docs/USAGE.md).

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

| Sinal na superfície declarada | Framework selecionado |
| --- | --- |
| Arquivos de aplicação sem dados, schema ou migração | Risk-Based Testing |
| `migration`, `schema`, `database` ou `data` no caminho do arquivo | Data Quality Validation |

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
- Evidências fornecidas por pessoas são registradas como declaradas e não verificadas.
- Artefatos locais de evidência podem ser identificados por SHA-256, sem confiança automática no resultado declarado.
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

A arquitetura executável, seus contratos e diagramas estão em [ARCHITECTURE.md](ARCHITECTURE.md). As decisões de qualidade e os limites da recomendação estão em [docs/QUALITY_DECISION_MODEL.md](docs/QUALITY_DECISION_MODEL.md).

## Documentação viva

Este repositório usa Markdown, Mermaid e ADRs (*Architecture Decision Records*) para manter o raciocínio técnico perto do código:

- [Guia de documentação](docs/DOCUMENTATION.md): o que atualizar a cada mudança;
- [Guia de uso](docs/USAGE.md): caminho rápido e exemplos de operação;
- [Modelo de decisão de qualidade](docs/QUALITY_DECISION_MODEL.md): como o relatório chega à recomendação;
- [ADRs](docs/adr): decisões arquiteturais duráveis e seus trade-offs.

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
