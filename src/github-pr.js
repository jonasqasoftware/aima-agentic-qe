import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const LEVELS = new Set(['low', 'medium', 'high']);

function validateRepo(repo) {
  if (!/^[^/\s]+\/[^/\s]+$/.test(repo)) throw new Error('--repo must use the owner/repository format.');
}

function validateLevel(name, value) {
  if (!LEVELS.has(value)) throw new Error(`${name} must be low, medium, or high.`);
}

async function ghApi(endpoint) {
  try {
    const args = endpoint.includes('/files?') ? ['api', '--paginate', endpoint] : ['api', endpoint];
    const { stdout } = await execFileAsync('gh', args);
    return JSON.parse(stdout);
  } catch (error) {
    throw new Error(`Unable to read GitHub PR data: ${error.stderr?.trim() || error.message}`);
  }
}

/**
 * Reads authenticated GitHub PR metadata and its changed-file names via gh.
 * Diff hunks, CI results, review status, and business context deliberately
 * remain unknown; this adapter never treats GitHub metadata as test evidence.
 */
export async function createChangeFromGitHubPr({ repo, number, businessImpact, technicalComplexity, api = ghApi }) {
  validateRepo(repo);
  if (!Number.isSafeInteger(Number(number)) || Number(number) <= 0) throw new Error('--pr must be a positive integer.');
  validateLevel('businessImpact', businessImpact);
  validateLevel('technicalComplexity', technicalComplexity);

  const prNumber = Number(number);
  const [pullRequest, files] = await Promise.all([
    api(`repos/${repo}/pulls/${prNumber}`),
    api(`repos/${repo}/pulls/${prNumber}/files?per_page=100`)
  ]);
  if (!pullRequest?.title || !Array.isArray(files)) throw new Error('GitHub returned an incomplete PR response.');
  const changedFiles = [...new Set(files.map((file) => file.filename).filter(Boolean))];
  if (!changedFiles.length) throw new Error(`GitHub PR #${prNumber} has no changed files.`);

  return {
    id: `GITHUB-PR:${repo}#${prNumber}`,
    summary: `PR #${prNumber}: ${pullRequest.title}`,
    source: 'github-pr-metadata',
    changedFiles,
    businessImpact,
    technicalComplexity,
    knownUnknowns: [
      'O adaptador GitHub leu apenas metadados autenticados e nomes de arquivos; conteúdo do diff não foi analisado.',
      'Checks de CI, resultados de testes, aprovações e contexto de produto não foram consultados e permanecem UNKNOWN.'
    ],
    declaredEvidence: [],
    artifactEvidence: [],
    pullRequest: {
      repository: repo,
      number: prNumber,
      url: pullRequest.html_url,
      state: pullRequest.state,
      baseRef: pullRequest.base?.ref,
      headRef: pullRequest.head?.ref,
      author: pullRequest.user?.login
    }
  };
}
