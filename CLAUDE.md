# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

AIMA Agentic QE is a deterministic CLI that turns a declared change (JSON, local Git diff, or an authenticated GitHub PR) into risks, a test strategy, explicit unknowns, and an auditable release recommendation (`GO` / `GO WITH RISKS` / `NO-GO`). No LLM, no diff-content reading, no remote writes.

## Commands

```bash
npm test          # run all tests (node:test)
npm run evaluate   # golden evaluation against the payment-refactor fixture
npm run check      # pre-commit check: node --check + tests + evaluate + check:site
```

Entrypoint: `src/cli.js`, dispatching `analyze-pr`, `analyze-diff`, `analyze-github-pr`, `evaluate`, `dashboard`, `serve`, `permissions`, `verify-report`.

## Architectural boundary

`site/` (public/editorial layer, published to GitHub Pages) is architecturally separate from the executable core (`aima/`, `evals/`, `examples/`, `src/`), though both are versioned in this same repository.

## Read before working in these areas

- Autonomy limits, permission policy, rules for adding agents/providers/MCP integrations: @AGENTS.md
- Architecture, module responsibilities, data flow, design decisions: @ARCHITECTURE.md
- Feature overview, CLI usage examples, framework registry: @README.md
- Pre-commit checks and contribution flow: @CONTRIBUTING.md
- Documentation and ADR conventions: @docs/DOCUMENTATION.md
