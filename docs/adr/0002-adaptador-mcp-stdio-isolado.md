# ADR 0002: Adaptador MCP stdio isolado e somente leitura

- **Estado:** aceito
- **Data:** 2026-08-20

## Contexto

O AIMA Agentic QE já expõe o motor determinístico via CLI e interface web local. Clientes MCP (como assistentes de IDE) precisam de acesso ao mesmo motor sem introduzir uma nova cópia da lógica de negócio, sem abrir escrita externa e sem acoplar o pacote raiz a um SDK de terceiros que o CLI não precisa.

## Decisão

O adaptador MCP vive em `integrations/mcp/` como um pacote Node isolado, com seu próprio `package.json`, `package-lock.json` e dependências (`@modelcontextprotocol/sdk`, `zod`), sem alterar o `package.json` da raiz. Ele importa o núcleo determinístico por caminho relativo direto a módulos específicos — `src/declared-analysis.js`, `src/framework-registry.js`, `src/permission-policy.js` — nunca pelo barrel `src/index.js` nem por `src/web-app.js`, para tornar auditável e testável exatamente qual superfície do core está exposta ao MCP.

O servidor expõe somente leitura:

- **Resource** `aima://frameworks`: registry completo de frameworks AIMA, sem reshape.
- **Resource template** `aima://frameworks/{id}`: um framework por id; id inexistente é erro de leitura, nunca um recurso vazio fabricado.
- **Tool** `analyze_change`: executa `analyzeDeclaredChange` (o mesmo pipeline puro usado pela CLI e pela interface web) e retorna o relatório completo. Não grava nenhum arquivo — `writeReports`/`saveDeclaredReport` não são acessíveis a partir deste pacote.

Toda operação passa por `assertOperationPermitted` contra a política já versionada em `aima/policies/operation-permissions.json` (chaves `read-framework-registry` e `analyze-declared-change`), carregada uma única vez em `startServer()` e injetada em `createServer({ rootDir, permissionPolicy })`. Isso permite testes injetarem uma política com operações negadas sem tocar no arquivo em disco.

O binário `bin/aima-mcp-stdio.js` fala exclusivamente o protocolo MCP em stdout (via `StdioServerTransport`); nenhum `console.log` é permitido no código de produção do pacote. Um erro fatal de inicialização é escrito em stderr e encerra o processo com código diferente de zero, nunca respondido como se fosse um resultado MCP válido.

## Consequências

### Positivas

- Nenhuma lógica de negócio duplicada: o adaptador é uma casca fina sobre o core já testado pela suíte da raiz.
- A política de permissões é a mesma fonte de verdade usada pela CLI e pela interface web; negar uma operação nela também bloqueia o MCP.
- O pacote raiz permanece livre de dependências do SDK MCP; quem não usa o adaptador não instala nada extra.
- A suíte MCP cobre resources, tool, negação de política, input inválido, guardrails estáticos de import/stdout e o processo stdio real (stdout limpo e falha fatal), evitando alegações de comportamento não verificado.

### Negativas

- Dois `package.json`/`package-lock.json` no repositório aumentam a superfície de manutenção de dependências.
- O adaptador precisa ser mantido em sincronia manual com qualquer mudança de assinatura em `declared-analysis.js`, `framework-registry.js` ou `permission-policy.js`, já que não há um contrato de tipos compartilhado.

## Próximo passo

Escrita via MCP (por exemplo, gerar pacote de relatório em disco) só poderá ser adicionada após uma decisão explícita de autorização humana por chamada, seguindo o mesmo modelo já usado por `write-local-report` na política de permissões.
