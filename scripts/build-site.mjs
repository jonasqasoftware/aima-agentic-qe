import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadFrameworkRegistry } from '../src/framework-registry.js';
import { loadReleasePolicy } from '../src/release-policy.js';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const siteSource = path.join(root, 'site');
export const distDirectory = path.join(root, 'dist');
export const distSite = path.join(distDirectory, 'site');
export const coreDirectory = path.join(distSite, 'core');
export const generatedDirectory = path.join(distSite, 'generated');

// Every file here must have zero `node:` imports — it is copied verbatim into
// dist/site/core and loaded as a browser ES module by site/analyze.mjs.
export const BROWSER_CORE_FILES = [
  'change-input-core.js',
  'framework-selection.js',
  'risk-engine.js',
  'strategy.js',
  'report.js',
  'evidence-ledger.js',
  'analyze-change.js'
];

function serializeModule(name, value) {
  return `export const ${name} = ${JSON.stringify(value, null, 2)};\n`;
}

export async function build() {
  await rm(distDirectory, { recursive: true, force: true });
  await mkdir(distSite, { recursive: true });
  await cp(siteSource, distSite, { recursive: true });

  await mkdir(coreDirectory, { recursive: true });
  for (const file of BROWSER_CORE_FILES) {
    await cp(path.join(root, 'src', file), path.join(coreDirectory, file));
  }

  const frameworks = await loadFrameworkRegistry(path.join(root, 'aima', 'frameworks'));
  const releasePolicy = await loadReleasePolicy(path.join(root, 'aima', 'policies', 'evidence-aware-release.json'));

  await mkdir(generatedDirectory, { recursive: true });
  const generatedContent = [
    '// Gerado automaticamente por scripts/build-site.mjs a partir de aima/frameworks/*.yaml',
    '// e aima/policies/evidence-aware-release.json. Não edite manualmente — este arquivo',
    '// não é versionado (ver .gitignore) e é recriado a cada `npm run build:site`.',
    '',
    serializeModule('frameworks', frameworks).trimEnd(),
    '',
    serializeModule('releasePolicy', releasePolicy).trimEnd(),
    ''
  ].join('\n');
  await writeFile(path.join(generatedDirectory, 'aima-data.mjs'), generatedContent);

  return { frameworks, releasePolicy, coreFiles: BROWSER_CORE_FILES };
}

const isMain = import.meta.url === pathToFileURL(process.argv[1] ?? '').href;
if (isMain) {
  build()
    .then(({ frameworks, releasePolicy, coreFiles }) => {
      process.stdout.write(
        `Build do site gerado em dist/site: ${coreFiles.length} módulo(s) de core, ` +
        `${frameworks.length} framework(s), política "${releasePolicy.id}" v${releasePolicy.version}.\n`
      );
    })
    .catch((error) => {
      process.stderr.write(`${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`);
      process.exitCode = 1;
    });
}
