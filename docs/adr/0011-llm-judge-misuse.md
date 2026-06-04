# ADR-0011: LLM-judge for suspect classifications & misuse screening

**Status:** Accepted
**Date:** 2026-06-04

## Context

ADR-0010 gave us the event store and runtime-error capture. Two of the four signals the user
asked for need *judgment*, not just a try/catch: detecting **likely-wrong classifications**
(there is no ground-truth label at runtime) and detecting **misuse** (spam, prompt-injection,
abuse, off-topic). Both are exactly what an LLM is good at and a rule engine is not.

## Decision

Add two agent detectors in `lib/agent/monitor.ts`, both reusing `structuredCall`:

- **`judgeClassification(rawText, labels)`** — a strict QA reviewer re-checks the labels the
  triage step already assigned and returns `{ agree, suggested{Category,Sentiment,Priority}?,
  confidence, reasoning }`. Disagreement writes a `SUSPECT_CLASSIFICATION` event (severity
  CRITICAL when confidence is HIGH).
- **`screenInput(rawText)`** — flags `SPAM | INJECTION | ABUSE | OFF_TOPIC | NONE`. A non-NONE
  flag writes a `MISUSE` event (INJECTION/ABUSE → CRITICAL). The prompt is explicit that
  harshly-worded genuine complaints are NOT abuse, to avoid flagging real feedback.

`runMonitorScan(limit)` runs both over recent feedback (judge only on TRIAGED rows that have
labels; screen on all recent rows), traces each call to `TraceLog`, and **dedupes**: it skips
a row that already has an unresolved event of that type, so re-scanning doesn't pile up
duplicates. Exposed at **`POST /api/agent/monitor`** behind an on-demand **"Run monitor
scan"** button (the agreed model — no cron). The scan throws on the first agent failure so a
missing/invalid key surfaces as one run-level error, consistent with triage.

## Alternatives considered

- **Rules/heuristics for misuse** (regex for links, blocklists). Cheap but brittle; misses
  paraphrased injection and over-flags legitimate angry feedback. The LLM handles intent.
- **Self-consistency / multi-judge voting** for suspect classifications (run the judge N times
  or with N personas, require a majority). More robust against a single bad judgment, but N×
  the cost; deferred — the single-judge signal is enough to surface candidates for human
  review, which is all this needs to do.
- **Judge every item inline during triage.** Doubles triage latency and cost for every item;
  a separate on-demand scan keeps triage fast and lets the operator choose when to spend.

## Consequences

- **Good:** the two judgment-based signals now populate the monitoring queue with actionable,
  human-reviewable findings (with the model's suggested correction inline). Dedup keeps the
  queue clean across repeated scans.
- **Cost:** up to two Anthropic calls per scanned item; bounded by `limit` and gated behind a
  manual button. Needs a funded key — without one the scan returns a clean run-level error.
- **Trust:** a single LLM judge can itself be wrong; events are advisory candidates for a
  human, not automatic relabels. Multi-judge voting is the obvious future upgrade.
