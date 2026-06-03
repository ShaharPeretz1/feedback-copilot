# ADR-0004: Data model — Feedback / Theme / TraceLog

**Status:** Accepted
**Date:** 2026-06-03

## Context

The pipeline takes a raw piece of feedback, classifies it, clusters it into a theme,
and drafts a reply. We need to persist the raw input, the agent's structured output,
the clustering result, and enough detail to *observe* what the agent did on each step.

## Decision

Three tables:

- **Feedback** — one row per piece of feedback. Holds the raw text and metadata
  (`source`, `customerName`), a `status` (`NEW` → `TRIAGED`), and the agent's results
  (`sentiment`, `category`, `priority`, `summary`, `suggestedReply`) plus a link to its
  `Theme`. Enums (`Sentiment`, `Category`, `Priority`, `FeedbackStatus`) keep these
  fields constrained at the database level instead of free-text.
- **Theme** — the cluster a piece of feedback belongs to. `name` is unique so the agent
  can "upsert" into an existing theme rather than creating duplicates.
- **TraceLog** — one row per agent step (`classify`, `assignTheme`, `draftReply`) with
  the model used, latency, and the step's input/output. This is the observability layer.

Result fields on Feedback are **nullable** because a row exists in the `NEW` state
before the agent has filled them in.

## Alternatives considered

- **Store agent output as a single JSON blob on Feedback.** Faster to write, but loses
  the ability to filter/sort by priority or sentiment in SQL and gives weaker typing.
  Rejected — structured columns + enums are the point.
- **No TraceLog (just log to stdout).** Simpler, but then "observability" is ephemeral
  and invisible in the product. A table lets us show per-step latency and I/O in the UI
  later and inspect agent behavior after the fact.
- **Derive themes on the fly instead of persisting them.** Would re-cluster on every
  read and make counts/rollups expensive. A persisted `Theme` with a unique name is
  cheaper and stable.

## Consequences

- **Good:** SQL-level filtering and rollups (e.g. count by theme, top priority per
  theme); typed enums prevent garbage values; traces make the agent auditable.
- **Cost:** A few extra writes per item (one TraceLog row per step). Acceptable for the
  observability benefit; trace volume is bounded by feedback volume × 3 steps.
- **Indexes** on `Feedback.status`, `Feedback.themeId`, and `TraceLog.feedbackId`
  keep the common queries (list untriaged, list by theme, fetch an item's traces) fast.
