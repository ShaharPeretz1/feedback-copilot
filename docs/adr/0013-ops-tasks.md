# ADR-0013: Ops layer — Task model + generation

**Status:** Accepted
**Date:** 2026-06-04

## Context

The product can now surface *what's wrong* (ranked feedback themes) and *how the system is
behaving* (monitoring events), but a manager still has to translate those into "so what do we
actually do?". The ops dashboard closes that loop: one ranked, estimable backlog of concrete
fixes drawn from both sources, plus a health summary.

## Decision

Add a **`Task`** model: `title`, `description`, `source` (`FEEDBACK_THEME | MONITOR_EVENT`),
`severity` (reusing the `Priority` scale), `effort` (`S/M/L`), `impactScore` (Float, so tasks
rank on one number), `status` (`TODO/IN_PROGRESS/DONE/DISMISSED`), `area`, nullable
`themeId` / `monitorEventId` source links, and `externalUrl` (for the GitHub export in
ADR-0014).

**Generation** (`lib/agent/ops.ts` `generateTasks`): rank themes by impact (reusing
`lib/score.ts`), gather open monitor events, hand both to `structuredCall` as an engineering
lead, and persist the returned tasks. Two safeguards: it **drops hallucinated source ids**
(must match a real theme/event) and **dedupes** (skips a source that already has an active
task), so re-running doesn't duplicate the backlog. Task `impactScore` comes from the theme's
impact, or from the event severity (`severityImpact`) for monitor-sourced tasks.

API: `POST /api/agent/tasks` (generate), `GET /api/tasks` (ranked by impact, filterable),
`PATCH /api/tasks/[id]` (move across the board), and `GET /api/ops/summary` — a **pure,
no-LLM aggregation** (open tasks by severity, top themes, open events by type, latest drift
accuracy, an "on fire" count). The `/ops` dashboard renders the summary cards + a ranked task
list with status controls.

## Alternatives considered

- **Manual task creation only.** Simple, but the whole value is auto-synthesizing the backlog
  from signals already in the system; manual entry is still possible by editing rows later.
- **One task per feedback item.** Too granular and noisy; tasks are per-theme/per-event so
  they map to a unit of work, not a single complaint.
- **Computing the summary client-side from the list endpoints.** Would over-fetch and
  duplicate logic; a dedicated aggregation route keeps the dashboard thin and the numbers
  authoritative.

## Consequences

- **Good:** feedback + monitoring converge into a single prioritized, estimable to-do list
  with a health overview; generation reuses the impact ranking so the backlog order matches
  the analyst view. Source links keep each task traceable to its origin.
- **Cost:** generation is one (larger) Anthropic call gated behind a manual button; needs a
  funded key (fails gracefully otherwise). The summary endpoint is free (pure DB aggregation).
- **Next:** `externalUrl` is wired but unused until ADR-0014 adds the GitHub export.
