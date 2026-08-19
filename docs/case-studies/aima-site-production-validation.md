# Case study: refresh de contraste/navegação e migração de produção do site AIMA 2.0

- **Estado:** concluído
- **Data:** 2026-08-19
- **Escopo do documento:** este case study é um artefato documental aprovado *após* a entrega técnica descrita aqui. `docs/` estava fora do escopo original da implementação (que cobria apenas `site/`); a criação deste arquivo é um novo escopo, aprovado separadamente.

Cada afirmação abaixo é marcada com sua fonte:

- **[persistente]** — reproduzível a partir do código atual, histórico Git, API do GitHub ou logs de CI, sem depender desta conversa.
- **[compactado]** — vem do histórico resumido desta sessão; não há artefato persistido equivalente no repositório.
- **[manual]** — resultado de uma verificação humana pontual (navegador real, dispositivo físico) que não deixa rastro auditável no repositório.

## Contexto

O diretório `site/` é a camada pública e editorial do AIMA 2.0, publicada em `https://aima20.dev` via GitHub Pages, versionada separadamente do núcleo executável do método (`aima/`, `evals/`, `examples/`) **[persistente]** (`site/README.md`, seção "Princípio arquitetural").

## Problema

A camada pública apresentava três classes de problema, identificadas em diagnóstico solicitado pelo usuário antes de qualquer alteração de código **[compactado]**:

1. Contraste insuficiente em bordas de componentes de UI (inputs, botões, filtros, `nav-cta`) e no texto kicker dourado sobre fundo claro, abaixo dos mínimos WCAG 2.1.
2. Navegação fragmentada entre as páginas estáticas (`index.html`, `assessment.html`, `insights.html`, `preview.html`), sem conjunto/ordem de links consistente.
3. Ausência total de header/footer nas 20 páginas de framework e 3 páginas de insight — descritas no PR como "becos sem saída de navegação (só um link 'voltar')" **[persistente]** (corpo do PR #18).

## Restrições de escopo

O usuário definiu, antes da implementação: não alterar `aima/`, `evals/`, `examples/`, `docs/`; não reescrever conteúdo conceitual sem autorização explícita; não implementar nada até aprovação explícita do diagnóstico **[compactado]** — não há um artefato persistido que registre essas restrições como instrução original.

O respeito a essas restrições é verificável a posteriori: o diff do commit `705160f` toca exclusivamente arquivos em `site/`, e o corpo do PR #18 declara "Nenhum conteúdo conceitual, dado de framework/léxico/insight ou arquivo fora de `site/` foi alterado" **[persistente]**.

## Diagnóstico

### Contraste (reproduzido nesta revisão a partir do diff real, WCAG 2.1 — luminância relativa)

O diff de `site/styles.css` no commit `705160f` **[persistente]** (`git show 705160f -- site/styles.css`) permite recalcular os pares de cor antes/depois:

| Par | Antes | Depois | Contraste antes | Contraste depois | Critério |
|---|---|---|---|---|---|
| Bordas `nav-cta`/`menu-button`/`button` sobre `--ink` (`#111111`) | `#464646` | `--line-ui` `#6b6b6b` | 2.00:1 | 3.54:1 | WCAG 1.4.11 (UI, ≥3:1) |
| Bordas `filter-button`/`answer-options`/`assessment-result` sobre `--ink` | `#3a3a3a` | `--line-ui` `#6b6b6b` | 1.66:1 | 3.54:1 | WCAG 1.4.11 (UI, ≥3:1) |
| Kicker dourado sobre `--paper` (`#f2ede3`) | `#8c6811` | `#7d5d0f` | 4.39:1 | 5.23:1 | WCAG 1.4.3 (texto, ≥4.5:1) |
| Bordas `search-input`/`select-input` sobre `#fffdf8` | `--line-light` `#d8d1c4` | `--line-ui-light` `#867e6c` | 1.49:1 | 3.96:1 | WCAG 1.4.11 (UI, ≥3:1) |

Todos os pares "antes" ficavam abaixo do mínimo aplicável; todos os "depois" passam com margem **[persistente]** (cálculo reproduzido nesta sessão via fórmula de luminância relativa WCAG, a partir dos valores hex do diff real).

### Navegação

O diagnóstico de dead-ends nas páginas de framework/insight está registrado no corpo do PR #18 **[persistente]**. A análise de hierarquia visual e responsividade mais ampla, que motivou a proposta de direção visual antes da aprovação, não ficou persistida em nenhum artefato do repositório **[compactado]**.

## Decisões

1. Ordem de implementação em três fases: (1) contraste CSS, (2) unificação de navegação entre páginas estáticas, (3) header/footer nas páginas internas **[compactado]** — decisão de sequenciamento, não persistida como tal, mas coerente com o diff único do commit `705160f`.
2. Extrair header/footer compartilhado para `site/layout.mjs` (`mountChrome()`), reaproveitado por `site/framework.mjs` e `site/insight.mjs` em vez de duplicar markup — confirmado no código atual: ambos os módulos importam e chamam `mountChrome({ base: '../', rootId: ... })` **[persistente]**.
3. Remover `site/app.js`, arquivo órfão de 30 linhas substituído por `site/app.mjs`, sem nenhuma página HTML referenciando-o **[persistente]** (diff do commit: `site/app.js | 30 ------------------------------`; `site/README.md` atual documenta apenas `app.mjs`).

## Implementação

Commit único `705160f3e74e9b526a13396d9801747ab653e576` — "feat(site): melhora contraste e unifica navegação (#18)", squash-merge do PR #18 **[persistente]**:

```
site/README.md       |  3 ++-
site/app.js          | 30 ------------------------------  (removido)
site/assessment.html |  9 ++++++++-
site/framework.mjs   |  3 +++
site/index.html      |  5 +++--
site/insight.mjs     |  3 +++
site/insights.html   |  2 +-
site/layout.mjs      | 45 +++++++++++++++++++++++++++++++++++++++++++++  (novo)
site/preview.html    |  9 ++++++++-
site/styles.css      | 25 +++++++++++++------------
10 files changed, 86 insertions(+), 48 deletions(-)
```

`site/layout.mjs` é consumido por 20 páginas de framework e 3 páginas de insight **[persistente]** (contagem de arquivos em `site/frameworks/*.html` e `site/insights/*.html`, e imports em `framework.mjs`/`insight.mjs`).

## Evidências de qualidade

Test plan declarado no corpo do PR #18 **[persistente]**:

- [x] `git diff --check` sem whitespace errors
- [x] Recontagem de contraste (WCAG) para todos os pares de cor alterados
- [x] Testado em navegador local (menu mobile, header/footer nas páginas internas, sem erros de console)
- [ ] Revisão visual final no ambiente publicado (GitHub Pages)

O último item ficou **pendente no momento do merge** — a validação em produção só ocorreu depois, como etapa subsequente e distinta (ver "Validação em produção").

## PR e CI

- PR #18, `feat/site-visual-refresh` → `main`, aberto e squash-merged por `jonasqasoftware`, `mergedAt: 2026-08-19T21:16:52Z` **[persistente]** (`gh pr view 18`).
- Check `validate` (workflow `quality.yml`, job `npm run check` + `analyze-pr`) passou em 11s **[persistente]** (`gh pr checks 18`).

## Deploy

Histórico de execuções do workflow `Deploy AIMA 2.0 site` (`.github/workflows/pages.yml`) **[persistente]** (`gh run list --workflow=pages.yml`):

| Run | Trigger | Commit | Resultado |
|---|---|---|---|
| 2026-08-19T17:40:18Z | push | `2b18ca9` | falha |
| 2026-08-19T18:02:08Z | push | `0e2676d` | falha |
| 2026-08-19T21:16:54Z | push | `705160f` | falha |
| 2026-08-19T21:31:05Z | workflow_dispatch | `705160f` | **sucesso** |

Causa raiz das três falhas, confirmada no log do step `Configure Pages` **[persistente]** (`gh run view 32303060000 --log-failed`):

```
##[error]Get Pages site failed. Please verify that the repository has Pages enabled
and configured to build using GitHub Actions...
##[error]HttpError: Not Found
```

O GitHub Pages não estava habilitado no repositório. Após o usuário habilitá-lo manualmente (Settings → Pages → Source: GitHub Actions), o workflow foi disparado manualmente via `workflow_dispatch` e concluiu com sucesso.

## Migração DNS e HTTPS

Estado atual, verificado nesta sessão **[persistente]**:

- `dig aima20.dev A +short` → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` (os 4 IPs do GitHub Pages).
- `dig www.aima20.dev CNAME +short` → `jonasqasoftware.github.io.`
- `gh api repos/jonasqasoftware/aima-agentic-qe/pages`: `cname: "aima20.dev"`, `build_type: "workflow"`, `https_certificate.state: "approved"` (domínios `aima20.dev` e `www.aima20.dev`, expira `2026-11-17`), `https_enforced: true`.

A jornada de propagação — estado anterior do DNS (Cloudflare/Next.js), comparação entre nameservers autoritativos da Hostinger e o resolver padrão, tempo de espera por TTL — não deixou artefato persistido; o estado "antes" já não é reproduzível, pois foi substituído **[compactado]**.

## Validação em produção

Requisição HTTP direta a `https://aima20.dev/`, feita nesta sessão **[persistente]**:

```
HTTP/2 200
server: GitHub.com
last-modified: Wed, 19 Aug 2026 21:31:20 GMT
```

O `last-modified` coincide com o horário do deploy bem-sucedido (`21:31:05Z`), confirmando que o conteúdo servido é o do commit `705160f`, sem headers residuais da hospedagem anterior.

Validação visual em navegador real (desktop: home, Assessment, Preview, um Framework, um Insight, sem aviso de certificado) foi realizada em sessão anterior via ferramenta de automação de navegador **[manual]** — não há screenshot ou log persistido no repositório, apenas o relato da sessão.

Validação do menu mobile em dispositivo físico real foi relatada diretamente pelo usuário, confirmando os 8 links esperados e ausência de quebra de layout **[manual]** — esta é a única etapa que depende inteiramente do relato do usuário, sem qualquer forma de verificação independente.

Cronologia importante: a "Revisão visual final no ambiente publicado" listada como pendente no test plan do PR (ver "Evidências de qualidade") foi executada **depois** do merge e do deploy bem-sucedido, não antes — o PR foi mergeado com essa validação declaradamente incompleta, e ela foi fechada como etapa subsequente desta mesma entrega.

## Resultado

"Produção validada" é uma síntese sustentada por múltiplas evidências de naturezas diferentes, não um fato único verificável por um comando:

- DNS migrado e HTTPS ativo — **[persistente]**, reproduzível a qualquer momento via `dig` e API do GitHub Pages.
- Conteúdo correto servido pelo GitHub Pages — **[persistente]**, via headers HTTP e `last-modified`.
- Deploy bem-sucedido após correção do Pages — **[persistente]**, via histórico de runs do workflow.
- Validação visual desktop — **[manual]**, realizada em sessão anterior, sem artefato persistido.
- Validação do menu mobile em dispositivo real — **[manual]**, relatada pelo usuário, sem verificação independente possível.

Nenhuma pendência funcional estava aberta ao final desta entrega, segundo o relato do usuário que encerrou a tarefa.

## Lições de Agentic Quality Engineering

Esta seção é análise, não fato auditável — reflexão sobre o processo, não evidência do sistema:

- **Aprovação em camadas reduz risco de escopo.** Diagnóstico → aprovação → implementação em fases → staging revisado → commit → push → PR → merge, cada etapa aprovada separadamente, permitiu capturar duas decisões que extrapolavam levemente o escopo literal aprovado (remoção de `app.js`, criação de `layout.mjs`) antes do commit, não depois.
- **Diffs staged completos como gate obrigatório.** A exigência de `git diff --cached` completo revisado antes de cada commit evitou depender de memória de conversa para saber exatamente o que seria commitado — o commit `705160f` corresponde exatamente ao que foi revisado.
- **CI/CD com causa raiz verificável supera suposição.** A falha de deploy foi diagnosticada lendo o log real do step (`gh run view --log-failed`), não inferida — evitando alterar DNS ou configuração por engano quando a causa era apenas Pages não habilitado.
- **Nem toda validação é reproduzível a partir do repositório.** Validação visual em dispositivo móvel real não deixa rastro auditável; este case study marca essa lacuna explicitamente em vez de apresentá-la com o mesmo peso de evidência que um `dig` ou um header HTTP.
- **Histórico compactado de conversa é uma fonte válida, mas de segunda ordem.** Quando uma decisão ou diagnóstico não é persistido em código, PR ou log, o case study precisa dizer isso explicitamente — a alternativa (apresentar tudo com a mesma confiança) tornaria o documento não auditável por terceiros.
