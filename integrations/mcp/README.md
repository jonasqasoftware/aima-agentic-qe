# AIMA MCP adapter (stdio, somente leitura)

Adaptador [Model Context Protocol](https://modelcontextprotocol.io) local, opcional e isolado do pacote raiz do AIMA Agentic QE. Ele expõe o mesmo motor determinístico usado pela CLI e pela interface web (`analyzeDeclaredChange` e o Framework Registry) a clientes MCP via stdio, sem duplicar lógica de negócio e sem nenhuma escrita em disco ou rede.

Este pacote é independente: possui seu próprio `package.json` e `package-lock.json`, e não altera as dependências do pacote raiz (`../../package.json`).

## O que este adaptador expõe

- **Resource** `aima://frameworks` — o registry completo de frameworks AIMA (`aima/frameworks/*.yaml`), sem reshape.
- **Resource template** `aima://frameworks/{id}` — um framework específico por id. Um id inexistente resulta em erro de leitura do resource, nunca em um recurso vazio fabricado.
- **Tool** `analyze_change` — recebe uma mudança declarada (o mesmo contrato de `aima/schemas/change-input.schema.json`) e retorna o relatório completo produzido por `analyzeDeclaredChange`: riscos, estratégia, ledger de evidências (`FACT`/`INFERENCE`/`UNKNOWN`/...) e recomendação de release. Não lê diff, não usa LLM e não grava nenhum arquivo.

Toda leitura do registry e toda chamada da tool passam por `assertOperationPermitted` contra a política versionada em [`aima/policies/operation-permissions.json`](../../aima/policies/operation-permissions.json), sob as chaves `read-framework-registry` e `analyze-declared-change`. Uma operação `denied`/`requires-human-authorization` nessa política bloqueia o resource ou a tool correspondente.

Veja o racional completo em [`docs/adr/0002-adaptador-mcp-stdio-isolado.md`](../../docs/adr/0002-adaptador-mcp-stdio-isolado.md).

## Instalação

```bash
cd integrations/mcp
npm install
```

## Uso

```bash
npm start
```

Isso inicia `bin/aima-mcp-stdio.js`, que fala exclusivamente o protocolo MCP em stdout via `StdioServerTransport`. Um erro fatal de inicialização (por exemplo, política de permissões ausente ou inválida) é escrito em stderr e o processo encerra com código de saída diferente de zero — nunca é reportado como se fosse uma resposta MCP válida.

Para configurar este servidor em um cliente MCP (por exemplo, um assistente de IDE), aponte o cliente para executar `node bin/aima-mcp-stdio.js` a partir deste diretório.

## Testes

```bash
npm test
```

A suíte cobre, sobre um transporte em memória (`InMemoryTransport`) e, quando o contrato exige o processo real, sobre um subprocesso stdio de verdade:

- listagem de `aima://frameworks`;
- leitura de `aima://frameworks/{id}` válido e inválido;
- `analyze_change` comparado por igualdade profunda contra `analyzeDeclaredChange` chamado diretamente;
- preservação de `FACT`/`INFERENCE`/`UNKNOWN` no ledger de evidências;
- negação de política para o resource e para a tool, via política injetada em memória (sem editar o arquivo em disco);
- entrada inválida retornando `isError: true`;
- guardrails estáticos: nenhum import proibido (`src/index.js`, `web-app.js`, `writeReports`, `saveDeclaredReport`, `createChangeFromGitHubPr`, `executeEvidenceCommand`, `node:child_process`, `node:http`) e nenhum `console.*`/`process.stdout.write` no código de produção;
- guardrail dinâmico: o subprocesso stdio real só escreve JSON-RPC em stdout, e uma falha fatal de inicialização vai para stderr com código de saída diferente de zero.

`npm run check` executa `node --check` sobre `src/*.js`/`bin/*.js` e depois a suíte de testes.

## Estrutura

```text
integrations/mcp/
  bin/aima-mcp-stdio.js   binário stdio: startServer() + StdioServerTransport
  src/server.js           createServer({ rootDir, permissionPolicy }) e startServer({ rootDir })
  src/resources.js        registra aima://frameworks e aima://frameworks/{id}
  src/tools.js            registra a tool analyze_change
  tests/                  suíte MCP (protocolo, guardrails, processo stdio real)
```

## Limites

- Não escreve relatórios em disco (`writeReports`/`saveDeclaredReport` não são usados aqui).
- Não lê PRs do GitHub nem executa comandos declarados — essas operações continuam exclusivas da CLI, sob autorização humana.
- Não usa LLM; o único raciocínio é o motor determinístico já testado na raiz do repositório.
