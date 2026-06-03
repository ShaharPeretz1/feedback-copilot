# ADR-0005: Multi-step agent with forced tool-calling

**Status:** Accepted
**Date:** 2026-06-03

## Context

For each piece of feedback we need four things: a classification (sentiment, category,
priority), a one-line summary, a theme assignment (clustering), and a drafted reply. The
LLM has to return data our code can rely on — not prose we have to parse with regexes —
and we want to be able to see what each reasoning step did.

## Decision

Run a **three-step pipeline** per item, each step a separate LLM call:

1. **classify** → sentiment, category, priority, summary
2. **assignTheme** → pick an existing theme or propose a new one (clustering)
3. **draftReply** → a short, sendable reply

Every step uses **forced tool-calling**: we define one tool with a JSON schema and set
`tool_choice` to force the model to "call" it. The model's structured arguments *are*
our result. A shared helper (`lib/agent/structured.ts`) wraps this and records latency.

**Clustering is sequential.** `triagePending()` processes items one at a time and passes
the list of already-existing theme names into step 2, so each new theme created becomes
visible to the next item. This lets the agent *reuse* themes instead of fragmenting the
same topic into near-duplicates.

## Alternatives considered

- **One combined call** that returns everything at once. Cheaper and faster (1 call vs 3),
  but: weaker separation of concerns, no per-step traces, and a worse "agent" story. The
  bigger problem is clustering — a single call can't see themes created for *other* items
  in the same batch, so themes fragment.
- **Free-text output + JSON parsing.** Brittle; models drift from the format. Forced
  tool-calling makes malformed output essentially impossible.
- **Embedding-based clustering** (vectorize summaries, cluster by cosine similarity).
  More "correct" at scale, but heavier (needs an embedding model + a vector store) and
  overkill for this scope. The LLM-pick-or-create approach is good enough and simpler.

## Consequences

- **Good:** Reliable structured data, clean per-step observability (each step writes a
  `TraceLog` row with model + latency + I/O), and themes that actually consolidate.
- **Cost:** 3 LLM calls per item instead of 1 — more latency and more API spend. For a
  triage tool this is an acceptable trade for quality and auditability; if volume grew we
  could batch step 1 across items or move clustering to embeddings.
- **Ordering dependency:** Because clustering is sequential, items must be processed in
  order; we don't parallelize the batch. Fine at demo scale (tens of items).
