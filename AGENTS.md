# AIMA Agentic QE — instruções de engenharia

## Objetivo do MVP

Construir somente o fluxo ponta a ponta que recebe uma descrição explícita de mudança, seleciona um framework AIMA, avalia riscos, recomenda verificações e produz um relatório auditável. Não alegar integração com GitHub, LLM, MCP, CI remoto ou execução de testes quando não houver evidência real.

## Limites de autonomia

- **READ:** leitura de arquivos e de dados explicitamente fornecidos.
- **EXECUTE:** comandos locais, testes e geração de relatórios sintéticos.
- **WRITE:** alterações locais somente quando autorizadas.
- **EXTERNAL WRITE:** criar issue, comentário, push, merge, deploy ou apagar recursos exige confirmação explícita no momento da ação.

## Evidências e incerteza

- Classifique o conteúdo como fato, inferência, hipótese ou recomendação.
- Use `UNKNOWN` quando a entrada não sustentar uma afirmação.
- Exponha critérios e evidências; não exponha raciocínio interno detalhado.
- Nunca apresente score de confiança como verdade científica ou aprovação automática.

## Arquitetura

- Frameworks ficam em `aima/frameworks/` como dados estruturados, não em condicionais de negócio dispersas.
- Prefira ferramentas determinísticas antes de qualquer LLM.
- Não adicione agentes, providers ou MCPs sem uma segunda implementação ou integração real que justifique a abstração.
- Cada alteração deve incluir testes e atualizar a documentação relevante.
