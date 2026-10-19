# Redesign AIMA 2.0 — Fase 1 (fundação) · registro de auditoria, decisões e evidências

Estado: **trabalho local, não commitado**, branch `redesign/aima-2-0-ui` (base `main` @ e061c6c). Nenhum push, PR, merge ou deploy foi feito. `src/`, `aima/`, `integrations/` e workflows **não foram alterados**.

## 1. Auditoria (baseline)
Baseline: `npm run check` PASS (73 testes, evaluate PASSOU, check:site OK: 20 frameworks, 28 conceitos, 3 insights).

| # | Achado | Severidade | Evidência | Status |
|---|---|---|---|---|
| A1 | Analisador: regras base `.analyze-form`/`.evidence-row` declaradas **depois** do `@media (max-width:680px)` anulavam o colapso mobile | Alta (WCAG 1.4.10) | **Reproduzido** (Chromium): em 320/375/768px, colunas 379px×2 e `scrollWidth` 794 num viewport de 320 | Corrigido (CSS mobile-first) e revalidado: sem overflow em 8 páginas × 7 larguras |
| A2 | Filtros de frameworks usavam só classe CSS `.active` | Média | Leitura de `app.mjs`/`styles.css` (estático) | Corrigido: `aria-pressed`, `role=status` com contagem |
| A3 | Resultado do analisador sem hierarquia de decisão; erro sem `role=alert`/foco | Média | Leitura de `analyze.mjs` | Corrigido (ver §3) |
| A4 | Home sobrecarregada (9 seções) | Média | Leitura de `index.html` | **Pendente** (Fase 2 — ver §6) |
| A5 | Páginas Analisador/Assessment sem item ativo na navegação | Baixa | `layout.mjs` | Assessment corrigido (`current`) |
| A6 | `pages.yml` publica em push na `main` | Informativo | Leitura do workflow | Respeitado: sem merge |

Observação: uma suspeita estática só foi tratada como falha após reprodução (A1).

## 2. Direção de arte — "Registro de decisão"
Papel técnico + tinta + um sinal de verificação (verde‑evidência). Justificativa: o produto trata de rastreabilidade e evidência; a estética é de registro/ledger editorial, afastada do dourado‑sobre‑preto e de templates SaaS/IA. Tokens centralizados, tema claro/escuro por `light-dark()`.
- Cores: papel `#f5f3ee`/`#121416`, tinta `#14181f`/`#eeece6`, sinal `#17614f`/`#6fcfb3`, link `#1f4f86`, risco `#7a4e00`, no‑go `#a02424`.
- Tipografia: pilhas de sistema (serifa para títulos, sans para corpo, mono para rótulos) — **zero requisições externas**, sem custo, sem rastreio, bom desempenho; pt‑BR coberto.
- Logo: marca de seis segmentos (Contexto→Aprendizado) desenhada em CSS + wordmark.
- Estados de decisão nunca só por cor: texto + forma (● GO, ▲ GO WITH RISKS, ■ NO‑GO); filtro ativo com ✓; opção marcada com ✓.
- Acessibilidade: foco 3px, alvos ≥44px em botões, filtros e menu móvel (meta de projeto; links do rodapé não medidos), `prefers-reduced-motion`, `forced-colors`, impressão (regra `@media print` escrita, não testada).

## 3. Mudanças implementadas
- `site/styles.css`: reescrito como design system (fundações, componentes, estados, responsivo). Nomes de classes preservados.
- `site/analyze.mjs`: resultado em ordem Recomendação → Riscos → Evidências → Lacunas → Próximas verificações → Explicabilidade; aviso explícito de **revisão humana**; foco no resultado; erro `role=alert` e `aria-invalid` no JSON; tabela com `caption`/`scope`. Algoritmo, contratos, modo JSON e distinção fato/inferência/UNKNOWN intactos; sem rede.
- `site/app.mjs` + `index.html`: filtros semânticos; `theme-color` claro/escuro (somente na home).
- `site/layout.mjs`/`assessment.mjs`: navegação Método · Como usar · Biblioteca · Assessment · Insights + CTA; item ativo no Assessment.
Contrato `check:site` (contadores `data-edition-*`, badges, head, sem rede) preservado.

## 4. Testes e evidências (rótulos reais)
| Verificação | Resultado |
|---|---|
| `npm run check` (testes, evaluate, check:site) | PASS |
| Regressão do motor (`src/`, `aima/` sem diff; decisão do exemplo padrão = GO WITH RISKS) | PASS |
| Reflow 8 páginas × 320/375/390/768/1024/1440/1920 | PASS (0 overflow) |
| Analisador 320px com texto longo + linha de evidência | PASS (scrollWidth 320) |
| Fluxo do analisador, ordem das seções, foco, erro de JSON | PASS |
| Filtros `aria-pressed` + status | PASS |
| Erros de console (claro/escuro) | PASS (0) |
| Contraste computado (heurística própria, claro+escuro) | PASS — **não substitui axe** |
| axe-core 4.x (regras WCAG 2.0/2.1/2.2 A e AA), Chrome 155 do notebook do autor, 8 páginas × claro/escuro | **PASS após correção** (ver §10); ferramenta automática não cobre todos os critérios WCAG |
| Teclado completo, leitor de tela, zoom 200/400% real, teclado virtual, orientação | **NOT_RUN** (manual) |
| Lighthouse/LCP/CLS/INP | **NOT_RUN** |
| Conformidade WCAG 2.2 AA | **Não declarada**; só testes parciais acima |

## 5. Riscos
Sem axe/manual a11y completos; estética validada só em Chromium; navegação nova ainda não reflete uma IA com páginas "Ferramentas/Biblioteca/Releases".

## 6. Próximos passos (Fase 2)
Reestruturar a home (hero com demonstração verificável, Problema, Solução, Jornada, Transparência) sem remover conteúdo; páginas‑hub Ferramentas/Biblioteca com redirects e sitemap/check-site atualizados; passo‑a‑passo opcional no analisador; rodar axe/teclado/Lighthouse onde houver rede.

## 7. Publicação e rollback
Publicação só via PR → revisão independente → merge autorizado (o merge em `main` aciona `pages.yml`). Rollback: reverter o PR/merge (a `main` anterior segue íntegra); nada de infraestrutura/VPS/AIMA Factory foi tocado. Custo incremental: R$ 0 (sem dependências nem serviços).

## 8. Fase 2 — home (local, não commitado)
- Nova ordem: Hero (+ exemplo ilustrativo reproduzível no Analisador) → Problema → Método → Comece por aqui (Analisador, Assessment, Preview, Insights) → Biblioteca (sub-navegação Frameworks · Léxico · Diagramas) → Transparência → Como usar → Insights → CTA final. Conteúdo editorial preservado; títulos reescritos: "Do conceito para a prática" → "Escolha como entrar"; no resultado do Analisador, "O que testar agora?", "O que ainda não sabemos?" e "Evidências utilizadas" viraram "Próximas verificações", "Lacunas" e "Evidências". Contrato `check:site` preservado (PASS).
- Exemplo do hero: entrada padrão do Analisador → "GO WITH RISKS" (observado em execução); marcado como ilustrativo e para revisão humana.
- Revalidado: reflow 8 páginas × 7 larguras PASS, console sem erros, contraste heurístico PASS.
- **Achado A4 parcialmente tratado:** a ordem e a descoberta melhoraram, mas a home no celular ainda mede ~25.400 px (20 frameworks + 28 conceitos + 20 diagramas renderizados em lista). Mitigação pendente: paginação/"ver mais" ou `<details>` nas grades longas.
- Não feito: páginas-hub com redirects (decisão: sub-navegação interna evita mudar URLs/sitemap).
- **Atualização A4:** léxico mostra 9 de 28 e diagramas 6 de 20, com botão `aria-expanded` "Mostrar todos"; busca/filtro varrem o conjunto completo. Verificado em Chromium 390px: altura da home caiu de ~25.400 px para ~17.700 px, sem overflow nem erros. Resta a grade de 20 frameworks (1 coluna no celular) — candidata a layout compacto.

- **Revisão independente (aima-qe-reviewer): 0 bloqueadores, 7 achados médios.** Corrigidos: card de maior risco (h3, rótulo, sem duplicar), `scroll-margin-top`, contador do léxico, alvos de nav, doc. Pendente: capturas de como-usar, preview, insights e páginas de framework/insight em claro e escuro.

## 9. Verificações manuais automatizadas parcialmente (Chromium, local)
- PASS: âncoras (#metodo, #comecar, #frameworks, #lexico, #diagramas, #transparencia, #insights) pousam a 80px, abaixo do cabeçalho de 64px; foco não obscurecido em 76 paradas de Tab na home; menu móvel por teclado (`aria-expanded` abre/fecha); filtro por Espaço; botão "Mostrar todos" mantém o foco; forced-colors sem overflow; nenhum alvo interativo <24px na home desktop.
- FAIL → corrigido: com fonte a 200% em 320px o cabeçalho (botão Menu a 453px) e o nome "Confidence Model" nos diagramas estouravam a largura. Agora 320px em analyze, index e assessment.
- Continua NOT_RUN: leitor de tela, zoom real do navegador, outros navegadores, axe (BLOCKED), Lighthouse.

## 10. axe-core executado (notebook do autor, Chrome 155)
- Escopo: index, analyze, assessment, como-usar, preview, insights, uma página de framework e uma de insight; tema claro e escuro; viewport 1280×900; tags wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa.
- 1ª execução: 1 violação serious em todas as 16 combinações — `label-content-name-mismatch` no logo (`aria-label` "AIMA 2.0 — início" vs texto visível "AIMA2.0"; WCAG 2.5.3). Um `<span>` oculto com espaço não resolveu (o axe o ignora).
- Correção: texto visível único "AIMA 2.0" em `site/layout.mjs`. 2ª execução: **0 violações nas 16 combinações**.
- Limites: axe detecta só parte dos problemas; teclado completo, leitor de tela, zoom real do navegador e Lighthouse permanecem NOT_RUN. Conformidade WCAG 2.2 AA **não declarada**.

## 11. Identidade "Blueprint técnico" (branch `redesign/blueprint`, local, não commitado)
Escolhida pelo autor entre quatro propostas desenhadas num canvas: A editorial verde, B blueprint, C mapa de metrô e D revista em duas tintas. Base: `redesign/aima-2-0-ui` @ a0f2f11 (PR #48). `src/`, `aima/`, `integrations/` e workflows não foram alterados.
- **Direção:** folha de desenho técnico. O traço (ciano no escuro, azul no claro) desenha estrutura e fluxo. O âmbar no escuro e o ferrugem no claro marcam só a decisão e a ação principal. Grade de fundo de 16/80px.
- **Tipografia:** títulos em Barlow Condensed SemiBold, maiúsculos; rótulos, navegação e dados em JetBrains Mono; corpo na sans do sistema. As fontes ficam hospedadas em `site/fonts/` (OFL, licenças junto) e não fazem requisição externa. Fica `font-display: swap`. Não foi possível gerar subconjuntos porque faltou o brotli no ambiente; os 3 arquivos somam ~247 KB.
- **Diagramas da home:**
  - Método em trilho com estações; a Decisão vem em losango âmbar e o Aprendizado em tracejado, voltando ao 01. Fica vertical no celular.
  - Novo **Fig. 01**: os 8 estágios do motor, com a cota do núcleo puro (S-02 a S-06). Também fica vertical abaixo de 1100px.
  - Novo **Fig. 02**: pirâmide de evidências em SVG com legenda HTML, com camadas tiradas do exemplo do framework (checkout).
  - Novo **Fig. 03**: barras de frameworks por categoria, calculadas em `app.mjs` a partir de `content.mjs`, sem números escritos à mão.
  - Fluxos das páginas de framework viram estações ligadas por setas, com o último passo em âmbar.
- **Contraste medido (pior caso de cada token sobre paper, surface, surface-2 e hover):**
  - Claro: texto 13,2; secundário 6,0; traço 5,8; acento 5,0; GO 5,1 (antes 4,46, corrigido); NO-GO 5,5; borda de controle 3,5; texto sobre botão 6,0.
  - Escuro: texto 12,8; secundário 9,0; traço 8,8; acento 8,3; GO 9,2; NO-GO 6,4; borda 3,8; texto sobre botão 10,0.
- **Verificado (Chromium, local):** `npm run check` PASS; reflow em 8 páginas × 7 larguras (320 a 1920) PASS; heurística de contraste de texto PASS nos dois temas; console sem erros; Analisador mantém a ordem do resultado, o foco no resultado e o erro de JSON com `role=alert`; os filtros mantêm `aria-pressed`.
- **NOT_RUN:** axe nesta branch, leitor de tela, zoom real do navegador, outros navegadores, Lighthouse. Conformidade WCAG não declarada.
