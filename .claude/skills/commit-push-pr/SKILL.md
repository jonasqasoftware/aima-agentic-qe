---
name: commit-push-pr
description: Runs this repository's delivery flow after a change is ready to go to GitHub — verify via aima-verify-change, review the verdict, then stage, commit, push to a feature branch, and open a PR against main, with explicit human authorization before every state-changing delivery step (staging, commit, push, PR creation). Use when a change is ready to ship and the user wants to commit, push, or open a PR in this repository.
---

# commit-push-pr

Represents the delivery flow after a change is ready to leave the local working tree: **verify → review result → stage → review staged diff → commit → push → create PR**. It does not replace `aima-verify-change` — it invokes it and acts on its verdict.

## Constraints

- Never skip the verification step. Never re-implement the aima-verify-change procedure inline. If the `Skill` tool cannot invoke `aima-verify-change` for any reason, stop and report `BLOCKED` — do not substitute a manual approximation of its checks.
- Immediately after a verdict, capture a read-only fingerprint of the verified state — status/file set, a deterministic hash of tracked changes against HEAD, and a SHA-256 of each untracked file's on-disk content. Immediately before staging, recompute and compare; if the status, file set, or any content fingerprint differs, discard the verdict and return to verification (step 1). This is drift detection only, not a re-implementation of aima-verify-change's checks — a file's content can change while `git status` output stays the same shape, so status alone is not sufficient.
- `FAIL` blocks staging, commit, push, and PR creation entirely. Report the failure and stop.
- `PASS WITH RISKS` blocks progress until the user has seen the specific risks and given an explicit decision to proceed, stop, or fix first.
- Never stage indiscriminately (`git add -A`/`.`) — stage only the files identified as part of this change.
- Never push to `main` — this block is unconditional. For any other branch, do not presume its protection status either way: check read-only whether it exists on `origin` and, if so, its protection state (see step 10). If it doesn't exist remotely yet, treat a missing-branch response as no evidence of protection in either direction; if protection genuinely cannot be determined, report `Unknown` rather than inventing a state, and rely on explicit human authorization plus GitHub's actual rules at push time.
- Never merge a PR, never deploy, never change branch protection rules or any GitHub repository configuration.
- Never invent a commit message or PR title/body disconnected from the actual staged diff — both must be traceable to what changed.
- Commit messages and PR titles are written in Portuguese (pt-BR).
- Stop and ask before each state-changing delivery step: staging, commit, push, PR creation. None of these four happens without an explicit go-ahead from the user given after seeing exactly what will happen (files to stage, message text, target branch, PR title/body).

## Reuse of aima-verify-change

This skill does not duplicate the verification procedure. Step 1 below invokes `aima-verify-change` through whatever skill-invocation mechanism this Claude Code installation actually exposes — in this session that is the `Skill` tool, called with `skill: "aima-verify-change"`. This is not a structural dependency/import: it is this skill's instructions directing the agent to call that tool and treat its returned report (Files changed, Checks executed, Findings, Verdict) as input to the gating logic below. There is no confirmed guarantee across environments that this call happens or succeeds — if it fails or the mechanism isn't available, stop as `BLOCKED` rather than reimplementing verification by hand.

## Procedure

1. **Verify.** Invoke `aima-verify-change` via the `Skill` tool. If it cannot be invoked, stop and report `BLOCKED`. Immediately after it returns, capture a read-only fingerprint of the state it verified: the full `git status --short --untracked-files=all` output, a deterministic hash of tracked changes against HEAD (`git diff --binary HEAD -- | sha256sum`), and a SHA-256 of each untracked file's on-disk content (`sha256sum <file>`, one per file). This fingerprint is for drift detection only — it does not re-run or replace `aima-verify-change`'s own checks.
2. **Gate on the verdict.**
   - `FAIL` → present the findings that caused it. Stop. Do not stage, commit, push, or open a PR.
   - `PASS WITH RISKS` → present every risk from the report's Findings verbatim. Ask the user explicitly: proceed, stop, or fix first. Do not continue without an explicit answer.
   - `PASS` → summarize the verdict and proceed to step 3.
3. **Revalidate before staging.** Recompute the same fingerprint — `git status --short --untracked-files=all`, `git diff --binary HEAD -- | sha256sum`, and `sha256sum` of each untracked file — and compare it to what was captured in step 1. If the status/file set, the tracked-diff hash, or any untracked file's hash differs, discard the verdict and go back to step 1 — do not proceed on stale evidence, even if the file set alone looks unchanged.
4. **Propose staging.** List exactly which files will be staged and why they belong to this change. Get explicit confirmation before running `git add`.
5. **Stage.** Only after explicit confirmation, and only the confirmed files.
6. **Review the staged diff.** Run `git diff --cached` and read it in full — this is a fresh read at commit time, not a reuse of the verification pass's diff read.
7. **Propose the commit.** Draft a commit message in Portuguese that names what changed and why, grounded in the diff just read. Show the exact message and file list to the user and get explicit confirmation before running `git commit`.
8. **Commit.** Only after explicit confirmation.
9. **Confirm the commit landed.** Show the resulting commit SHA, the list of files it contains, and `git status` (working tree should be clean relative to this change) before proposing the push.
10. **Propose the push.** Refuse and stop if the current branch is `main` — unconditional. Otherwise, check read-only whether the branch already exists on `origin` (e.g. `git ls-remote --heads origin <branch>`).
    - If it exists remotely, query its protection status read-only (e.g. `gh api repos/{owner}/{repo}/branches/{branch}/protection`, and applicable repository rulesets via `gh api repos/{owner}/{repo}/rulesets` if relevant) before proposing the push. If it is confirmed protected, stop and report instead of pushing.
    - If it does not exist remotely yet, a 404 from the branch-protection endpoint is not evidence of anything — it only means the branch hasn't been pushed, not that it is protected or unprotected. If applicable rulesets can still be queried read-only (e.g. one targeting a branch-name pattern this branch would match once created), use that as additional evidence. If protection still cannot be determined, report it as `Unknown` — do not infer or invent a protection state.
    Show the exact `git push` target (remote + branch) and whatever protection evidence was found (or `Unknown`), and get explicit confirmation before running it. Explicit human authorization and GitHub's actual rules at push time remain the real gate regardless of what this step could determine in advance.
11. **Push.** Only after explicit confirmation.
12. **Propose the PR.** Draft a PR title (Portuguese, short) and body (Portuguese) summarizing the change and referencing the verification verdict (including any accepted risks from step 2). Confirm base branch is `main` and head is the current feature branch. Show the full title/body/base/head to the user and get explicit confirmation before creating it.
13. **Create the PR.** Only after explicit confirmation. Use `gh pr create`.
14. **Inspect the PR (read-only).** Query the actual PR state — URL, base/head, current check/review status — via `gh pr view`. Do not presume CI is "pending" or any check state; report only what this query returns.
15. **Report.** PR URL, source branch, HEAD commit SHA, and the current check/review state from step 14 — not an assumed state. Note explicitly that no merge was performed by this skill.

## What's enforced vs. what's behavioral

- **Behavioral (this skill's instructions, not structurally guaranteed by Claude Code):** invoking `aima-verify-change`; the revalidation step before staging; the FAIL/PASS WITH RISKS/PASS gating logic; refusing to push to `main`; confirming branch protection before pushing; keeping messages in Portuguese; selective staging; and the act of asking itself. Asking is text the model produces — nothing in Claude Code forces the model to actually end its turn and wait rather than continuing on its own. Only once the agent genuinely stops and the turn ends waiting for a reply does a real requirement for new user input exist; up to that point, "stop and ask" is a behavior this skill's instructions call for, not a mechanical guarantee.
- **Actually enforced by Claude Code, as a separate layer:** once a turn does end waiting for a reply, the agent cannot fabricate the user's answer — that pause is real. Independently of this skill's text, each `git add`, `git commit`, `git push`, and `gh pr create` call also passes through Claude Code's own tool permission system, which can require interactive approval depending on the user's configured permission mode. That permission layer does not depend on this skill following its own instructions correctly.

## Not permitted from this skill

Merging a PR, deploying, changing branch protection or any repository/GitHub configuration are out of scope regardless of verdict or user request within this flow — those require a separate, explicit request outside this skill.
