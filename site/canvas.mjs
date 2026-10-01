import { mountChrome } from './layout.mjs';

mountChrome({ base: './', rootId: 'canvas', current: 'canvas' });

const form = document.querySelector('#canvas-form');
const output = document.querySelector('#canvas-output');
const markdownField = document.querySelector('#canvas-markdown');
const copyStatus = document.querySelector('#canvas-copy-status');
const copyButton = document.querySelector('#canvas-copy');

const FIELDS = [
  { heading: 'A — Análise', items: [
    ['analise-problema', 'Qual problema queremos resolver?'],
    ['analise-risco', 'O que pode dar errado?'],
    ['analise-incerteza', 'O que ainda não sabemos?']
  ] },
  { heading: 'I — Impacto', items: [
    ['impacto-valor', 'Onde podemos gerar mais valor?'],
    ['impacto-acao', 'Qual ação vamos testar?']
  ] },
  { heading: 'M — Metrificação', items: [
    ['metrificacao-evidencia', 'Que evidência precisamos?'],
    ['metrificacao-sinal', 'Qual métrica ou sinal vamos observar?'],
    ['metrificacao-esperado', 'Qual resultado esperamos?']
  ] },
  { heading: 'A — Apresentação', items: [
    ['apresentacao-resultado', 'O que aconteceu?'],
    ['apresentacao-aprendizado', 'O que aprendemos?'],
    ['apresentacao-decisao', 'Qual decisão tomamos?'],
    ['apresentacao-proximo', 'Qual é o próximo ciclo?']
  ] }
];

function buildMarkdown() {
  const data = new FormData(form);
  const lines = ['# AIMA Canvas', ''];
  for (const section of FIELDS) {
    lines.push(`## ${section.heading}`, '');
    for (const [name, question] of section.items) {
      const value = String(data.get(name) || '').trim();
      lines.push(`**${question}**`, '', value || '_(não preenchido)_', '');
    }
  }
  return lines.join('\n').trim() + '\n';
}

copyButton?.addEventListener('click', async () => {
  const markdown = buildMarkdown();
  markdownField.value = markdown;
  output.hidden = false;
  markdownField.focus();
  markdownField.select();
  try {
    await navigator.clipboard.writeText(markdown);
    copyStatus.textContent = 'Copiado para a área de transferência.';
  } catch {
    copyStatus.textContent = 'Não foi possível copiar automaticamente — o texto está selecionado abaixo, use Ctrl+C.';
  }
  output.scrollIntoView({ behavior: 'smooth', block: 'start' });
});
