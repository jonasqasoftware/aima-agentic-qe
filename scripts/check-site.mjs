import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { frameworks, lexicon, insights } from '../site/content.mjs';
import { edition } from '../site/edition.mjs';
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

// --- Preview Edition metadata (site/edition.mjs) --------------------------
check(/^\d+\.\d+$/.test(edition.version), `edition.version deve seguir o formato N.N; encontrado "${edition.version}".`);
check(typeof edition.label === 'string' && edition.label.trim().length > 0, 'edition.label deve ser uma string não vazia.');
const ALLOWED_EDITION_STATUSES = ['preview'];
check(ALLOWED_EDITION_STATUSES.includes(edition.status), `edition.status deve pertencer a ${JSON.stringify(ALLOWED_EDITION_STATUSES)}; encontrado "${edition.status}".`);
check(edition.frameworksCount === frameworks.length, `edition.frameworksCount (${edition.frameworksCount}) diverge de frameworks.length (${frameworks.length}).`);
check(edition.conceptsCount === lexicon.length, `edition.conceptsCount (${edition.conceptsCount}) diverge de lexicon.length (${lexicon.length}).`);
check(edition.diagramsCount === frameworks.length, `edition.diagramsCount (${edition.diagramsCount}) diverge de frameworks.length (${frameworks.length}).`);

// Textual approximation of comment stripping — NOT a JS parser. Removes
// /* */ blocks and // line comments (the (^|[^:]) guard on the line-comment
// branch avoids treating "https://" as a comment start) so a comment that
// *mentions* import/export/version syntax in prose is never mistaken for
// real code. It can still be fooled by that same syntax appearing inside a
// string literal — accepted here because edition.mjs and the three
// consumer modules below are small, fully authored by us, and never
// contain such strings.
function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function countOccurrences(text, substring) {
  return substring ? text.split(substring).length - 1 : 0;
}

// site/edition.mjs must declare the Preview Edition version independently of
// package.json — enforced by inspecting its actual import graph, not by a
// substring scan (the file's own comment legitimately mentions
// "package.json" in prose). LIMITATION: this is a textual regex over
// source, not an AST — it can be fooled by import/export syntax appearing
// inside a string literal. Accepted because edition.mjs is intentionally
// minimal and never contains such a string.
const IMPORT_PATTERN = /\bimport\s+(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]\s*;/g;
const DYNAMIC_IMPORT_PATTERN = /\bimport\s*\(/;
const RE_EXPORT_PATTERN = /\bexport\s+(?:\*(?:\s+as\s+[$\w]+)?|\{[^}]*\})\s+from\s+['"]([^'"]+)['"]/g;

function checkEditionIndependence(relativePath) {
  const filePath = join(site, relativePath);
  if (!existsSync(filePath)) return;
  const source = stripComments(readFileSync(filePath, 'utf8'));

  const staticImports = [...source.matchAll(IMPORT_PATTERN)].map((match) => match[1]);
  check(
    staticImports.length === 1 && staticImports[0] === './content.mjs',
    `site/${relativePath} deve ter exatamente um import estático, de ./content.mjs; encontrado(s): ${staticImports.join(', ') || 'nenhum'}.`
  );
  check(!DYNAMIC_IMPORT_PATTERN.test(source), `site/${relativePath} não pode usar import() dinâmico.`);

  const reExports = [...source.matchAll(RE_EXPORT_PATTERN)].map((match) => match[1]);
  check(reExports.length === 0, `site/${relativePath} não pode reexportar de outro módulo (export ... from ...): ${reExports.join(', ')}.`);
}

checkEditionIndependence('edition.mjs');

const sitemapPath = join(site, 'sitemap.xml');
check(existsSync(join(site, 'index.html')), 'site/index.html ausente.');
check(existsSync(join(site, 'assessment.html')), 'site/assessment.html ausente.');
check(existsSync(join(site, 'preview.html')), 'site/preview.html ausente.');
check(existsSync(join(site, 'insights.html')), 'site/insights.html ausente.');
check(existsSync(join(site, 'analyze.html')), 'site/analyze.html ausente.');
check(existsSync(join(site, 'analyze.mjs')), 'site/analyze.mjs ausente.');
check(existsSync(join(site, 'como-usar.html')), 'site/como-usar.html ausente.');
check(existsSync(sitemapPath), 'site/sitemap.xml ausente.');
const sitemap = existsSync(sitemapPath) ? readFileSync(sitemapPath, 'utf8') : '';

check(sitemap.includes('https://aima20.dev/analyze.html'), 'analyze.html não está no sitemap.');
check(sitemap.includes('https://aima20.dev/como-usar.html'), 'como-usar.html não está no sitemap.');

// Both the analyzer and the assessment declare, on their own pages, that
// input is processed locally and never sent to a server. This guardrail
// makes that claim mechanically enforced, not just documented, for every
// file that carries the promise — not just one of them.
const NETWORK_API_PATTERN = /\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b|\bnavigator\.sendBeacon\b|\bEventSource\b/;

function checkNoNetworkApi(relativePath) {
  const filePath = join(site, relativePath);
  if (!existsSync(filePath)) return;
  const source = readFileSync(filePath, 'utf8');
  check(
    !NETWORK_API_PATTERN.test(source),
    `site/${relativePath} não pode conter fetch(), XMLHttpRequest, WebSocket, sendBeacon ou EventSource — a análise deve permanecer local ao navegador.`
  );
}

checkNoNetworkApi('analyze.mjs');
checkNoNetworkApi('assessment.mjs');

// --- Preview Edition consistency across site/ ------------------------------
// Guards against a release version hardcoded back into a module that
// already consumes edition.version. The negative scan runs on comment-
// stripped source so a comment like "antes era Release 0.9" can never trip
// it; the positive check (interpolation present) runs on the raw source.
const HARDCODED_RELEASE_VERSION_PATTERN = /\bRelease\s+\d+(\.\d+)+/i;

function checkNoHardcodedEditionVersion(relativePath, expectedSnippet) {
  const filePath = join(site, relativePath);
  if (!existsSync(filePath)) return;
  const source = readFileSync(filePath, 'utf8');
  check(source.includes(expectedSnippet), `site/${relativePath} deve interpolar edition.version (esperado: "${expectedSnippet}").`);
  check(
    !HARDCODED_RELEASE_VERSION_PATTERN.test(stripComments(source)),
    `site/${relativePath} contém uma versão de release hardcoded fora de comentários — deve vir de edition.version.`
  );
}

checkNoHardcodedEditionVersion('layout.mjs', 'Release ${edition.version}');
checkNoHardcodedEditionVersion('framework.mjs', 'RELEASE ${edition.version}');
checkNoHardcodedEditionVersion('insight.mjs', 'RELEASE ${edition.version}');

function extractHead(html) {
  const match = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  return match ? match[1] : '';
}

function extractBody(html) {
  const match = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  return match ? match[1] : '';
}

function extractMetaContent(head, attrName, attrValue) {
  const pattern = new RegExp(
    `<meta\\s+[^>]*\\b${attrName}="${attrValue}"[^>]*\\bcontent="([^"]*)"[^>]*>` +
    `|<meta\\s+[^>]*\\bcontent="([^"]*)"[^>]*\\b${attrName}="${attrValue}"[^>]*>`,
    'i'
  );
  const match = head.match(pattern);
  return match ? (match[1] ?? match[2]) : null;
}

function extractTitle(head) {
  const match = head.match(/<title>([\s\S]*?)<\/title>/i);
  return match ? match[1] : null;
}

// index.html and preview.html keep <head> metadata static (title, meta
// description, Open Graph tags) for SEO/social-preview crawlers that don't
// reliably execute JS. Each tag is validated individually, on its own
// extracted content — not a whole-file substring search — so the required
// values must all appear together in the specific tag that carries them.
function checkIndexHead() {
  const filePath = join(site, 'index.html');
  if (!existsSync(filePath)) return;
  const head = extractHead(readFileSync(filePath, 'utf8'));

  const description = extractMetaContent(head, 'name', 'description');
  check(description !== null, 'site/index.html: <meta name="description"> ausente.');
  if (description !== null) {
    check(
      description.includes(`${edition.frameworksCount} frameworks`) && description.includes(`${edition.conceptsCount} conceitos`),
      `site/index.html: meta description não reflete os contadores de edition.mjs (conteúdo: "${description}").`
    );
  }

  const ogDescription = extractMetaContent(head, 'property', 'og:description');
  check(ogDescription !== null, 'site/index.html: <meta property="og:description"> ausente.');
  if (ogDescription !== null) {
    check(
      ogDescription.includes(`${edition.conceptsCount} conceitos`) &&
        ogDescription.includes(`${edition.frameworksCount} frameworks`) &&
        ogDescription.includes(`${edition.diagramsCount} diagramas`),
      `site/index.html: og:description não reflete os contadores de edition.mjs (conteúdo: "${ogDescription}").`
    );
  }
}

function checkPreviewHead() {
  const filePath = join(site, 'preview.html');
  if (!existsSync(filePath)) return;
  const head = extractHead(readFileSync(filePath, 'utf8'));

  const description = extractMetaContent(head, 'name', 'description');
  check(description !== null, 'site/preview.html: <meta name="description"> ausente.');
  if (description !== null) {
    check(
      description.includes(`${edition.label} ${edition.version}`),
      `site/preview.html: meta description não contém "${edition.label} ${edition.version}" (conteúdo: "${description}").`
    );
    check(
      description.includes(`${edition.conceptsCount} conceitos`) &&
        description.includes(`${edition.frameworksCount} frameworks`) &&
        description.includes(`${edition.diagramsCount} diagramas`),
      `site/preview.html: meta description não contém os contadores de edition.mjs no mesmo trecho (conteúdo: "${description}").`
    );
  }

  const ogTitle = extractMetaContent(head, 'property', 'og:title');
  check(ogTitle !== null, 'site/preview.html: <meta property="og:title"> ausente.');
  if (ogTitle !== null) {
    check(
      ogTitle.includes(`${edition.label} ${edition.version}`),
      `site/preview.html: og:title não contém "${edition.label} ${edition.version}" (conteúdo: "${ogTitle}").`
    );
  }

  const title = extractTitle(head);
  check(title !== null, 'site/preview.html: <title> ausente.');
  if (title !== null) {
    check(
      title.includes(`${edition.label} ${edition.version}`),
      `site/preview.html: <title> não contém "${edition.label} ${edition.version}" (conteúdo: "${title}").`
    );
  }
}

checkIndexHead();
checkPreviewHead();

const EDITION_HOOK_FIELDS = {
  'data-edition-label': 'label',
  'data-edition-version': 'version',
  'data-edition-frameworks-count': 'frameworksCount',
  'data-edition-concepts-count': 'conceptsCount',
  'data-edition-diagrams-count': 'diagramsCount'
};

// Counted directly from the current markup of each file — not carried over
// from any earlier estimate.
const EXPECTED_EDITION_HOOK_COUNTS = {
  'index.html': {
    'data-edition-label': 2,
    'data-edition-version': 5,
    'data-edition-frameworks-count': 2,
    'data-edition-concepts-count': 2,
    'data-edition-diagrams-count': 2
  },
  'preview.html': {
    'data-edition-label': 0,
    'data-edition-version': 5,
    'data-edition-frameworks-count': 3,
    'data-edition-concepts-count': 2,
    'data-edition-diagrams-count': 2
  }
};

// Depth-aware close-tag finder — required because the hook attribute can sit
// on a tag nested inside another tag of the SAME name with no attribute
// (index.html: an attribute-less <span> wraps <span data-edition-version>).
// A naive non-greedy open/close regex over the whole document would consume
// that inner match as part of the outer (discarded) one and skip it
// entirely. This walks forward from just past the opening tag, tracking
// nesting depth of the same tag name, and returns null on unbalanced markup.
function findMatchingClose(html, tagName, searchFrom) {
  const openPattern = new RegExp(`<${tagName}\\b`, 'gi');
  const closePattern = new RegExp(`<\\/${tagName}>`, 'gi');
  let depth = 1;
  let cursor = searchFrom;
  while (depth > 0) {
    openPattern.lastIndex = cursor;
    closePattern.lastIndex = cursor;
    const nextOpen = openPattern.exec(html);
    const nextClose = closePattern.exec(html);
    if (!nextClose) return null;
    if (nextOpen && nextOpen.index < nextClose.index) {
      depth += 1;
      cursor = nextOpen.index + nextOpen[0].length;
    } else {
      depth -= 1;
      cursor = nextClose.index + nextClose[0].length;
      if (depth === 0) return nextClose.index;
    }
  }
  return null;
}

// Finds every opening tag independently (matchAll over opening tags only,
// never consuming closes as part of the same match), so same-tag nesting
// can never hide an occurrence. The hook attribute may sit anywhere among
// the tag's other attributes. Content that contains nested markup is
// returned as-is (not skipped) so the caller can fail on it explicitly
// rather than silently ignoring the element.
function extractEditionHookOccurrences(html, attribute) {
  const openTagPattern = /<([a-z][a-z0-9]*)((?:\s+[a-zA-Z][\w-]*(?:="[^"]*")?)*)\s*>/g;
  const attributePresent = new RegExp(`(?:^|\\s)${attribute}(?=$|[\\s=])`);
  const occurrences = [];
  for (const match of html.matchAll(openTagPattern)) {
    const [fullMatch, tagName, attrs] = match;
    if (!attributePresent.test(attrs)) continue;
    const contentStart = match.index + fullMatch.length;
    const closeIndex = findMatchingClose(html, tagName, contentStart);
    if (closeIndex === null) {
      occurrences.push({ ok: false, reason: 'tag sem fechamento correspondente' });
      continue;
    }
    occurrences.push({ ok: true, content: html.slice(contentStart, closeIndex) });
  }
  return occurrences;
}

// Hooks are counted and validated exclusively within <body> — a hook that
// migrated into <head>, or one missing from <body>, can never be masked by
// an occurrence outside <body>.
function checkEditionHooksInHtml(relativePath) {
  const filePath = join(site, relativePath);
  if (!existsSync(filePath)) return;
  const html = readFileSync(filePath, 'utf8');
  const body = extractBody(html);
  check(body.length > 0, `site/${relativePath}: <body> ausente ou vazio.`);
  const expectedCounts = EXPECTED_EDITION_HOOK_COUNTS[relativePath];
  for (const [attribute, field] of Object.entries(EDITION_HOOK_FIELDS)) {
    const expectedValue = String(edition[field]);
    const expectedCount = expectedCounts[attribute];
    const occurrences = extractEditionHookOccurrences(body, attribute);
    check(
      occurrences.length === expectedCount,
      `site/${relativePath}: esperada(s) ${expectedCount} ocorrência(s) de [${attribute}]; encontrada(s) ${occurrences.length}.`
    );
    occurrences.forEach((occurrence, index) => {
      if (!occurrence.ok) {
        check(false, `site/${relativePath}: ocorrência #${index + 1} de [${attribute}] ${occurrence.reason}.`);
        return;
      }
      check(
        !occurrence.content.includes('<'),
        `site/${relativePath}: ocorrência #${index + 1} de [${attribute}] contém markup aninhado — deve ser somente o valor textual.`
      );
      check(occurrence.content.trim().length > 0, `site/${relativePath}: ocorrência #${index + 1} de [${attribute}] tem fallback vazio.`);
      check(
        occurrence.content === expectedValue,
        `site/${relativePath}: ocorrência #${index + 1} de [${attribute}] tem fallback "${occurrence.content}", esperado "${expectedValue}".`
      );
    });
  }
}

checkEditionHooksInHtml('index.html');
checkEditionHooksInHtml('preview.html');

// The three intentionally-uppercase "PREVIEW EDITION" badges don't carry
// data-edition-label (their casing doesn't match edition.label) but must
// still track it — counted within <body>, not substring-searched, so a
// corrupted second occurrence can't hide behind a correct first one.
function checkUppercaseLabelOccurrences(relativePath, expectedCount) {
  const filePath = join(site, relativePath);
  if (!existsSync(filePath)) return;
  const body = extractBody(readFileSync(filePath, 'utf8'));
  const uppercaseLabel = edition.label.toUpperCase();
  const actualCount = countOccurrences(body, uppercaseLabel);
  check(
    actualCount === expectedCount,
    `site/${relativePath}: esperada(s) ${expectedCount} ocorrência(s) estática(s) de "${uppercaseLabel}" no body; encontrada(s) ${actualCount}.`
  );
}

checkUppercaseLabelOccurrences('index.html', 2);
checkUppercaseLabelOccurrences('preview.html', 1);

function checkAriaLabelReflectsEdition(relativePath, expected) {
  const filePath = join(site, relativePath);
  if (!existsSync(filePath)) return;
  const body = extractBody(readFileSync(filePath, 'utf8'));
  check(body.includes(expected), `site/${relativePath}: aria-label esperado "${expected}" não encontrado no body.`);
}

checkAriaLabelReflectsEdition('index.html', `aria-label="Conteúdo da ${edition.label}"`);

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

const editionSourcePath = join(site, 'edition.mjs');
const editionCopiedPath = join(distSite, 'edition.mjs');
check(existsSync(editionCopiedPath), 'dist/site/edition.mjs ausente após o build.');
if (existsSync(editionCopiedPath) && existsSync(editionSourcePath)) {
  check(
    readFileSync(editionSourcePath, 'utf8') === readFileSync(editionCopiedPath, 'utf8'),
    'dist/site/edition.mjs não é idêntico a site/edition.mjs — fonte de verdade duplicada.'
  );
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
