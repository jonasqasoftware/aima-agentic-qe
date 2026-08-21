import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import os from 'node:os';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { buildDashboard, collectReportSummaries, formatDashboard } from '../src/dashboard.js';

function summary({ file, generatedAt, confidence, model }) {
  return {
    file,
    htmlFile: `${file}.html`,
    generatedAt,
    changeId: file,
    summary: `mudança ${file}`,
    confidence,
    confidenceModelId: model?.id ?? null,
    confidenceModelVersion: model?.version ?? null,
    confidenceModelKey: model ? `${model.id}@${model.version}` : 'legacy-unversioned',
    recommendation: 'GO WITH RISKS',
    policy: 'evidence-aware-release',
    riskCount: 1
  };
}

const modelA = { id: 'highest-risk-residual-confidence', version: '1.0.0' };
const modelB = { id: 'highest-risk-residual-confidence', version: '2.0.0' };

// A. All reports same model → average/trend/delta preserved
test('A. all reports on the same model preserve average, trend, and delta', () => {
  const summaries = [
    summary({ file: 'r1', generatedAt: '2026-01-01T00:00:00.000Z', confidence: 60, model: modelA }),
    summary({ file: 'r2', generatedAt: '2026-01-02T00:00:00.000Z', confidence: 80, model: modelA })
  ];
  const html = formatDashboard(summaries);
  assert.match(html, /Quality Confidence médio<\/span><p class="number">70/);
  assert.match(html, /<polyline class="line" points="0\.00,40\.00 100\.00,20\.00"/);
  assert.match(html, />\+20</); // delta shown between the two same-model reports
  assert.doesNotMatch(html, /Quality Confidence de modelos diferentes/);
});

// B. Different models → no delta crosses the model boundary
test('B. mixed models never show a delta across the model boundary', () => {
  const summaries = [
    summary({ file: 'r1', generatedAt: '2026-01-01T00:00:00.000Z', confidence: 60, model: modelA }),
    summary({ file: 'r2', generatedAt: '2026-01-02T00:00:00.000Z', confidence: 80, model: modelB })
  ];
  const html = formatDashboard(summaries);
  // The second (later) report's delta cell must render as "—", not a computed number
  const rows = html.match(/<tr data-search[^>]*>.*?<\/tr>/gs);
  assert.equal(rows.length, 2);
  const r2Row = rows.find((row) => row.includes('>r2<'));
  assert.match(r2Row, /<b class="delta ">—<\/b>/);
});

// C. Different models → global average not presented as comparable
test('C. mixed models do not present a global average', () => {
  const summaries = [
    summary({ file: 'r1', generatedAt: '2026-01-01T00:00:00.000Z', confidence: 60, model: modelA }),
    summary({ file: 'r2', generatedAt: '2026-01-02T00:00:00.000Z', confidence: 80, model: modelB })
  ];
  const html = formatDashboard(summaries);
  assert.match(html, /Quality Confidence médio<\/span><p class="number">—/);
});

// D. Different models → no continuous trend is presented
test('D. mixed models do not present a continuous trend', () => {
  const summaries = [
    summary({ file: 'r1', generatedAt: '2026-01-01T00:00:00.000Z', confidence: 60, model: modelA }),
    summary({ file: 'r2', generatedAt: '2026-01-02T00:00:00.000Z', confidence: 80, model: modelB })
  ];
  const html = formatDashboard(summaries);
  assert.match(html, /<polyline class="line" points=""/);
  assert.match(html, /Tendência não exibida: os relatórios pertencem a modelos de Quality Confidence diferentes\./);
  assert.match(html, /Quality Confidence de modelos diferentes não é diretamente comparável\./);
  // Individual scores remain visible even when the trend/average are withheld
  assert.match(html, />60\/100</);
  assert.match(html, />80\/100</);
});

// E. Legacy reports (no model metadata) still render
test('E. legacy reports without model metadata still render in the dashboard', async () => {
  const reportsDirectory = await mkdtemp(path.join(os.tmpdir(), 'aima-dashboard-legacy-'));
  const reportDirectory = path.join(reportsDirectory, 'run-1');
  await mkdir(reportDirectory);
  await writeFile(path.join(reportDirectory, 'aima-quality-report.json'), JSON.stringify({
    context: { changeId: 'LEGACY-1', summary: 'Relatório legado sem metadata de modelo' },
    qualityConfidence: { score: 55 },
    strategy: { recommendation: 'GO WITH RISKS', policy: { id: 'evidence-aware-release' } },
    risks: [{ id: 'R-ONE' }]
  }));
  const outputFile = path.join(reportsDirectory, 'dashboard.html');
  const dashboard = await buildDashboard(reportsDirectory, outputFile);
  assert.equal(dashboard.summaries.length, 1);
  assert.equal(dashboard.summaries[0].confidenceModelKey, 'legacy-unversioned');
  assert.equal(dashboard.summaries[0].confidenceModelId, null);
  const html = await import('node:fs/promises').then((fs) => fs.readFile(outputFile, 'utf8'));
  assert.match(html, /legacy-unversioned/);
  assert.match(html, />55\/100</);
});

// collectReportSummaries wires model metadata from a real, freshly-shaped report
test('collectReportSummaries reads confidence model metadata from a versioned report', async () => {
  const reportsDirectory = await mkdtemp(path.join(os.tmpdir(), 'aima-dashboard-model-'));
  const reportDirectory = path.join(reportsDirectory, 'run-1');
  await mkdir(reportDirectory);
  await writeFile(path.join(reportDirectory, 'aima-quality-report.json'), JSON.stringify({
    context: { changeId: 'MODEL-1', summary: 'Relatório com modelo versionado' },
    qualityConfidence: { score: 69, model: modelA },
    strategy: { recommendation: 'GO WITH RISKS', policy: { id: 'evidence-aware-release' } },
    risks: [{ id: 'R-ONE' }]
  }));
  const summaries = await collectReportSummaries(reportsDirectory);
  assert.equal(summaries[0].confidenceModelId, modelA.id);
  assert.equal(summaries[0].confidenceModelVersion, modelA.version);
  assert.equal(summaries[0].confidenceModelKey, `${modelA.id}@${modelA.version}`);
});
