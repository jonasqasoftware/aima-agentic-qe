import { createHash } from 'node:crypto';
import { basename } from 'node:path';
import { readFile } from 'node:fs/promises';

const OUTCOMES = new Set(['passed', 'failed', 'skipped']);

/** Loads AIMA's small, tool-agnostic JSON test-result contract. */
export async function loadJsonTestResults(file) {
  const content = await readFile(file, 'utf8');
  const input = JSON.parse(content);
  if (!Array.isArray(input.tests)) throw new Error('JSON test results require a tests array.');
  for (const test of input.tests) {
    if (!test?.name || !OUTCOMES.has(test.status)) throw new Error('Each JSON test requires name and status (passed, failed, or skipped).');
  }
  const failedCases = input.tests.filter((test) => test.status === 'failed').map((test) => ({ suite: test.suite || 'suite-não-informada', name: test.name, outcome: 'failed' }));
  const skipped = input.tests.filter((test) => test.status === 'skipped').length;
  const status = !input.tests.length ? 'unknown' : failedCases.length ? 'failed' : 'passed';
  return {
    id: input.id || `JSON-TESTS:${basename(file)}`,
    type: 'json-test-results',
    status,
    summary: `JSON de testes: ${input.tests.length} caso(s), ${failedCases.length} com falha e ${skipped} ignorado(s).`,
    total: input.tests.length,
    failed: failedCases.length,
    skipped,
    failedCases: failedCases.slice(0, 20),
    transcriptSha256: createHash('sha256').update(content).digest('hex'),
    parser: 'aima-json-test-results-v1'
  };
}
