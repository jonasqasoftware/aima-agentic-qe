import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const FORBIDDEN_REFERENCES = [
  'src/index.js',
  'web-app.js',
  'writeReports',
  'saveDeclaredReport',
  'createChangeFromGitHubPr',
  'executeEvidenceCommand',
  'node:child_process',
  'node:http'
];

async function collectProductionFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectProductionFiles(entryPath)));
    } else if (entry.name.endsWith('.js')) {
      files.push(entryPath);
    }
  }
  return files;
}

async function productionFiles() {
  return [
    ...(await collectProductionFiles(path.join(packageRoot, 'src'))),
    ...(await collectProductionFiles(path.join(packageRoot, 'bin')))
  ];
}

test('production code under src/ and bin/ never references forbidden modules or write/GitHub/execute helpers', async () => {
  const files = await productionFiles();
  assert.ok(files.length > 0, 'expected production files under src/ and bin/ to scan');

  for (const file of files) {
    const source = await readFile(file, 'utf8');
    for (const reference of FORBIDDEN_REFERENCES) {
      assert.equal(
        source.includes(reference),
        false,
        `${path.relative(packageRoot, file)} must not reference "${reference}"`
      );
    }
  }
});

test('production code under src/ and bin/ never calls console.* or writes to stdout directly', async () => {
  const files = await productionFiles();

  for (const file of files) {
    const source = await readFile(file, 'utf8');
    assert.equal(
      /console\s*\.\s*\w+\s*\(/.test(source),
      false,
      `${path.relative(packageRoot, file)} must not call console.* — stdout is reserved for the MCP protocol`
    );
    assert.equal(
      /process\s*\.\s*stdout\s*\.\s*write/.test(source),
      false,
      `${path.relative(packageRoot, file)} must not write to process.stdout directly — only the MCP transport may`
    );
  }
});
