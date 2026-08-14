import { createHash } from 'node:crypto';
import { basename } from 'node:path';
import { readFile } from 'node:fs/promises';

function decodeXml(value = '') {
  return value.replaceAll('&quot;', '"').replaceAll('&apos;', "'").replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&');
}

function attributes(source = '') {
  return Object.fromEntries([...source.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/g)].map(([, key, , value]) => [key, decodeXml(value)]));
}

/**
 * Parses the portable JUnit subset needed for test evidence. It reports case
 * names and outcomes but intentionally omits failure bodies and system-out,
 * which may contain sensitive application data.
 */
export async function loadJUnitResults(file) {
  const xml = await readFile(file, 'utf8');
  const cases = [];
  const expression = /<testcase\b([^>]*?)(?:\/>|>([\s\S]*?)<\/testcase>)/g;
  for (const match of xml.matchAll(expression)) {
    const details = attributes(match[1]);
    const body = match[2] ?? '';
    const outcome = /<(failure|error)\b/i.test(body) ? 'failed' : /<skipped\b/i.test(body) ? 'skipped' : 'passed';
    cases.push({ suite: details.classname || 'suite-não-informada', name: details.name || 'caso-sem-nome', outcome });
  }
  const failures = cases.filter((item) => item.outcome === 'failed');
  const skipped = cases.filter((item) => item.outcome === 'skipped');
  const status = !cases.length ? 'unknown' : failures.length ? 'failed' : 'passed';
  return {
    id: `JUNIT:${basename(file)}`,
    type: 'junit',
    status,
    summary: `JUnit: ${cases.length} caso(s), ${failures.length} com falha e ${skipped.length} ignorado(s).`,
    total: cases.length,
    failed: failures.length,
    skipped: skipped.length,
    failedCases: failures.slice(0, 20),
    transcriptSha256: createHash('sha256').update(xml).digest('hex'),
    parser: 'junit-subset-v1'
  };
}
