---
name: aima-verify-change
description: Runs this repository's repeatable verification procedure over local changes before commit, push, or PR — git status, the relevant diff, git diff --check, a check for weakened/removed tests, and npm run check — then reports PASS / PASS WITH RISKS / FAIL with evidence. Use before committing, pushing, or opening a PR in this repository, or whenever someone asks to verify, sanity-check, or review local changes before they go further.
---

# aima-verify-change

A repeatable verification pass over the repository's current changes. It does not fix anything — it reports.

## Constraints

- Never run `git commit`, `git push`, `git merge`, `git rebase`, `git reset`, or any command that opens, edits, or merges a PR.
- Never deploy.
- Never auto-fix a finding (edit code, adjust a test, silence a check) without the user explicitly authorizing that specific fix afterward. This skill verifies; it does not remediate.
- Never state that something was tested, checked, or passed without a command output backing that claim.

## Procedure

Run these in order and keep the raw output — the final report is built from it, not from memory:

1. `git status --short` — what's staged, unstaged, untracked.
2. Read every changed file in full, by state — `git diff` alone does not cover untracked files:
   - Tracked, unstaged → `git diff`.
   - Staged → `git diff --cached`.
   - Untracked (from `git status --short`, the `??` entries) → these have no diff to read; open and read their full content directly, since `git diff` will never show them.
   For a large diff or file, read it in full rather than sampling; if it's too large to read in full, say so explicitly rather than reporting on a partial read as if it were complete. Never describe this step as having reviewed "the whole diff" if any untracked file was not read this way.
3. `git diff --check` (and `git diff --cached --check` if anything is staged) — whitespace errors.
4. Test-integrity check — only if the diff touches test files: for every test file touched, compare before/after — was a test deleted, skipped, had its assertions loosened, or had its expected value changed to match new (possibly wrong) behavior instead of the behavior being fixed to match a still-valid expectation? Read `reference.md` for the detailed rubric and examples before judging this; skip reading it if no test files are touched. Flag anything ambiguous rather than assuming it's fine.
5. `npm run check` — full local gate (syntax check, tests, golden evaluation, site check). Capture pass/fail per stage from its output; do not summarize it as "passed" if any stage failed.

## Evidence discipline

Every claim in the report is one of:
- **Fact** — backed by a command you actually ran in this pass, with output quoted or referenced.
- **Inference** — a reasonable conclusion from the diff or output, labeled as such.
- **Unknown** — could not be determined (e.g., a check that requires an environment or credential unavailable here). Say so; do not guess a result.

## Report format

End with:

- **Files changed** — from `git status`, listed separately as staged, unstaged (tracked), and untracked.
- **Checks executed** — each of the 5 procedure steps, with a one-line result and the evidence it's based on. For step 2, confirm explicitly whether every untracked file was read in full — never report this step as covering "the whole diff" if untracked files exist and weren't read.
- **Findings** — anything notable from steps 2–5, each tagged fact/inference/unknown.
- **Verdict** — `PASS`, `PASS WITH RISKS`, or `FAIL`:
  - `FAIL`: `npm run check` failed, `git diff --check` found whitespace errors, or a test was clearly weakened/removed to force a pass.
  - `PASS WITH RISKS`: all checks passed, but something in the diff is a judgment call (ambiguous test change, unexpected scope, missing coverage for new behavior) worth a human look before proceeding.
  - `PASS`: all checks passed and nothing else raised a concern.
- **Not done** — anything the procedure normally covers that couldn't be executed this time, and why.

This skill only reports. Committing, pushing, opening a PR, merging, deploying, or fixing any finding requires the user's explicit go-ahead in the conversation, given after seeing this report.
