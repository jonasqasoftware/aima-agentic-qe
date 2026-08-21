# Changelog

## Não lançado — MVP 4 em andamento

- Adaptador MCP local e somente leitura em `integrations/mcp`, isolado do pacote raiz (dependências próprias, `package.json` da raiz inalterado).
- Resources `aima://frameworks` (registry completo) e `aima://frameworks/{id}` (framework por id); id inexistente é erro de leitura, nunca recurso fabricado.
- Tool `analyze_change`, reutilizando `analyzeDeclaredChange` sem duplicar a lógica de risco, estratégia ou ledger de evidências.
- Toda leitura do registry e toda chamada da tool passam por `assertOperationPermitted` contra a política já versionada em `aima/policies/operation-permissions.json`.
- Suíte de testes dedicada: protocolo MCP em memória, negação de política injetada, guardrails estáticos de import e stdout, e verificação do processo stdio real (stdout limpo e falha fatal em stderr com código de saída diferente de zero).
- Workflow de CI dedicado (`mcp-integration.yml`), acionado apenas por mudanças relevantes ao adaptador, sem alterar o gate de qualidade existente.
- Core determinístico extraído para um subconjunto browser-portable (`analyzeChange` e suas dependências puras), sem duplicar risco, estratégia, seleção de framework ou ledger de evidências.
- Nova página pública `site/analyze.html`, que executa a análise inteiramente no navegador — os dados informados não são enviados a nenhum servidor.
- Build estático (`npm run build:site`) que gera `dist/site`, copiando o core puro e os dados de frameworks/política a partir das mesmas fontes canônicas (`src/`, `aima/frameworks`, `aima/policies`).
- GitHub Pages agora publica o artefato gerado `dist/site`, não `site/` diretamente; nenhuma API ou backend externo foi introduzido.
- `site/edition.mjs` passa a ser a fonte canônica da metadata da Preview Edition: `label`, `version` e `status` são declarados explicitamente, e os contadores de frameworks, conceitos e diagramas são derivados de `site/content.mjs`. A versão editorial permanece independente da versão em `package.json`.
- `site/layout.mjs`, `site/framework.mjs`, `site/insight.mjs` e `site/app.mjs` passam a interpolar `edition.version`/`edition.label` em vez de texto de versão hardcoded.
- Atributos `data-edition-*` hidratam a metadata visível no corpo de `index.html` e `preview.html` via JavaScript no navegador, preservando um fallback estático correto para quando o JavaScript está desabilitado.
- Metadata estática do `<head>` (title, meta description, Open Graph) permanece necessária por SEO e social preview; `scripts/check-site.mjs` passa a validar essa metadata contra `edition.mjs`, tag a tag.
- `scripts/check-site.mjs` ganha um contrato editorial determinístico: formato e valores permitidos de `edition.mjs`, independência estrutural em relação a `package.json`, fallbacks `data-edition-*` no corpo, badges "PREVIEW EDITION" e `aria-label` estáticos, ausência de versão hardcoded reintroduzida nos módulos consumidores, e identidade byte-a-byte entre `dist/site/edition.mjs` e a fonte após o build.
- `.github/workflows/pages.yml` passa a rodar `npm run check:site` (que já executa o build internamente) antes do deploy — uma inconsistência editorial agora bloqueia a publicação em vez de ser publicada.

## 0.2.0 — MVP 3 concluído

- Interface web local em `127.0.0.1` para analisar uma mudança declarada pelo mesmo motor determinístico da CLI, sem execução de comandos nem acesso remoto.
- Geração explícita de pacote de relatório e dashboard local diretamente pela interface, com escrita limitada ao diretório `reports/web`.
- Histórico do dashboard com data de geração, filtro local e links para os relatórios HTML preservados.
- Política versionada de permissões operacionais, distinguindo análise permitida, escrita local iniciada pelo usuário, autorização humana e escritas externas proibidas.
- Links na interface para todos os artefatos do pacote gerado: HTML, JSON, Markdown, SARIF e manifesto de integridade.
- Tendência visual do `Quality Confidence` no dashboard local, baseada exclusivamente nos relatórios preservados.
- Variação de confiança por relatório, comparada somente com a análise histórica imediatamente anterior.

## MVP 2 concluído

- Pipeline de evidências concluído: execução estruturada, resultados JUnit/JSON, cobertura LCOV e manifesto local em uma única análise.
- Correlação de cobertura para arquivos de código alterados e geração de relatório de evidências também no GitHub Actions.
- MVP 0 e MVP 1 permanecem preservados como base: decisão determinística, adaptadores de Git/PR e revisão humana obrigatória para releases.

- Documentação viva com diagrama Mermaid, modelo de decisão de qualidade e ADR inicial.
- Guia de uso orientado a tarefas, com exemplos de entrada, fluxo visual e solução de problemas.
- Adaptador de diff Git local que transforma nomes de arquivos alterados em contexto de análise, sem ler conteúdo ou serviços remotos.
- Ledger de evidências no relatório, separando fatos, inferências determinísticas e informações `UNKNOWN`.
- Relatório HTML autocontido, com painel visual de riscos, recomendação e ledger auditável.
- Política de release JSON versionada e opção `--policy` para governar recomendações de modo explícito.
- Suporte a evidências declaradas na entrada, preservadas no ledger como não verificadas.
- Exportação SARIF 2.1.0 para interoperabilidade com ferramentas de análise, sem upload automático.
- Comparação opcional com relatório baseline para destacar riscos novos, resolvidos e variação de confiança.
- Artefatos locais de evidência com hash SHA-256 no ledger, mantendo resultado de teste como não confiado automaticamente.
- Gate de CI opcional via `--fail-on`, que preserva relatórios antes de retornar falha.
- Execução manual do GitHub Actions com escolha do modo de gate e preservação de artefatos após falha.
- Manifesto SHA-256 e comando `verify-report` para verificar integridade dos relatórios gerados.
- Framework Data Quality Validation no registry, selecionado para superfícies de schema, migração, banco ou dados.
- Runner de avaliação golden integrado a `npm run check` para detectar regressões nas regras determinísticas.
- Dashboard HTML local para consolidar confiança, recomendações, políticas e riscos de vários relatórios.
- Opção `--include-stats` para registrar estatísticas de linhas do diff Git local como fatos auditáveis.
- Adaptador autorizado de PR do GitHub via CLI, com metadados, nomes de arquivos e checks de CI como evidência remota rastreável.
- Executor de evidência local por especificação estruturada, sem shell e com hash de transcript em vez de logs brutos.
- Importação de resultados JUnit/XML, com totais e casos de falha rastreáveis sem expor mensagens de erro ou logs.
- Contrato JSON normalizado para importar resultados de ferramentas sem exportação JUnit.
- Coleta de cobertura de linhas LCOV, com limite opcional declarado pelo operador e evidência hasheada.
- Correlação entre arquivos de código alterados e registros LCOV, distinguindo ausência de cobertura de alterações de documentação.
- Manifesto local que reúne execução, resultados de teste e cobertura em uma análise auditável.
- Workflow de CI gera relatório a partir do manifesto de evidências, aproximando execução local e CI.

## 0.1.0

- CLI determinístico para análise de mudança declarada.
- Framework Registry com Risk-Based Testing.
- Relatório de riscos, estratégia, incertezas e recomendação de release.
