import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const LEVELS = new Set(['low', 'medium', 'high']);

function requireLevel(name, value) {
  if (!LEVELS.has(value)) throw new Error(`${name} must be low, medium, or high.`);
  return value;
}

/**
 * Creates a declared change from Git's local file-name diff.
 *
 * The adapter intentionally reads only file paths. It does not interpret diff
 * hunks, execute code, contact a remote or claim test evidence.
 */
export async function createChangeFromLocalDiff({ repoPath, base, head = 'HEAD', businessImpact, technicalComplexity, id, summary, includeStats = false }) {
  requireLevel('businessImpact', businessImpact);
  requireLevel('technicalComplexity', technicalComplexity);

  let stdout;
  try {
    ({ stdout } = await execFileAsync('git', ['-C', repoPath, 'diff', '--name-only', base, head]));
  } catch (error) {
    throw new Error(`Unable to read local Git diff: ${error.stderr?.trim() || error.message}`);
  }

  const changedFiles = [...new Set(stdout.split('\n').map((file) => file.trim()).filter(Boolean))];
  if (!changedFiles.length) throw new Error(`No changed files found between ${base} and ${head}.`);

  let diffStats;
  if (includeStats) {
    let numstat;
    try {
      ({ stdout: numstat } = await execFileAsync('git', ['-C', repoPath, 'diff', '--numstat', base, head]));
    } catch (error) {
      throw new Error(`Unable to read local Git diff statistics: ${error.stderr?.trim() || error.message}`);
    }
    const files = numstat.split('\n').filter(Boolean).map((line) => {
      const [added, deleted, file] = line.split('\t');
      return { file, added: added === '-' ? null : Number(added), deleted: deleted === '-' ? null : Number(deleted) };
    });
    diffStats = {
      files: files.length,
      additions: files.reduce((total, file) => total + (file.added ?? 0), 0),
      deletions: files.reduce((total, file) => total + (file.deleted ?? 0), 0),
      binaryFiles: files.filter((file) => file.added === null || file.deleted === null).length
    };
  }

  return {
    id: id || `LOCAL-DIFF:${base}..${head}`,
    summary: summary || `Alterações locais entre ${base} e ${head}`,
    source: includeStats ? 'local-git-diff-stats' : 'local-git-name-only',
    changedFiles,
    businessImpact,
    technicalComplexity,
    knownUnknowns: [
      'O adaptador local analisou somente nomes de arquivos; conteúdo do diff, resultado de testes e contexto de produto permanecem UNKNOWN.'
    ],
    declaredEvidence: [],
    artifactEvidence: [],
    diffStats
  };
}
