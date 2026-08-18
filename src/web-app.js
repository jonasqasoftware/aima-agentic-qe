import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeChangeInput } from './change-input.js';
import { loadFrameworkRegistry, selectFramework } from './framework-registry.js';
import { assessRisks, qualityConfidence } from './risk-engine.js';
import { loadReleasePolicy } from './release-policy.js';
import { buildStrategy } from './strategy.js';
import { createReport } from './report.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const maxBodyBytes = 64 * 1024;

function page() {
  return `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AIMA · Análise local</title><style>:root{color-scheme:dark;--bg:#08111f;--panel:#101c30;--line:#28405f;--ink:#e7eefb;--muted:#9db0ca;--blue:#76b8ff;--green:#6be3b2;--yellow:#ffd166;--red:#ff8598}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at top right,#1c3c65,transparent 38%),var(--bg);color:var(--ink);font:16px/1.5 Inter,system-ui,sans-serif}main{width:min(900px,calc(100% - 32px));margin:auto;padding:48px 0}h1{font-size:clamp(2.3rem,8vw,5rem);line-height:.95;letter-spacing:-.065em;margin:0}.lead{color:var(--muted);max-width:60ch}.panel{margin-top:30px;background:var(--panel);border:1px solid var(--line);border-radius:18px;padding:22px}form{display:grid;grid-template-columns:1fr 1fr;gap:16px}label{display:grid;gap:7px;color:var(--muted);font-size:.9rem}label.full{grid-column:1/-1}input,textarea,select,button{font:inherit}input,textarea,select{padding:10px 12px;color:var(--ink);background:#0b1627;border:1px solid var(--line);border-radius:8px}textarea{min-height:90px;resize:vertical}button{grid-column:1/-1;border:0;border-radius:8px;padding:13px;background:var(--blue);color:#06101e;font-weight:800;cursor:pointer}button:disabled{opacity:.6;cursor:wait}.notice{color:var(--muted);font-size:.9rem}.result{display:none;margin-top:22px;border-left:4px solid var(--yellow);padding:16px;background:#111c2e}.result.visible{display:block}.decision{font-size:1.7rem;font-weight:800;margin:0}.no-go{color:var(--red)}.go-with-risks{color:var(--yellow)}.go{color:var(--green)}ul{padding-left:20px;color:var(--muted)}code{color:#c7ddff}@media(max-width:650px){form{grid-template-columns:1fr}}</style><main><p>AIMA AGENTIC QE · INTERFACE LOCAL</p><h1>Analise uma mudança.</h1><p class="lead">Uma interface local para o fluxo determinístico de entrada declarada. Ela não lê código, não executa comandos e não envia dados ao GitHub.</p><section class="panel"><form id="analysis"><label>ID da mudança<input name="id" value="WEB-001" required></label><label>Impacto de negócio<select name="businessImpact"><option>low</option><option selected>medium</option><option>high</option></select></label><label class="full">Resumo<input name="summary" value="Mudança analisada pela interface local" required></label><label class="full">Arquivos alterados (um por linha)<textarea name="changedFiles" required>src/payments/authorization.js</textarea></label><label>Complexidade técnica<select name="technicalComplexity"><option>low</option><option selected>medium</option><option>high</option></select></label><label>Incertezas conhecidas (uma por linha)<textarea name="knownUnknowns">Resultado de teste de regressão não fornecido.</textarea></label><button>Analisar mudança</button></form><p class="notice">A recomendação continua experimental e exige revisão humana.</p><section id="result" class="result" aria-live="polite"></section></section></main><script>const form=document.querySelector('#analysis'),result=document.querySelector('#result');form.addEventListener('submit',async(e)=>{e.preventDefault();const data=new FormData(form),lines=(name)=>String(data.get(name)).split('\\n').map(x=>x.trim()).filter(Boolean);const payload={id:data.get('id'),summary:data.get('summary'),businessImpact:data.get('businessImpact'),technicalComplexity:data.get('technicalComplexity'),changedFiles:lines('changedFiles'),knownUnknowns:lines('knownUnknowns')};const button=form.querySelector('button');button.disabled=true;button.textContent='Analisando…';try{const response=await fetch('/api/analyze',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});const body=await response.json();if(!response.ok)throw new Error(body.error);const rec=body.strategy.recommendation.toLowerCase().replaceAll(' ','-');result.innerHTML='<p class="decision '+rec+'">'+body.strategy.recommendation+'</p><p>Quality Confidence experimental: <strong>'+body.qualityConfidence.score+'/100</strong></p><p>Framework: <code>'+body.framework.name+'</code></p><p>Riscos identificados:</p><ul>'+body.risks.map(r=>'<li><strong>'+r.id+'</strong> — '+r.statement+'</li>').join('')+'</ul>';result.className='result visible'}catch(error){result.textContent='Não foi possível analisar: '+error.message;result.className='result visible'}finally{button.disabled=false;button.textContent='Analisar mudança'}});</script>`;
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBodyBytes) throw new Error('A entrada excede o limite de 64 KiB.');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export async function analyzeDeclaredChange(input) {
  const change = normalizeChangeInput(input);
  const frameworks = await loadFrameworkRegistry(path.join(root, 'aima', 'frameworks'));
  const risks = assessRisks(change);
  const confidence = qualityConfidence(risks, change.knownUnknowns);
  const policy = await loadReleasePolicy(path.join(root, 'aima', 'policies', 'evidence-aware-release.json'));
  return createReport(change, selectFramework(frameworks, change), risks, confidence, buildStrategy(risks, change.knownUnknowns, policy));
}

export async function createWebApp() {
  return createServer(async (request, response) => {
    try {
      if (request.method === 'GET' && request.url === '/') {
        response.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
        response.end(page());
        return;
      }
      if (request.method === 'POST' && request.url === '/api/analyze') {
        const report = await analyzeDeclaredChange(await readJson(request));
        response.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
        response.end(JSON.stringify(report));
        return;
      }
      response.writeHead(404, { 'content-type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify({ error: 'Rota não encontrada.' }));
    } catch (error) {
      response.writeHead(400, { 'content-type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify({ error: error.message }));
    }
  });
}

export async function startWebApp({ port = 4173 } = {}) {
  const app = await createWebApp();
  await new Promise((resolve) => app.listen(port, '127.0.0.1', resolve));
  return { app, address: `http://127.0.0.1:${app.address().port}` };
}
