import { frameworks } from './content.mjs';
import { mountChrome } from './layout.mjs';

mountChrome({ base: './', rootId: 'assessment' });

const form = document.querySelector('#assessment-form');
const result = document.querySelector('#assessment-result');

const GUIDANCE = {
  analise: {
    name: 'Análise',
    message: 'Comece nomeando o problema em uma frase: o que está acontecendo, para quem e desde quando. Use o Analysis Canvas para estruturar contexto, riscos e o que você ainda não sabe.',
    tool: { label: 'Analysis Canvas', href: './como-usar.html#ferramentas-oficiais' },
    advanced: ['engineering-decision-compass', 'risk-strategy-map']
  },
  impacto: {
    name: 'Impacto',
    message: 'Com o problema nomeado, escolha onde agir primeiro. Use o Impact Map para comparar onde a mudança gera mais valor com menor risco.',
    tool: { label: 'Impact Map', href: './como-usar.html#ferramentas-oficiais' },
    advanced: ['risk-prioritization-grid', 'quality-decision-matrix']
  },
  metrificacao: {
    name: 'Metrificação',
    message: 'Antes da próxima mudança, defina qual evidência provaria que ela funcionou. Use o Evidence Card para declarar métrica, sinal e resultado esperado com antecedência.',
    tool: { label: 'Evidence Card', href: './como-usar.html#ferramentas-oficiais' },
    advanced: ['evidence-pyramid', 'confidence-model']
  },
  apresentacao: {
    name: 'Apresentação',
    message: 'Os dados já existem — o que falta é transformá-los em decisão. Use o Decision Brief para registrar o que aconteceu, o aprendizado e a decisão tomada.',
    tool: { label: 'Decision Brief', href: './como-usar.html#ferramentas-oficiais' },
    advanced: ['decision-quality-canvas', 'trust-feedback-engine']
  }
};

form?.addEventListener('submit', (event) => {
  event.preventDefault();
  const etapa = new FormData(form).get('etapa');
  const guidance = GUIDANCE[etapa];
  if (!guidance) return;

  const advancedLinks = guidance.advanced
    .map((slug) => frameworks.find((item) => item.slug === slug))
    .filter(Boolean);

  result.hidden = false;
  result.innerHTML = `
    <span class="kicker">COMECE POR</span>
    <h2>${guidance.name}</h2>
    <p>${guidance.message}</p>
    <div class="hero-actions">
      <a class="button button-primary" href="./canvas.html">Abrir o AIMA Canvas</a>
      <a class="button button-secondary" href="${guidance.tool.href}">${guidance.tool.label}</a>
    </div>
    <h3>Quer aprofundar? (opcional)</h3>
    <div class="result-frameworks">${advancedLinks.map((item) => `<a href="./frameworks/${item.slug}.html"><span>${String(item.id).padStart(2, '0')}</span><strong>${item.name}</strong><p>${item.summary}</p></a>`).join('')}</div>`;
  result.scrollIntoView({ behavior: 'smooth', block: 'start' });
});
