# Feedback Copilot

Agentic triage for customer feedback. Paste raw feedback (support tickets, NPS comments, reviews) and a multi-step Claude agent **classifies** it (sentiment, category, priority), **clusters** it into themes, and **drafts a reply** — surfaced in a React dashboard, persisted in PostgreSQL, with per-step traces and an eval harness.

Three dashboards:

- **Feedback** (`/`) — triage + impact-ranked themes (recurrence × severity) with category/sentiment/status/search filters.
- **Monitoring** (`/monitoring`) — watches the system itself: runtime failures, suspect classifications (LLM-judge), accuracy drift (eval over time), and misuse (spam/injection/abuse). Separate from customer sentiment.
- **Ops** (`/ops`) — turns top themes + open monitoring events into a ranked, estimable task backlog with a health summary and one-click export to GitHub Issues.

Full-stack TypeScript: Next.js (App Router) UI + API routes, Prisma + PostgreSQL, Anthropic Claude.

**Tracking every change:** the [CHANGELOG](CHANGELOG.md) is the master ledger (PR → ADR → what shipped → live status); the [ADR index](docs/adr/README.md) records every significant decision and links it to its PR; [CONTRIBUTING.md](CONTRIBUTING.md) encodes the workflow that keeps it all traceable.

## Architecture

```
Paste feedback ─▶ POST /api/feedback ─▶ Postgres (status: NEW)
                                              │
Run triage ─▶ POST /api/agent/triage ─▶ triagePending()
                                              │  per item, sequentially:
                                              ├─ 1. classify   → sentiment / category / priority / summary
                                              ├─ 2. assignTheme → reuse or create a theme (clustering)
                                              └─ 3. draftReply  → suggested customer-facing reply
                                              │  each step writes a TraceLog row
                                              ▼
Dashboard ◀─ GET /api/feedback, GET /api/themes ◀─ Postgres (status: TRIAGED)
```

- **Agent** — `lib/agent/triage.ts`. Each step uses forced tool-calling (`lib/agent/structured.ts`) for reliable structured JSON, and records latency + I/O to the `TraceLog` table for observability.
- **Clustering** — items are triaged sequentially so each new theme is visible to the next item, letting the agent reuse themes instead of fragmenting them.
- **Evals** — `scripts/eval.ts` runs the classifier over a labeled golden set (`evals/golden.json`) and reports category/sentiment accuracy, failing below an 80% threshold.

## Tech stack

| Layer    | Tech                                              |
| -------- | ------------------------------------------------- |
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind |
| Backend  | Next.js API routes (TypeScript)                   |
| Database | PostgreSQL via Prisma                             |
| Agent    | Anthropic Claude (tool-calling for structured output) |

## Local development

```bash
npm install
cp .env.example .env        # fill in DATABASE_URL + ANTHROPIC_API_KEY
npm run db:push             # create tables
npm run db:seed             # load sample feedback (12 untriaged items)
npm run db:seed:demo        # OR load a full pre-triaged demo (themes, monitoring events, tasks)
npm run dev                 # http://localhost:3000
```

Then click **Run triage** in the UI (or `curl -X POST localhost:3000/api/agent/triage`).

## Run the agents for real — on your Claude subscription (no API bill)

If you have a Claude Pro/Max plan, you can triage with **real Claude** using your included
Agent SDK credit instead of a metered `ANTHROPIC_API_KEY`:

```bash
claude setup-token        # one-time: log in / authorize (or just be logged into the claude CLI)
# ensure ANTHROPIC_API_KEY is UNSET (it overrides subscription auth)
npm run triage:local      # Feedback:   triage all NEW feedback
npm run monitor:local     # Monitoring: LLM-judge + misuse scan over recent feedback
npm run drift:local       # Monitoring: eval golden set → accuracy-drift event
npm run tasks:local       # Ops:        generate the task backlog from themes + events
```

Each `*:local` script swaps the `structuredCall` backend to the
[Claude Agent SDK](https://code.claude.com/docs/en/agent-sdk/typescript) (which auths via your
`claude` CLI) and runs the normal pipeline against your database, so all three dashboards then
display genuinely real classifications, themes, traces, monitoring findings, and tasks. They run
**locally/batch only** — the SDK spawns the CLI, so it isn't used inside the serverless app
(see [ADR-0017](docs/adr/0017-claude-subscription-provider.md)).

### LLM backends

`structuredCall` picks a backend by environment, so the same agent code runs anywhere:

| Backend | When | Cost |
| ------- | ---- | ---- |
| Claude Agent SDK (subscription) | local `*:local` scripts | included in Claude Pro/Max |
| **Groq** (free tier) | deployed app, when `GROQ_API_KEY` is set | **free** (no card) — powers the public buttons |
| Anthropic API | fallback when only `ANTHROPIC_API_KEY` is set | metered |

See [ADR-0019](docs/adr/0019-groq-free-tier-backend.md). To make the deployed site live for
free, create a key at [console.groq.com](https://console.groq.com) and set `GROQ_API_KEY` in the
Vercel env.

## Evals

```bash
npm run eval
```

## API

| Method  | Route                    | Purpose                                                    |
| ------- | ------------------------ | ---------------------------------------------------------- |
| `POST`  | `/api/feedback`          | Ingest one or many raw feedback items                      |
| `GET`   | `/api/feedback`          | List feedback (filter by status/sentiment/priority/category/theme, search, sort) |
| `POST`  | `/api/agent/triage`      | Run the triage agent over all untriaged items             |
| `GET`   | `/api/themes`            | Themes with counts + impact score (recurrence × severity) |
| `GET`   | `/api/monitor`           | List monitoring events (filter type/status/severity)      |
| `PATCH` | `/api/monitor/[id]`      | Acknowledge / resolve / reopen an event                   |
| `POST`  | `/api/agent/monitor`     | LLM-judge + misuse scan over recent feedback              |
| `POST`  | `/api/agent/drift`       | Run the eval golden set, record an accuracy-drift event   |
| `GET`   | `/api/tasks`             | List ops tasks (ranked by impact)                         |
| `PATCH` | `/api/tasks/[id]`        | Move a task across the board                              |
| `POST`  | `/api/agent/tasks`       | Generate tasks from top themes + open monitoring events   |
| `POST`  | `/api/tasks/[id]/export` | Export a task as a GitHub issue                           |
| `GET`   | `/api/ops/summary`       | Exec health summary (no LLM)                              |

## Deployment

**Live:** https://feedback-copilot.vercel.app

Deployed on Vercel with a Neon serverless Postgres database (provisioned via the Vercel Marketplace integration, which injects `DATABASE_URL`). `npm run build` runs `prisma generate` automatically, and the build needs no live DB (the dashboard is client-rendered and all API routes are `force-dynamic`). See [ADR-0008](docs/adr/0008-deploy-vercel.md).

> **Agent features need a funded `ANTHROPIC_API_KEY`** in the Vercel env (the Anthropic API is billed separately from any Claude subscription). Without it, every dashboard, all read endpoints, ranking, filters, and the ops summary work fully against Neon; the agent routes (triage, monitor scan, drift, task generation) return a clean `401` until a real key is added. GitHub export needs a `GITHUB_TOKEN` (with `issues:write`); without it the export button returns a clear "set GITHUB_TOKEN" message.
