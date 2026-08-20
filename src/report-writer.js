import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createReportManifest } from './report-manifest.js';
import { formatHtml, formatMarkdown, formatSarif } from './report.js';

export async function writeReports(report, directory) {
  await mkdir(directory, { recursive: true });
  const jsonPath = path.join(directory, 'aima-quality-report.json');
  const markdownPath = path.join(directory, 'aima-quality-report.md');
  const htmlPath = path.join(directory, 'aima-quality-report.html');
  const sarifPath = path.join(directory, 'aima-quality-report.sarif');
  const manifestPath = path.join(directory, 'aima-quality-report.manifest.json');
  const artifacts = {
    'aima-quality-report.json': `${JSON.stringify(report, null, 2)}\n`,
    'aima-quality-report.md': formatMarkdown(report),
    'aima-quality-report.html': formatHtml(report),
    'aima-quality-report.sarif': `${JSON.stringify(formatSarif(report), null, 2)}\n`
  };
  const manifest = createReportManifest(report, artifacts);
  await Promise.all([
    ...Object.entries(artifacts).map(([filename, content]) => writeFile(path.join(directory, filename), content)),
    writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
  ]);
  return { jsonPath, markdownPath, htmlPath, sarifPath, manifestPath };
}
