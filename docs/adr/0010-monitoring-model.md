# ADR-0010: System-monitoring model + event taxonomy

**Status:** Accepted
**Date:** 2026-06-04

## Context

The product so far measures *customer* signal (sentiment, themes, priority). It has no view
of its own health. When the agent errors, mislabels, drifts, or is fed garbage, that is
invisible. We need a system-monitoring subsystem — explicitly separate from customer
feedback — and a place to store and triage what it finds. This ADR establishes the storage
and the first signal (runtime failures); later ADRs add the detectors (0011, 0012).

## Decision

Add a single **`MonitorEvent`** table with a small enum taxonomy:

- `MonitorEventType` = `RUNTIME_ERROR | SUSPECT_CLASSIFICATION | ACCURACY_DRIFT | MISUSE` —
  the four signals the user asked to watch. One table, not four, so the dashboard and queries
  stay uniform; the `detail` column holds type-specific context as JSON (mirroring how
  `TraceLog` stores step I/O).
- `MonitorSeverity` (INFO/WARNING/CRITICAL) and `MonitorStatus` (OPEN/ACKNOWLEDGED/RESOLVED)
  so an operator can work the queue.
- `feedbackId` is **optional**: some events are tied to a row (a suspect label), others are
  global (accuracy drift, a run-level failure). `onDelete: SetNull` keeps events if the
  feedback is removed.

First detector ships here: **runtime-error capture**. `lib/monitor.ts` exposes
`recordMonitorEvent` / `recordRuntimeError`. `triagePending` now wraps each item so a single
failure is logged and skipped (returns `{ processed, failed }`) instead of aborting the
batch, and the triage route logs run-level failures best-effort. API: `GET /api/monitor`
(filter by type/status/severity) and `PATCH /api/monitor/[id]` (acknowledge/resolve/reopen),
surfaced on a new `/monitoring` dashboard.

## Alternatives considered

- **A table per signal type.** More normalized, but four near-identical tables, four routes,
  and four UI lists for what is essentially one "events" stream. The shared table with a
  `type` discriminator + JSON `detail` is far less code for the same expressiveness.
- **An external APM (Sentry/Datadog).** Right answer for a real production system's runtime
  errors, but it wouldn't capture the domain-specific signals (suspect classifications,
  accuracy drift, misuse) that are the actual point here, and it adds a vendor. In-app
  events keep everything queryable next to the data they describe.
- **Fail-fast triage (status quo).** Aborting the whole batch on one bad item is worse UX and
  loses the per-item error signal; per-item capture is both more robust and feeds monitoring.

## Consequences

- **Good:** one queryable stream of system-health events with a triage workflow; runtime
  failures are now visible instead of a generic 500. The schema is ready for the detectors in
  ADR-0011/0012 with no further migration to the event model.
- **Cost:** `detail` is stringified JSON (like TraceLog), so structured querying inside it
  isn't first-class — fine for display, and we can promote fields to columns later if needed.
