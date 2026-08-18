import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { executeEvidenceSpecification } from './command-evidence.js';
import { loadJUnitResults } from './junit-results.js';
import { loadJsonTestResults } from './json-test-results.js';
import { loadLcovCoverage } from './lcov-coverage.js';

export async function loadEvidenceManifest(file, { cwd = process.cwd() } = {}) {
  const manifest = JSON.parse(await readFile(file, 'utf8'));
  if (!manifest.id) throw new Error('Evidence manifest requires an id.');
  const resolve = (value) => path.resolve(path.dirname(file), value);
  const executionEvidence = manifest.command ? [await executeEvidenceSpecification(manifest.command, { cwd })] : [];
  const testResults = [];
  if (manifest.junit) testResults.push(await loadJUnitResults(resolve(manifest.junit)));
  if (manifest.testResults) testResults.push(await loadJsonTestResults(resolve(manifest.testResults)));
  let coverage;
  if (manifest.lcov) {
    coverage = await loadLcovCoverage(resolve(manifest.lcov));
    if (manifest.minLineCoverage != null && (typeof manifest.minLineCoverage !== 'number' || manifest.minLineCoverage < 0 || manifest.minLineCoverage > 100)) throw new Error('Evidence manifest minLineCoverage must be a number from 0 to 100.');
    if (manifest.minLineCoverage != null) coverage.minimum = manifest.minLineCoverage;
  }
  return { id: manifest.id, executionEvidence, testResults, coverage };
}
