# Changelog

The master ledger for this project: every change shipped as one squash-merged PR,
each significant decision captured in an [ADR](docs/adr/README.md). This file maps
**PR → ADR → what shipped → status** so any change is traceable end-to-end.

**How to trace any change**

- **What & why** → the PR description (linked below) and its ADR(s).
- **The exact diff** → the squash-merge commit (SHA linked below) on `main`.
- **Is it live?** → every merge to `main` auto-deploys to
  [feedback-copilot.vercel.app](https://feedback-copilot.vercel.app) via the GitHub↔Vercel
  integration.

**How we work** (so the history stays legible — full rules in [CONTRIBUTING.md](CONTRIBUTING.md))

1. One branch + one squash-merged PR per change; conventional-commit titles (`feat(...)`,
   `fix(...)`, `docs:`).
2. Every significant decision gets an ADR in `docs/adr/`, moved `Proposed → Accepted` when
   its PR merges. The [ADR index](docs/adr/README.md) lists all of them with their PR.
3. Each PR is verified before merge: `tsc --noEmit`, `npm run lint`, `next build`, and a
   runtime check against the database; any test data is cleaned up.
4. Agent features that need a funded `ANTHROPIC_API_KEY` (and GitHub export, which needs
   `GITHUB_TOKEN`) ship behind graceful failures and are noted as such.

Repository: <https://github.com/ShaharPeretz1/feedback-copilot> ·
Live: <https://feedback-copilot.vercel.app>

---

## Process & docs

### [PR #17](https://github.com/ShaharPeretz1/feedback-copilot/pull/17) — Demo seed for all three dashboards
ADR: — · Status: **Merged · Live**
- `scripts/seed-demo.ts` (`npm run db:seed:demo`) populates pre-triaged feedback across 6
  themes, monitoring events (suspect classification, misuse, runtime error, drift history),
  and a ranked task backlog — so all three UIs are visibly populated **without a funded key**.
  Idempotent; stands in for what the agents would produce.


### [PR #16](https://github.com/ShaharPeretz1/feedback-copilot/pull/16) — Contributing guide + PR template
ADR: — · Status: **Merged**
- `CONTRIBUTING.md` encodes the branch → ADR → verify → CHANGELOG → squash-merge loop, the
  verification checklist, and the graceful-failure / DB conventions.
- `.github/pull_request_template.md` turns the checklist into a per-PR gate.

### [PR #15](https://github.com/ShaharPeretz1/feedback-copilot/pull/15) — CHANGELOG ledger + ADR↔PR cross-links
ADR: — · Status: **Merged**
- Added this CHANGELOG as the master ledger; cross-linked every ADR to its PR and documented
  the new-ADR process.

---

## Milestone 3 — Filtering, monitoring & ops (PR #9–#14)

Expanded the single triage view into three dashboards: analyst filtering/ranking, a system-
monitoring subsystem, and an ops backlog with GitHub export.

### [PR #14](https://github.com/ShaharPeretz1/feedback-copilot/pull/14) — Export tasks to GitHub Issues · `bb810c9`
ADR: [0014](docs/adr/0014-github-export.md) · Status: **Merged · Live**
- `POST /api/tasks/[id]/export` creates a GitHub issue (`GITHUB_TOKEN`, repo via `GITHUB_REPO`),
  stores `html_url` on the task; idempotent.
- Clear failures: `400` without a token, `502` on GitHub API/network error. Per-task
  "Export to GitHub" → "View issue" button.

### [PR #13](https://github.com/ShaharPeretz1/feedback-copilot/pull/13) — Task model + ops dashboard · `bc7de6c`
ADR: [0013](docs/adr/0013-ops-tasks.md) · Status: **Merged · Live**
- `Task` model; `generateTasks` turns top themes + open monitor events into a ranked,
  deduplicated backlog (drops hallucinated source ids).
- `POST /api/agent/tasks`, `GET /api/tasks`, `PATCH /api/tasks/[id]`, and a pure-aggregation
  `GET /api/ops/summary`. New `/ops` dashboard with health cards + ranked task board.

### [PR #12](https://github.com/ShaharPeretz1/feedback-copilot/pull/12) — Accuracy drift · `8ef06f0`
ADR: [0012](docs/adr/0012-accuracy-drift.md) · Status: **Merged · Live**
- Shared `lib/eval.ts` (used by the CLI and the app); golden set imported so it bundles on
  Vercel.
- `POST /api/agent/drift` records an `ACCURACY_DRIFT` event per run; `/monitoring` gets a
  "Run drift check" button + an accuracy sparkline from the event history.

### [PR #11](https://github.com/ShaharPeretz1/feedback-copilot/pull/11) — LLM-judge + misuse screen · `a6c83b2`
ADR: [0011](docs/adr/0011-llm-judge-misuse.md) · Status: **Merged · Live**
- `judgeClassification` (flags likely-wrong labels) and `screenInput` (spam / injection /
  abuse / off-topic), both via `structuredCall`.
- `runMonitorScan` + `POST /api/agent/monitor` behind a "Run monitor scan" button; dedupes
  against unresolved events.

### [PR #10](https://github.com/ShaharPeretz1/feedback-copilot/pull/10) — Monitoring model + runtime capture · `344016c`
ADR: [0010](docs/adr/0010-monitoring-model.md) · Status: **Merged · Live**
- `MonitorEvent` model + event taxonomy. Triage now logs each failed item as a `RUNTIME_ERROR`
  and skips it instead of aborting the batch.
- `GET /api/monitor`, `PATCH /api/monitor/[id]`, and the `/monitoring` dashboard with an
  ack/resolve workflow.

### [PR #9](https://github.com/ShaharPeretz1/feedback-copilot/pull/9) — Impact ranking + analyst filters · `bf77ba3`
ADR: [0009](docs/adr/0009-impact-ranking.md) · Status: **Merged · Live**
- Themes ranked by **impact** (recurrence × severity) via `lib/score.ts`; `GET /api/themes`
  returns impact + mixes.
- Server-driven filters on `GET /api/feedback` (category, search, sort) + a filter-bar UI.
  Extracted shared `Badge`/types, added the top nav and `/monitoring` + `/ops` routes.

---

## Milestone 2 — Eval & deploy (PR #6–#8)

### [PR #8](https://github.com/ShaharPeretz1/feedback-copilot/pull/8) — Deploy on Vercel + Neon · `7ca8de6`
ADR: [0008](docs/adr/0008-deploy-vercel.md) · Status: **Merged · Live**
- Deployed on Vercel with Neon Postgres (Marketplace integration). Schema pushed; sample data
  seeded. Build needs no live DB.

### [PR #7](https://github.com/ShaharPeretz1/feedback-copilot/pull/7) — Load .env in eval/seed scripts · `e6f3c06`
ADR: — · Status: **Merged**
- `tsx --env-file-if-exists=.env` so `npm run eval` / `db:seed` pick up local env without
  breaking CI/Vercel.

### [PR #6](https://github.com/ShaharPeretz1/feedback-copilot/pull/6) — Eval harness + accuracy gate · `52faceb`
ADR: [0007](docs/adr/0007-eval-harness.md) · Status: **Merged**
- `scripts/eval.ts` over a labeled golden set; category/sentiment accuracy with an 80% gate.
  Also committed the previously-missing `seed.ts` that `package.json` referenced.

---

## Milestone 1 — Foundation (PR #1–#5)

### [PR #5](https://github.com/ShaharPeretz1/feedback-copilot/pull/5) — Dashboard UI · `17339f0`
ADR: — · Status: **Merged · Live**
- Initial React dashboard: ingest, run triage, themes panel, feedback cards.

### [PR #4](https://github.com/ShaharPeretz1/feedback-copilot/pull/4) — API routes · `381a291`
ADR: — · Status: **Merged · Live**
- `/api/feedback` (ingest/list), `/api/agent/triage`, `/api/themes`.

### [PR #3](https://github.com/ShaharPeretz1/feedback-copilot/pull/3) — Multi-step triage agent · `96e6c5a`
ADR: [0005](docs/adr/0005-multi-step-agent-tool-calling.md), [0006](docs/adr/0006-claude-haiku-model.md) · Status: **Merged · Live**
- `classify → assignTheme → draftReply` with forced tool-calling (`structuredCall`); per-step
  `TraceLog`.

### [PR #2](https://github.com/ShaharPeretz1/feedback-copilot/pull/2) — Data model & DB client · `bee7ff3`
ADR: [0003](docs/adr/0003-postgresql-on-neon.md), [0004](docs/adr/0004-data-model.md) · Status: **Merged · Live**
- Prisma schema (Feedback / Theme / TraceLog) + client singleton.

### [PR #1](https://github.com/ShaharPeretz1/feedback-copilot/pull/1) — Project setup & foundational ADRs · `8726dd3`
ADR: [0001](docs/adr/0001-full-stack-typescript-nextjs.md), [0002](docs/adr/0002-pin-prisma-v6.md) · Status: **Merged**
- Next.js + TypeScript + Tailwind scaffold, tooling, and the first ADRs.
