import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { frameworks, lexicon, insights } from '../site/content.mjs';

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

if (failures.length) {
  console.error('AIMA site validation failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`AIMA site OK: ${frameworks.length} frameworks, ${lexicon.length} conceitos, ${insights.length} insights.`);
