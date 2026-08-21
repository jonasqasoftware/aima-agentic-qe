import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { frameworks, lexicon, insights } from '../site/content.mjs';
import { build, BROWSER_CORE_FILES, distSite, coreDirectory, generatedDirectory } from './build-site.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const site = join(root, 'site');
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

check(frameworks.length === 20, `Esperados 20 frameworks; encontrados ${frameworks.length}.`);
check(new Set(frameworks.map((item) => item.slug)).size === 20, 'Slugs de frameworks precisam ser únicos.');
check(lexicon.length === 28, `Esperados 28 conceitos; encontrados ${lexicon.length}.`);
check(new Set(lexicon.map((item) => item.term)).size === 28, 'Termos do léxico precisam ser únicos.');
check(insights.length >= 3, 'AIMA Insights deve possuir pelo menos três textos iniciais.');

const sitemapPath = join(site, 'sitemap.xml');
check(existsSync(join(site, 'index.html')), 'site/index.html ausente.');
check(existsSync(join(site, 'assessment.html')), 'site/assessment.html ausente.');
check(existsSync(join(site, 'preview.html')), 'site/preview.html ausente.');
check(existsSync(join(site, 'analyze.html')), 'site/analyze.html ausente.');
check(existsSync(join(site, 'analyze.mjs')), 'site/analyze.mjs ausente.');
check(existsSync(sitemapPath), 'site/sitemap.xml ausente.');
const sitemap = existsSync(sitemapPath) ? readFileSync(sitemapPath, 'utf8') : '';

for (const framework of frameworks) {
  const relative = `frameworks/${framework.slug}.html`;
  const file = join(site, relative);
  check(existsSync(file), `${relative} ausente.`);
  if (!existsSync(file)) continue;
  const html = readFileSync(file, 'utf8');
  check(html.includes(`data-framework="${framework.slug}"`), `${relative} não referencia o slug canônico.`);
  check(html.includes(`https://aima20.dev/${relative}`), `${relative} não possui canonical esperado.`);
  check(sitemap.includes(`https://aima20.dev/${relative}`), `${relative} não está no sitemap.`);
}

for (const insight of insights) {
  const relative = `insights/${insight.slug}.html`;
  check(existsSync(join(site, relative)), `${relative} ausente.`);
  check(sitemap.includes(`https://aima20.dev/${relative}`), `${relative} não está no sitemap.`);
}

// Build the deployable artifact and validate it — this is the one place
// dist/site is asserted to exist and be correct. dist/ is generated, never
// committed (see .gitignore); every run here recreates it from scratch.
const { frameworks: builtFrameworks, releasePolicy: builtReleasePolicy } = await build();

check(existsSync(join(distSite, 'analyze.html')), 'dist/site/analyze.html ausente após o build.');
check(existsSync(join(distSite, 'analyze.mjs')), 'dist/site/analyze.mjs ausente após o build.');

for (const file of BROWSER_CORE_FILES) {
  const sourcePath = join(root, 'src', file);
  const copiedPath = join(coreDirectory, file);
  check(existsSync(copiedPath), `dist/site/core/${file} ausente após o build.`);
  if (!existsSync(copiedPath)) continue;
  const sourceContent = readFileSync(sourcePath, 'utf8');
  const copiedContent = readFileSync(copiedPath, 'utf8');
  check(sourceContent === copiedContent, `dist/site/core/${file} não é idêntico a src/${file} — fonte de verdade duplicada manualmente.`);
  check(!/from\s+['"]node:/.test(copiedContent), `dist/site/core/${file} não pode importar um módulo node: — deixa de ser portável para o navegador.`);
}

const generatedDataPath = join(generatedDirectory, 'aima-data.mjs');
check(existsSync(generatedDataPath), 'dist/site/generated/aima-data.mjs ausente após o build.');
if (existsSync(generatedDataPath)) {
  const generatedModule = await import(pathToFileURL(generatedDataPath).href);
  check(
    JSON.stringify(generatedModule.frameworks) === JSON.stringify(builtFrameworks),
    'dist/site/generated/aima-data.mjs frameworks divergem da fonte canônica lida de aima/frameworks.'
  );
  check(
    JSON.stringify(generatedModule.releasePolicy) === JSON.stringify(builtReleasePolicy),
    'dist/site/generated/aima-data.mjs releasePolicy diverge da fonte canônica lida de aima/policies.'
  );
}

if (failures.length) {
  console.error('AIMA site validation failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(
  `AIMA site OK: ${frameworks.length} frameworks, ${lexicon.length} conceitos, ${insights.length} insights. ` +
  `Artefato dist/site validado: ${BROWSER_CORE_FILES.length} módulo(s) de core, ${builtFrameworks.length} framework(s) gerado(s).`
);
