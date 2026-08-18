import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeChangeInput } from './change-input.js';
import { loadFrameworkRegistry, selectFramework } from './framework-registry.js';
import { assessRisks, qualityConfidence } from './risk-engine.js';
import { loadReleasePolicy } from './release-policy.js';
import { buildStrategy } from './strategy.js';
import { createReport, writeReports } from './report.js';
import { buildDashboard } from './dashboard.js';
import { assertOperationPermitted, loadOperationPermissionPolicy } from './permission-policy.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const maxBodyBytes = 64 * 1024;

function page() {
  return `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AIMA · Análise local</title><style>:root{color-scheme:dark;--bg:#08111f;--panel:#101c30;--line:#28405f;--ink:#e7eefb;--muted:#9db0ca;--blue:#76b8ff;--green:#6be3b2;--yellow:#ffd166;--red:#ff8598}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at top right,#1c3c65,transparent 38%),var(--bg);color:var(--ink);font:16px/1.5 Inter,system-ui,sans-serif}main{width:min(900px,calc(100% - 32px));margin:auto;padding:48px 0}h1{font-size:clamp(2.3rem,8vw,5rem);line-height:.95;letter-spacing:-.065em;margin:0}.lead,.notice{color:var(--muted);max-width:60ch}.panel{margin-top:30px;background:var(--panel);border:1px solid var(--line);border-radius:18px;padding:22px}form{display:grid;grid-template-columns:1fr 1fr;gap:16px}label{display:grid;gap:7px;color:var(--muted);font-size:.9rem}label.full,.actions{grid-column:1/-1}input,textarea,select,button,a{font:inherit}input,textarea,select{padding:10px 12px;color:var(--ink);background:#0b1627;border:1px solid var(--line);border-radius:8px}textarea{min-height:90px;resize:vertical}button,a.button{border:0;border-radius:8px;padding:13px;background:var(--blue);color:#06101e;font-weight:800;cursor:pointer;text-decoration:none;text-align:center}button:disabled{opacity:.6;cursor:wait}.actions{display:grid;grid-template-columns:1fr 1fr;gap:10px}.secondary{background:transparent!important;color:var(--blue)!important;border:1px solid var(--blue)!important}.result{display:none;margin-top:22px;border-left:4px solid var(--yellow);padding:16px;background:#111c2e}.result.visible{display:block}.decision{font-size:1.7rem;font-weight:800;margin:0}.no-go{color:var(--red)}.go-with-risks{color:var(--yellow)}.go{color:var(--green)}ul{padding-left:20px;color:var(--muted)}code{color:#c7ddff}.artifacts{display:flex;flex-wrap:wrap;gap:8px}.artifacts a{color:var(--blue)}@media(max-width:650px){form,.actions{grid-template-columns:1fr}}</style><main><p>AIMA AGENTIC QE · INTERFACE LOCAL</p><h1>Analise uma mudança.</h1><p class="lead">Uma interface local para o fluxo determinístico de entrada declarada. Ela não lê código, não executa comandos e não envia dados ao GitHub.</p><section class="panel"><form id="analysis"><label>ID da mudança<input name="id" value="WEB-001" required></label><label>Impacto de negócio<select name="businessImpact"><option>low</option><option selected>medium</option><option>high</option></select></label><label class="full">Resumo<input name="summary" value="Mudança analisada pela interface local" required></label><label class="full">Arquivos alterados (um por linha)<textarea name="changedFiles" required>src/payments/authorization.js</textarea></label><label>Complexidade técnica<select name="technicalComplexity"><option>low</option><option selected>medium</option><option>high</option></select></label><label>Incertezas conhecidas (uma por linha)<textarea name="knownUnknowns">Resultado de teste de regressão não fornecido.</textarea></label><div class="actions"><button>Analisar mudança</button><button type="button" class="secondary" id="save">Gerar pacote de relatório</button></div></form><p class="notice">O pacote inclui JSON, Markdown, HTML, SARIF e manifesto. A escrita é local, dentro de <code>reports/web</code>; nenhuma ação é feita no GitHub.</p><section id="result" class="result" aria-live="polite"></section><p><a class="button secondary" href="/dashboard">Abrir dashboard local</a></p></section></main><script>const form=document.querySelector('#analysis'),result=document.querySelector('#result'),save=document.querySelector('#save');const lines=n=>String(new FormData(form).get(n)).split('\\n').map(x=>x.trim()).filter(Boolean);const payload=()=>{const d=new FormData(form);return{id:d.get('id'),summary:d.get('summary'),businessImpact:d.get('businessImpact'),technicalComplexity:d.get('technicalComplexity'),changedFiles:lines('changedFiles'),knownUnknowns:lines('knownUnknowns')}};const show=(report,artifacts)=>{const rec=report.strategy.recommendation.toLowerCase().replaceAll(' ','-');result.replaceChildren();const h=document.createElement('p');h.className='decision '+rec;h.textContent=report.strategy.recommendation;result.append(h);const confidence=document.createElement('p');confidence.textContent='Quality Confidence experimental: '+report.qualityConfidence.score+'/100';result.append(confidence);const framework=document.createElement('p');framework.textContent='Framework: '+report.framework.name;result.append(framework);const list=document.createElement('ul');for(const risk of report.risks){const item=document.createElement('li');item.textContent=risk.id+' — '+risk.statement;list.append(item)}result.append(list);if(artifacts){const title=document.createElement('p');title.textContent='Artefatos gerados localmente:';result.append(title);const links=document.createElement('div');links.className='artifacts';for(const [name,url] of Object.entries(artifacts)){const a=document.createElement('a');a.href=url;a.textContent=name.toUpperCase();links.append(a)}result.append(links)}result.className='result visible'};async function submit(endpoint,button){button.disabled=true;try{const r=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload())}),b=await r.json();if(!r.ok)throw new Error(b.error);show(b.report||b,b.artifactUrls)}catch(e){result.textContent='Não foi possível analisar: '+e.message;result.className='result visible'}finally{button.disabled=false}}form.addEventListener('submit',e=>{e.preventDefault();submit('/api/analyze',form.querySelector('button'))});save.addEventListener('click',()=>submit('/api/reports',save));</script>`;
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

function reportDirectoryFor(report, reportsDirectory) {
  const id = report.context.changeId.replaceAll(/[^a-zA-Z0-9_-]/g, '-').replaceAll(/-+/g, '-').slice(0, 80) || 'change';
  return path.join(reportsDirectory, 'web', `${id}-${new Date().toISOString().replaceAll(/[:.]/g, '-')}`);
}

export async function saveDeclaredReport(input, { reportsDirectory = path.join(root, 'reports'), permissionPolicy, userAction = false } = {}) {
  if (permissionPolicy) assertOperationPermitted(permissionPolicy, 'write-local-report', { userAction });
  const report = await analyzeDeclaredChange(input);
  const directory = reportDirectoryFor(report, path.resolve(reportsDirectory));
  const files = await writeReports(report, directory);
  return { report, directory, files };
}

function contentType(file) {
  if (file.endsWith('.html')) return 'text/html; charset=utf-8';
  if (file.endsWith('.json')) return 'application/json; charset=utf-8';
  if (file.endsWith('.md')) return 'text/markdown; charset=utf-8';
  if (file.endsWith('.sarif')) return 'application/sarif+json; charset=utf-8';
  return 'application/octet-stream';
}

function reportUrl(file, reportsDirectory) {
  return `/reports/${path.relative(reportsDirectory, file).split(path.sep).map(encodeURIComponent).join('/')}`;
}

function artifactUrls(files, reportsDirectory) {
  return {
    html: reportUrl(files.htmlPath, reportsDirectory),
    json: reportUrl(files.jsonPath, reportsDirectory),
    markdown: reportUrl(files.markdownPath, reportsDirectory),
    sarif: reportUrl(files.sarifPath, reportsDirectory),
    manifest: reportUrl(files.manifestPath, reportsDirectory)
  };
}

export async function createWebApp({ reportsDirectory = path.join(root, 'reports') } = {}) {
  const resolvedReportsDirectory = path.resolve(reportsDirectory);
  const permissionPolicy = await loadOperationPermissionPolicy(path.join(root, 'aima', 'policies', 'operation-permissions.json'));
  return createServer(async (request, response) => {
    try {
      if (request.method === 'GET' && request.url === '/') {
        response.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
        response.end(page());
        return;
      }
      if (request.method === 'POST' && request.url === '/api/analyze') {
        assertOperationPermitted(permissionPolicy, 'analyze-declared-change');
        const report = await analyzeDeclaredChange(await readJson(request));
        response.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
        response.end(JSON.stringify(report));
        return;
      }
      if (request.method === 'POST' && request.url === '/api/reports') {
        const saved = await saveDeclaredReport(await readJson(request), { reportsDirectory: resolvedReportsDirectory, permissionPolicy, userAction: true });
        response.writeHead(201, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
        response.end(JSON.stringify({ report: saved.report, artifactUrls: artifactUrls(saved.files, resolvedReportsDirectory) }));
        return;
      }
      if (request.method === 'GET' && request.url === '/api/permissions') {
        response.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
        response.end(JSON.stringify(permissionPolicy));
        return;
      }
      if (request.method === 'GET' && request.url === '/dashboard') {
        const outputFile = path.join(resolvedReportsDirectory, 'aima-quality-dashboard.html');
        await buildDashboard(resolvedReportsDirectory, outputFile, {
          linkForReport: (item) => reportUrl(item.htmlFile, resolvedReportsDirectory)
        });
        response.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
        response.end(await readFile(outputFile));
        return;
      }
      if (request.method === 'GET' && request.url?.startsWith('/reports/')) {
        const relative = decodeURIComponent(request.url.slice('/reports/'.length));
        const file = path.resolve(resolvedReportsDirectory, relative);
        if (!file.startsWith(`${resolvedReportsDirectory}${path.sep}`)) throw new Error('Caminho de relatório inválido.');
        response.writeHead(200, { 'content-type': contentType(file), 'cache-control': 'no-store' });
        response.end(await readFile(file));
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
