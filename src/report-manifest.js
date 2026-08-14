import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

function hash(content) {
  return createHash('sha256').update(content).digest('hex');
}

export function createReportManifest(report, artifacts) {
  return {
    manifestVersion: '1.0.0',
    reportVersion: report.reportVersion,
    evidenceBoundary: report.evidenceBoundary,
    artifacts: Object.entries(artifacts).map(([filename, content]) => ({
      filename,
      bytes: Buffer.byteLength(content),
      sha256: hash(content)
    }))
  };
}

export async function verifyReportManifest(directory) {
  const source = await readFile(path.join(directory, 'aima-quality-report.manifest.json'), 'utf8');
  const manifest = JSON.parse(source);
  if (!Array.isArray(manifest.artifacts)) throw new Error('Report manifest is missing artifacts.');
  const checks = await Promise.all(manifest.artifacts.map(async (artifact) => {
    try {
      const content = await readFile(path.join(directory, artifact.filename));
      const actual = hash(content);
      return { filename: artifact.filename, valid: actual === artifact.sha256, expected: artifact.sha256, actual };
    } catch (error) {
      return { filename: artifact.filename, valid: false, error: error.message };
    }
  }));
  return { manifest, checks, valid: checks.every((check) => check.valid) };
}
