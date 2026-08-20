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

Além do JSON declarado, o MVP também pode criar esse contexto a partir dos **nomes de arquivos** entre duas referências de um repositório Git local ou dos metadados autenticados de um PR por meio do GitHub CLI. Nenhum dos adaptadores lê conteúdo de diff.

A recomendação é governada por uma [política de release versionada](aima/policies/evidence-aware-release.json), que pode ser substituída via `--policy` para refletir regras mais restritivas do produto.

Use `--baseline <aima-quality-report.json>` para comparar riscos e confiança com uma análise anterior, mantendo a comparação limitada ao que cada relatório declarou.

Para pipelines, `--fail-on no-go` converte a recomendação em gate de CI opcional, sem deixar de gerar os relatórios de diagnóstico.

`dashboard --reports <diretório>` agrega relatórios locais em um painel HTML para acompanhamento de qualidade.

O workflow do GitHub Actions executa a suíte, gera um relatório baseado no manifesto de evidências e pode ser disparado manualmente com a escolha do modo de gate. Push e pull request permanecem no modo informativo por padrão.

O MVP 3 começa com uma interface web local para o cenário de entrada declarada. Execute `npm run serve` e abra o endereço exibido; ela usa o mesmo motor determinístico da CLI, fica em `127.0.0.1` e não executa comandos, lê repositórios nem envia dados ao GitHub. Pelo navegador, também é possível gerar localmente o pacote de relatório e abrir o dashboard dos relatórios acumulados.

O fluxo é deliberadamente determinístico. O adaptador de PR usa o GitHub CLI já autenticado para leitura autorizada de metadados e nomes de arquivos, sem transmitir segredos ou publicar comentários. Ele não usa LLM nem executa testes de uma aplicação externa.

No MVP 2 concluído, comandos estruturados fornecidos explicitamente podem ser executados como evidência local, e resultados JUnit, JSON e LCOV podem ser importados por um manifesto. AIMA não usa shell, preserva apenas código de saída e hash do transcript — nunca o log completo — e transforma falhas em risco alto. A execução e a cobertura não aprovam um release por si só.

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
  --include-stats \
  --impact high \
  --complexity medium \
  --out reports
```

Para analisar um PR real com leitura autorizada pelo GitHub CLI:

```bash
gh auth login -h github.com --web
node src/cli.js analyze-github-pr \
  --repo jonasqasoftware/aima-agentic-qe \
  --pr 1 \
  --impact medium \
  --complexity medium \
  --out reports
```

O comando consulta título, estado, branches, nomes dos arquivos e checks de CI disponíveis do PR. Conteúdo do diff, cobertura dos checks, aprovações e contexto de negócio permanecem explicitamente como incertezas no relatório. Uma falha de check cria um risco alto rastreável; sucesso nunca equivale a aprovação de release.

Para executar uma evidência local explicitamente declarada:

```bash
node src/cli.js analyze-pr \
  --change examples/payment-refactor.change.json \
  --execute-evidence examples/node-test.command.json \
  --out reports
```

O arquivo de comando contém `id`, `command` e `args`. A execução ocorre sem shell, com limite de 60 segundos e de 1 MiB de saída. O relatório registra somente o resultado, o código de saída e o hash SHA-256 do transcript.

Resultados JUnit/XML podem ser importados com `--junit`. O parser registra totais e nomes de casos com falha, mas não inclui mensagens de falha ou logs brutos no relatório.

```bash
node src/cli.js analyze-pr \
  --change examples/payment-refactor.change.json \
  --junit examples/test-results.junit.xml \
  --out reports
```

Para ferramentas que emitem JSON, use o contrato normalizado do AIMA com uma lista `tests` e status `passed`, `failed` ou `skipped`:

```bash
node src/cli.js analyze-pr \
  --change examples/payment-refactor.change.json \
  --test-results examples/test-results.json \
  --out reports
```

Cobertura de linhas LCOV pode ser anexada como evidência. Um limite só é aplicado quando informado explicitamente:

```bash
node src/cli.js analyze-pr \
  --change examples/payment-refactor.change.json \
  --lcov examples/coverage.lcov \
  --min-line-coverage 85 \
  --out reports
```

O AIMA não considera cobertura uma aprovação automática: ela é um sinal complementar, com hash do arquivo e limite declarado no relatório. Quando há arquivos de código alterados, o relatório correlaciona seus caminhos com o LCOV e destaca registros ausentes ou abaixo do limite; arquivos de documentação não entram nessa conta.

Para reunir execução, testes e cobertura em uma única análise, use `--evidence-manifest examples/evidence-manifest.json`. O manifesto é local e explícito; ele não usa shell, rede ou providers externos.

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
- A [política de operações](aima/policies/operation-permissions.json) separa análise permitida, escrita local iniciada pelo usuário, operações que exigem autorização humana e escritas externas proibidas.
- As regras de autonomia e evolução estão em [AGENTS.md](AGENTS.md).

## Avaliações

O diretório [`evals/golden`](evals/golden) contém expectativas conhecidas para o cenário de pagamento. `npm run evaluate` valida framework, categorias de risco, recomendação e limite de evidência; `npm run check` inclui essa avaliação e os testes, evitando regressões silenciosas nas regras.

## Adaptador MCP (opcional)

Um adaptador local [Model Context Protocol](https://modelcontextprotocol.io) em [`integrations/mcp`](integrations/mcp) expõe o mesmo motor determinístico a clientes MCP via stdio, como pacote Node isolado com suas próprias dependências — o `package.json` da raiz não é afetado. Ele é somente leitura: o resource `aima://frameworks` lista o registry completo, `aima://frameworks/{id}` lê um framework por id, e a tool `analyze_change` executa `analyzeDeclaredChange` e retorna o relatório completo, sem gravar arquivos. Toda operação passa pela mesma [política de permissões](aima/policies/operation-permissions.json) usada pela CLI. Veja [`integrations/mcp/README.md`](integrations/mcp/README.md) e o racional em [`docs/adr/0002-adaptador-mcp-stdio-isolado.md`](docs/adr/0002-adaptador-mcp-stdio-isolado.md).

## Arquitetura

```text
src/
  change-input, local-diff, github-pr
                    entradas declaradas, Git local e PR autorizado
  command-evidence, junit-results, json-test-results, lcov-coverage
                    evidências de execução, testes e cobertura
  evidence-manifest manifesto explícito que reúne evidências locais
  framework-registry registry AIMA extensível
  risk-engine, strategy
                    hipóteses, verificações e recomendação determinísticas
  report, evidence-ledger
                    relatórios e rastreabilidade auditável

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

- **MVP 0 — concluído:** CLI, registry, avaliação de risco e relatório determinístico.
- **MVP 1 — concluído:** adaptadores de diff Git local e de PRs do GitHub com leitura autorizada de metadados, arquivos e checks.
- **MVP 2 — concluído:** execução estruturada de evidências, importação de JUnit/JSON/LCOV, manifesto de evidências e geração do relatório também no CI.
- **MVP 3 — concluído:** interface web local, geração de pacotes de relatório, dashboard navegável com histórico e tendências, e governança explícita de permissões.
- **MVP 4 — em andamento:** adaptador MCP local e somente leitura ([`integrations/mcp`](integrations/mcp)) concluído; integrações autorizadas de escrita e comparação entre análises seguem pendentes, sempre preservando revisão humana e operações externas sob autorização explícita.

## Limitações

- Os sinais de risco dependem da mudança declarada ou dos metadados e nomes de arquivos fornecidos pelos adaptadores; o AIMA não lê o conteúdo do diff.
- A integração com GitHub é opcional, somente de leitura e requer autenticação local prévia no GitHub CLI; o projeto não publica comentários nem altera PRs.
- Não há LLM, memória persistente nem provider externo nesta versão. O adaptador MCP opcional em `integrations/mcp` é somente leitura e não introduz LLM nem escrita externa.
- A recomendação de release requer revisão humana e evidências de execução no sistema alvo.

## Licença

[MIT](LICENSE)
