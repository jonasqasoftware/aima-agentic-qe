import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const STATUSES = new Set(['passed', 'failed', 'unknown']);

/**
 * Reads a local evidence summary and records the exact bytes with SHA-256.
 * Integrity of the file is verified; the claimed test outcome is not.
 */
export async function loadEvidenceArtifact(file) {
  let raw;
  let artifact;
  try {
    raw = await readFile(file);
    artifact = JSON.parse(raw.toString('utf8'));
  } catch (error) {
    throw new Error(`Unable to load evidence artifact: ${error.message}`);
  }
  if (!artifact.id || !artifact.type || !artifact.summary || !STATUSES.has(artifact.status)) {
    throw new Error('Evidence artifact requires id, type, summary, and status (passed, failed, or unknown).');
  }
  return {
    id: artifact.id,
    type: artifact.type,
    summary: artifact.summary,
    status: artifact.status,
    sha256: createHash('sha256').update(raw).digest('hex')
  };
}
