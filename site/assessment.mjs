import { frameworks } from './content.mjs';

const form = document.querySelector('#assessment-form');
const result = document.querySelector('#assessment-result');
const options = [
  { value: 0, label: 'Ainda não' },
  { value: 1, label: 'Às vezes' },
  { value: 2, label: 'Na maioria das vezes' },
  { value: 3, label: 'De forma consistente' }
];

const mapping = {
  contexto: ['decision-quality-canvas','test-strategy-blueprint','engineering-decision-compass'],
  risco: ['risk-strategy-map','risk-prioritization-grid','test-strategy-blueprint'],
  evidencia: ['evidence-pyramid','confidence-model','evidence-based-release-model'],
  feedback: ['feedback-loop-canvas','quality-value-stream','trust-feedback-engine'],
  observabilidade: ['observability-decision-loop','confidence-model','quality-operating-system'],
  recuperacao: ['evidence-based-release-model','release-confidence-index','risk-strategy-map'],
  aprendizado: ['defect-learning-cycle','continuous-quality-loop','trust-feedback-engine'],
  governanca: ['decision-quality-canvas','quality-operating-system','engineering-decision-compass']
};

const dimensionLabels = {
  contexto: 'Contexto e intenção', risco: 'Risco', evidencia: 'Evidência', feedback: 'Feedback',
  observabilidade: 'Observabilidade', recuperacao: 'Release e recuperação', aprendizado: 'Aprendizado', governanca: 'Governança da decisão'
};

document.querySelectorAll('.question-card').forEach((field, index) => {
  const target = field.querySelector('.answer-options');
  target.innerHTML = options.map((option) => `<label><input type="radio" name="q${index + 1}" value="${option.value}" required />${option.label}</label>`).join('');
});

form?.addEventListener('submit', (event) => {
  event.preventDefault();
  const fields = [...document.querySelectorAll('.question-card')];
  const scores = fields.map((field, index) => ({
    dimension: field.dataset.dimension,
    score: Number(new FormData(form).get(`q${index + 1}`))
  }));

  const total = scores.reduce((sum, item) => sum + item.score, 0);
  const max = scores.length * 3;
  const lowest = [...scores].sort((a, b) => a.score - b.score).slice(0, 3);
  const slugs = [];
  lowest.forEach((item) => mapping[item.dimension].forEach((slug) => {
    if (!slugs.includes(slug) && slugs.length < 3) slugs.push(slug);
  }));
  const recommendations = slugs.map((slug) => frameworks.find((item) => item.slug === slug)).filter(Boolean);
  const profile = total <= 8 ? 'Estruture primeiro as decisões fundamentais.' : total <= 16 ? 'Há práticas úteis, mas ainda existem lacunas de consistência.' : 'A base está relativamente consistente; priorize calibração e aprendizado.';

  result.hidden = false;
  result.innerHTML = `
    <span class="kicker">ORIENTAÇÃO</span>
    <h2>${profile}</h2>
    <p>Seu resultado foi <strong>${total}/${max}</strong>. Este número não é uma nota de maturidade; serve apenas para organizar as respostas deste diagnóstico.</p>
    <p>As dimensões com menor consistência foram: <strong>${lowest.map((item) => dimensionLabels[item.dimension]).join(', ')}</strong>.</p>
    <h3>Frameworks sugeridos para começar</h3>
    <div class="result-frameworks">${recommendations.map((item) => `<a href="./frameworks/${item.slug}.html"><span>${String(item.id).padStart(2, '0')}</span><strong>${item.name}</strong><p>${item.summary}</p></a>`).join('')}</div>
    <p class="article-note">Use a recomendação como ponto de partida para uma conversa. Contexto, risco e evidências reais continuam sendo necessários antes de qualquer decisão.</p>`;
  result.scrollIntoView({ behavior: 'smooth', block: 'start' });
});
