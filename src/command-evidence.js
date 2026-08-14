import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

function transcriptHash(stdout, stderr) {
  return createHash('sha256').update(stdout).update('\n--- stderr ---\n').update(stderr).digest('hex');
}

/**
 * Executes only a user-provided structured command through execFile (never a
 * shell). The report keeps status and a transcript hash, not raw output, to
 * avoid making test logs or incidental secrets part of an evidence report.
 */
export async function executeEvidenceCommand(file, { cwd = process.cwd() } = {}) {
  const specification = JSON.parse(await readFile(file, 'utf8'));
  if (!specification.id || !specification.command || !Array.isArray(specification.args ?? [])) {
    throw new Error('Evidence command requires id, command, and optional args array.');
  }
  if (!specification.args.every((argument) => typeof argument === 'string')) {
    throw new Error('Each evidence command argument must be a string.');
  }
  try {
    const { stdout = '', stderr = '' } = await execFileAsync(specification.command, specification.args ?? [], {
      cwd,
      timeout: 60_000,
      maxBuffer: 1024 * 1024
    });
    return {
      id: specification.id,
      type: 'command',
      status: 'passed',
      summary: specification.summary || `${specification.command} terminou com código 0.`,
      command: specification.command,
      args: specification.args ?? [],
      exitCode: 0,
      transcriptSha256: transcriptHash(stdout, stderr)
    };
  } catch (error) {
    const stdout = error.stdout ?? '';
    const stderr = error.stderr ?? error.message;
    return {
      id: specification.id,
      type: 'command',
      status: 'failed',
      summary: specification.summary || `${specification.command} terminou com falha.`,
      command: specification.command,
      args: specification.args ?? [],
      exitCode: Number.isInteger(error.code) ? error.code : null,
      transcriptSha256: transcriptHash(stdout, stderr)
    };
  }
}
