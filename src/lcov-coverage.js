import { createHash } from 'node:crypto';
import { basename } from 'node:path';
import { readFile } from 'node:fs/promises';

function percentage(hit, found) {
  return found ? Number(((hit / found) * 100).toFixed(2)) : null;
}

function normalizedPath(value) {
  return value.replaceAll('\\', '/').replace(/^\.\//, '');
}

function sourceLikeFile(file) {
  return /\.(?:[cm]?[jt]sx?|py|java|go|rb|php|cs|kt|swift)$/i.test(file);
}

/** Correlates only source-like changed files; documentation is not coverage debt. */
export function correlateCoverageWithChangedFiles(coverage, changedFiles) {
  const records = new Map(coverage.files.map((item) => [normalizedPath(item.file), item]));
  const relevant = changedFiles.filter(sourceLikeFile);
  const matched = relevant.flatMap((file) => {
    const normalized = normalizedPath(file);
    const record = records.get(normalized) ?? [...records.values()].find((item) => normalizedPath(item.file).endsWith(`/${normalized}`));
    return record ? [{ changedFile: file, ...record }] : [];
  });
  return {
    relevantChangedFiles: relevant,
    coveredChangedFiles: matched,
    uncoveredChangedFiles: relevant.filter((file) => !matched.some((item) => item.changedFile === file))
  };
}

/** Parses LCOV line coverage without reading source files or test logs. */
export async function loadLcovCoverage(file) {
  const content = await readFile(file, 'utf8');
  const files = [];
  let current;
  for (const line of content.split(/\r?\n/)) {
    if (line.startsWith('SF:')) current = { file: line.slice(3), found: 0, hit: 0 };
    else if (line.startsWith('DA:') && current) {
      const [, hits] = line.slice(3).split(',');
      current.found += 1;
      if (Number(hits) > 0) current.hit += 1;
    } else if (line === 'end_of_record' && current) {
      files.push({ ...current, lineCoverage: percentage(current.hit, current.found) });
      current = undefined;
    }
  }
  if (current) files.push({ ...current, lineCoverage: percentage(current.hit, current.found) });
  const found = files.reduce((sum, item) => sum + item.found, 0);
  const hit = files.reduce((sum, item) => sum + item.hit, 0);
  return {
    id: `LCOV:${basename(file)}`,
    type: 'lcov',
    summary: `LCOV: ${percentage(hit, found) ?? 'não disponível'}% de cobertura de linhas em ${files.length} arquivo(s).`,
    found,
    hit,
    lineCoverage: percentage(hit, found),
    files,
    transcriptSha256: createHash('sha256').update(content).digest('hex'),
    parser: 'lcov-line-coverage-v1'
  };
}
