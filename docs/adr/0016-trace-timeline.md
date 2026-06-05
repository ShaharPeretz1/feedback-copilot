# ADR-0016: Surface the agent trace timeline in the UI

**Status:** Accepted
**Date:** 2026-06-05

## Context

Every agent step already writes a `TraceLog` row (step, model, latency, input, output) —
the observability backbone from ADR-0004/0005 — but nothing in the product showed it. The
"why did the agent decide this, and what did each step cost?" story was invisible, which is
exactly the kind of transparency that makes an agentic system trustworthy and debuggable.

## Decision

Expose the trace per feedback item.

- **`GET /api/traces?feedbackId=`** returns that item's steps in pipeline order (oldest
  first).
- On each **TRIAGED** feedback card, an **"Agent trace"** toggle loads the trace **on click**
  (not on render) and shows a timeline: step label, model, per-step latency, total latency,
  and collapsible pretty-printed input/output. Click-to-load keeps it to one request only
  when the user wants it, and avoids fetching in an effect.
- Display helpers live in `lib/trace.ts` (`totalLatency`, `prettyJson`, `stepLabel`) and are
  unit-tested.
- The demo seed (`scripts/seed-demo.ts`) now writes the three triage traces per item so the
  timeline is populated without running the live agent.

## Alternatives considered

- **A separate global "traces" / observability page.** Useful later for cross-item latency or
  cost analysis, but the natural question is "explain *this* item," so per-card is the higher-
  value first cut. A global view can reuse the same endpoint.
- **Load traces eagerly with the feedback list.** Simpler UI, but it fetches trace I/O for
  every item up front (wasteful, and most are never opened). Lazy click-to-load is leaner.
- **Pipe traces to an external tracing tool (OTel/Langfuse).** Powerful for production-scale
  analysis, but adds a vendor and infra; the data is already in our DB and this surfaces it
  with no new dependency.

## Consequences

- **Good:** the agent is now inspectable from the UI — you can see each step, its model, its
  latency, and its exact I/O. Turns the previously write-only `TraceLog` into a feature and
  showcases the observability that was already being captured.
- **Scope:** read-only and per-item; no aggregation, search, or cost rollups yet (easy
  follow-ups on the same endpoint). Trace I/O is shown verbatim — fine here, but if real
  customer data were sensitive it would want redaction.
