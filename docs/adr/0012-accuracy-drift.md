# ADR-0012: Accuracy drift via the eval golden set

**Status:** Accepted
**Date:** 2026-06-04

## Context

ADR-0007 built an eval harness (`scripts/eval.ts`) that scores the classifier against a
labeled golden set, but it only ran as a manual CLI before deploy. The fourth monitoring
signal the user asked for — **accuracy drift** — is exactly this number tracked *over time*
from inside the app, so a prompt tweak or model swap that quietly degrades quality shows up
on the monitoring dashboard, not just in a terminal someone has to remember to run.

## Decision

Refactor the eval scoring into a shared **`lib/eval.ts`** (`runEval` + `EVAL_THRESHOLD`,
returning structured `categoryAccuracy` / `sentimentAccuracy` / misses) so the CLI and the
app use one implementation. The golden set is **imported** (`@/evals/golden.json`) rather than
read from disk, so it bundles into the serverless function on Vercel.

Add **`POST /api/agent/drift`**: it runs `runEval` and writes one `ACCURACY_DRIFT`
`MonitorEvent` per run (accuracy numbers in `detail`, severity CRITICAL when below the 80%
threshold). The monitoring dashboard gets a **"Run drift check"** button and an **accuracy
sparkline** built by reading the `ACCURACY_DRIFT` events over time — no separate time-series
table; the event stream *is* the history.

`scripts/eval.ts` now just formats `runEval`'s result and keeps the non-zero exit gate.

## Alternatives considered

- **A dedicated `EvalRun` time-series table.** Cleaner querying, but a second table for what
  the existing `MonitorEvent` stream already captures (a timestamped JSON payload). Reading
  drift history from events keeps one model and one dashboard.
- **Scheduled drift via Vercel Cron.** The user chose on-demand buttons (no automatic spend);
  the route is cron-ready if that changes — a cron would just POST it.
- **Reading golden.json from disk at runtime.** Works locally but is fragile on Vercel (the
  file may not be traced into the function). Importing the JSON guarantees it ships.

## Consequences

- **Good:** "is the classifier still good?" is now a tracked number with a trend line in the
  product, and the CLI/app can't diverge (shared `lib/eval.ts`). `npm run eval` still works as
  the pre-deploy gate.
- **Cost:** a drift check makes ~15 real classify calls; on-demand and bounded. Needs a funded
  key — without one the route returns a clean run-level error.
- **Signal quality:** a 15-item golden set catches gross regressions, not subtle ones (same
  caveat as ADR-0007); expanding it is cheap and the drift view scales with it for free.
