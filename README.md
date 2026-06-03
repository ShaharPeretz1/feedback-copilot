# Feedback Copilot

Agentic triage for customer feedback. Paste raw feedback (support tickets, NPS comments, reviews) and a multi-step Claude agent **classifies** it (sentiment, category, priority), **clusters** it into themes, and **drafts a reply** — surfaced in a React dashboard, persisted in PostgreSQL, with per-step traces and an eval harness.

Full-stack TypeScript: Next.js (App Router) UI + API routes, Prisma + PostgreSQL, Anthropic Claude.

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
npm run db:seed             # load sample feedback (optional)
npm run dev                 # http://localhost:3000
```

Then click **Run triage** in the UI (or `curl -X POST localhost:3000/api/agent/triage`).

## Evals

```bash
npm run eval
```

## API

| Method | Route                | Purpose                                  |
| ------ | -------------------- | ---------------------------------------- |
| `POST` | `/api/feedback`      | Ingest one or many raw feedback items    |
| `GET`  | `/api/feedback`      | List feedback (filter by status/priority/theme) |
| `POST` | `/api/agent/triage`  | Run the agent over all untriaged items   |
| `GET`  | `/api/themes`        | Themes with counts + priority rollups    |

## Deployment

Deployed on Vercel with a Neon serverless Postgres database. Set `DATABASE_URL` and `ANTHROPIC_API_KEY` in the Vercel project env; `npm run build` runs `prisma generate` automatically.
