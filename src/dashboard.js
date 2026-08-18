import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

function escapeHtml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

async function findReports(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return findReports(target);
    return entry.name === 'aima-quality-report.json' ? [target] : [];
  }));
  return files.flat();
}

export async function collectReportSummaries(directory) {
  const files = await findReports(directory);
  const summaries = await Promise.all(files.map(async (file) => {
    const report = JSON.parse(await readFile(file, 'utf8'));
    const metadata = await stat(file);
    return {
      file,
      htmlFile: path.join(path.dirname(file), 'aima-quality-report.html'),
      generatedAt: metadata.mtime.toISOString(),
      changeId: report.context.changeId,
      summary: report.context.summary,
      confidence: report.qualityConfidence.score,
      recommendation: report.strategy.recommendation,
      policy: report.strategy.policy?.id ?? 'UNKNOWN',
      riskCount: report.risks.length
    };
  }));
  return summaries.sort((left, right) => right.generatedAt.localeCompare(left.generatedAt));
}

function buildTrend(summaries) {
  const timeline = [...summaries].sort((left, right) => left.generatedAt.localeCompare(right.generatedAt));
  const points = timeline.map((item, index) => {
    const x = timeline.length === 1 ? 50 : (index / (timeline.length - 1)) * 100;
    const y = 100 - Math.max(0, Math.min(100, item.confidence));
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(' ');
  return { points, count: timeline.length };
}

export function formatDashboard(summaries, { linkForReport = (item) => item.htmlFile } = {}) {
  const rows = summaries.map((item) => `<tr data-search="${escapeHtml(`${item.changeId} ${item.summary} ${item.recommendation}`.toLowerCase())}"><td><a class="report" href="${escapeHtml(linkForReport(item))}">${escapeHtml(item.changeId)}</a><br><span>${escapeHtml(item.summary)}</span><br><time datetime="${escapeHtml(item.generatedAt)}">${escapeHtml(new Date(item.generatedAt).toLocaleString('pt-BR'))}</time></td><td><div class="bar"><i style="width:${Math.max(0, Math.min(100, item.confidence))}%"></i></div><b>${escapeHtml(item.confidence)}/100</b></td><td><span class="recommendation ${escapeHtml(item.recommendation.toLowerCase().replaceAll(' ', '-'))}">${escapeHtml(item.recommendation)}</span></td><td>${escapeHtml(item.riskCount)}</td><td><code>${escapeHtml(item.policy)}</code></td></tr>`).join('');
  const average = summaries.length ? Math.round(summaries.reduce((total, item) => total + item.confidence, 0) / summaries.length) : 0;
  const trend = buildTrend(summaries);
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AIMA Quality Dashboard</title><style>:root{--bg:#08111f;--panel:#101c30;--line:#28405f;--ink:#e7eefb;--muted:#9db0ca;--blue:#76b8ff;--green:#6be3b2;--yellow:#ffd166;--red:#ff8598}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at top right,#1c3c65,transparent 38%),var(--bg);color:var(--ink);font:16px/1.5 Inter,system-ui,sans-serif}main{width:min(1120px,calc(100% - 32px));margin:auto;padding:54px 0}h1{font-size:clamp(2.2rem,7vw,5rem);line-height:.95;letter-spacing:-.06em;margin:0}p{color:var(--muted)}.stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin:32px 0}.card,.trend{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:20px}.number{font-size:3rem;color:var(--blue);line-height:1;margin:8px 0}.trend{margin-bottom:26px}.trend h2{margin:0;font-size:1rem}.trend svg{width:100%;height:180px;overflow:visible}.axis{stroke:var(--line);stroke-width:1}.line{fill:none;stroke:var(--blue);stroke-width:2.5;stroke-linejoin:round;stroke-linecap:round}.point{fill:var(--green)}input{width:100%;margin:0 0 16px;padding:12px;border-radius:8px;border:1px solid var(--line);background:#0b1627;color:var(--ink);font:inherit}table{width:100%;border-collapse:collapse;background:var(--panel);border:1px solid var(--line);border-radius:16px;overflow:hidden}th,td{padding:16px;text-align:left;border-bottom:1px solid var(--line);vertical-align:middle}th{color:var(--muted);font-size:.75rem;letter-spacing:.08em;text-transform:uppercase}span,time{color:var(--muted);font-size:.9rem}.report{color:var(--blue);font-weight:700;text-decoration:none}.bar{width:140px;height:8px;background:#22324b;border-radius:99px;display:inline-block;margin-right:9px}.bar i{display:block;height:100%;border-radius:inherit;background:var(--blue)}.recommendation{font:600 12px ui-monospace,monospace;padding:5px 7px;border-radius:99px}.no-go{color:var(--red);background:#542230}.go-with-risks{color:var(--yellow);background:#4c3a12}.go{color:var(--green);background:#123f33}code{color:#c7ddff}@media(max-width:700px){main{padding-top:34px}.stats{grid-template-columns:1fr}table{font-size:.85rem}th,td{padding:10px}.bar{width:70px}}</style></head><body><main><p>AIMA AGENTIC QE · DASHBOARD LOCAL</p><h1>Qualidade em evidências.</h1><p>Visão agregada de relatórios locais. Não consulta repositórios remotos nem comprova execução de testes.</p><section class="stats"><article class="card"><span>Relatórios analisados</span><p class="number">${summaries.length}</p></article><article class="card"><span>Quality Confidence médio</span><p class="number">${average}<small>/100</small></p></article></section><section class="trend"><h2>Tendência de confiança</h2><p>${trend.count ? 'Evolução do Quality Confidence ao longo das análises locais.' : 'Gere um relatório para iniciar a tendência.'}</p><svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Tendência do Quality Confidence"><line class="axis" x1="0" y1="100" x2="100" y2="100"/><line class="axis" x1="0" y1="0" x2="0" y2="100"/><polyline class="line" points="${trend.points}"/>${trend.points.split(' ').filter(Boolean).map((point) => `<circle class="point" cx="${point.split(',')[0]}" cy="${point.split(',')[1]}" r="2"/>`).join('')}</svg></section><input id="filter" type="search" placeholder="Filtrar por mudança, resumo ou recomendação"><table><thead><tr><th>Mudança</th><th>Confiança</th><th>Recomendação</th><th>Riscos</th><th>Política</th></tr></thead><tbody>${rows || '<tr><td colspan="5">Nenhum relatório encontrado.</td></tr>'}</tbody></table></main><script>const input=document.querySelector('#filter');input?.addEventListener('input',()=>{const q=input.value.toLowerCase();for(const row of document.querySelectorAll('tbody tr[data-search]'))row.hidden=!row.dataset.search.includes(q)})</script></body></html>`;
}

export async function buildDashboard(reportsDirectory, outputFile, { linkForReport } = {}) {
  const summaries = await collectReportSummaries(reportsDirectory);
  await mkdir(path.dirname(outputFile), { recursive: true });
  const relativeLink = linkForReport ?? ((item) => path.relative(path.dirname(outputFile), item.htmlFile));
  await writeFile(outputFile, formatDashboard(summaries, { linkForReport: relativeLink }));
  return { outputFile, summaries };
}
