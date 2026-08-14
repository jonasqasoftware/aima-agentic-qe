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

async function ghApi(endpoint, { paginate = false } = {}) {
  try {
    const args = paginate ? ['api', '--paginate', '--slurp', endpoint] : ['api', endpoint];
    const { stdout } = await execFileAsync('gh', args);
    const payload = JSON.parse(stdout);
    return paginate ? payload.flat() : payload;
  } catch (error) {
    throw new Error(`Unable to read GitHub PR data: ${error.stderr?.trim() || error.message}`);
  }
}

/**
 * Reads authenticated GitHub PR metadata and its changed-file names via gh.
 * Diff hunks, review status, and business context deliberately remain unknown.
 * CI check results are recorded as remote evidence, never as a release approval.
 */
export async function createChangeFromGitHubPr({ repo, number, businessImpact, technicalComplexity, api = ghApi }) {
  validateRepo(repo);
  if (!Number.isSafeInteger(Number(number)) || Number(number) <= 0) throw new Error('--pr must be a positive integer.');
  validateLevel('businessImpact', businessImpact);
  validateLevel('technicalComplexity', technicalComplexity);

  const prNumber = Number(number);
  const [pullRequest, files] = await Promise.all([
    api(`repos/${repo}/pulls/${prNumber}`),
    api(`repos/${repo}/pulls/${prNumber}/files?per_page=100`, { paginate: true })
  ]);
  if (!pullRequest?.title || !Array.isArray(files)) throw new Error('GitHub returned an incomplete PR response.');
  const changedFiles = [...new Set(files.map((file) => file.filename).filter(Boolean))];
  if (!changedFiles.length) throw new Error(`GitHub PR #${prNumber} has no changed files.`);
  const headSha = pullRequest.head?.sha;
  let ciChecks = [];
  let ciUnknown;
  if (!headSha) {
    ciUnknown = 'O SHA do commit de origem não foi retornado pelo GitHub; checks de CI permanecem UNKNOWN.';
  } else {
    try {
      const response = await api(`repos/${repo}/commits/${headSha}/check-runs?per_page=100`, { paginate: true });
      const checkRuns = Array.isArray(response) ? response.flatMap((page) => page.check_runs ?? []) : response.check_runs ?? [];
      ciChecks = checkRuns.map((check) => ({
        name: check.name || 'check-sem-nome',
        status: check.status || 'unknown',
        conclusion: check.conclusion || null,
        url: check.details_url || check.html_url || null,
        outcome: check.status !== 'completed'
          ? 'unknown'
          : ['success', 'neutral', 'skipped'].includes(check.conclusion) ? 'passed'
          : 'failed'
      }));
      if (!ciChecks.length) ciUnknown = 'Nenhum check de CI foi retornado para o commit do PR; cobertura e execução permanecem UNKNOWN.';
      else if (ciChecks.some((check) => check.outcome === 'unknown')) ciUnknown = 'Há check(s) de CI ainda em andamento ou sem conclusão; o resultado final permanece UNKNOWN.';
    } catch (error) {
      ciUnknown = `Não foi possível consultar checks de CI: ${error.message}`;
    }
  }

  return {
    id: `GITHUB-PR:${repo}#${prNumber}`,
    summary: `PR #${prNumber}: ${pullRequest.title}`,
    source: 'github-pr-metadata',
    changedFiles,
    businessImpact,
    technicalComplexity,
    knownUnknowns: [
      'O adaptador GitHub leu apenas metadados autenticados e nomes de arquivos; conteúdo do diff não foi analisado.',
      'Aprovações e contexto de produto não foram consultados e permanecem UNKNOWN.',
      ...(ciUnknown ? [ciUnknown] : [])
    ],
    declaredEvidence: [],
    artifactEvidence: [],
    ciChecks,
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
