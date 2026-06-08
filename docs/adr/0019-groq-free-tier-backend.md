# ADR-0019: Free-tier Groq backend for the deployed app

**Status:** Accepted
**Date:** 2026-06-08

## Context

ADR-0017 made the agents real on the Claude subscription, but only **locally** (the Agent SDK
spawns the CLI, so it can't run in a Vercel function). The deployed public site's agent buttons
therefore still fail gracefully — an anonymous visitor can't actually run triage. We want the
deployed app to be live-functional **for free**, without a metered Anthropic key and without
the owner's subscription.

## Decision

Add **Groq** as a third `structuredCall` backend. Groq has a real **free tier (no credit
card)**, is OpenAI-compatible, HTTP-only (serverless-friendly, unlike the CLI-spawning Agent
SDK), and supports forced function-calling — so it mirrors the Anthropic path for reliable
structured JSON.

Backend selection in `lib/agent/structured.ts`, in order:

1. An explicit **override** (the local `*-local` scripts swap in the Agent SDK).
2. Else **`GROQ_API_KEY` present → Groq** (powers the deployed serverless app).
3. Else the **Anthropic API**.

Supporting changes:

- `lib/agent/groq.ts` (`structuredCallGroq`) — forced single-function tool call, parsed args;
  **lazy** client so importing it needs no key until first use. Model via `GROQ_MODEL`
  (default `llama-3.3-70b-versatile`).
- `lib/anthropic.ts` made **lazy** (`getAnthropic()`) so importing `structuredCall` no longer
  requires `ANTHROPIC_API_KEY` at load — essential when the app runs on Groq with no Anthropic
  key set.
- Groq is **lazy-imported** only when `GROQ_API_KEY` is set, so it's a separate chunk.

The eval harness (ADR-0007/0012) can score Groq too — set `GROQ_API_KEY` and run `npm run eval`
to measure the quality delta vs. Claude, keeping ADR-0006's "model choice = whatever the evals
say" honest.

## Alternatives considered

- **Google Gemini free tier.** Also free/no-card, but free-tier inputs/outputs may be used to
  improve Google's models (a data-sharing concern for a public app) and quotas were cut sharply
  in Dec 2025. Groq doesn't train on inputs and is OpenAI-compatible (least wiring), so it's the
  default; Gemini could be added behind the same seam later.
- **Run the Agent SDK in a Vercel Sandbox** so the deployed app uses the subscription. Heavy
  infra + per-request CLI latency; the free-tier HTTP provider is far simpler for serverless.
- **Stay Anthropic-API-only.** Requires a funded metered key for the deployed app — the exact
  cost we're avoiding.

## Consequences

- **Good:** the deployed public site can run triage/monitor/drift/tasks **for free** within
  Groq's free-tier limits; three backends now live behind one seam (subscription local, Groq
  deployed, Anthropic API optional). Lazy clients mean no provider's key is required unless that
  provider is actually used.
- **Limits:** Groq free tier has per-minute/day rate caps (fine for this app's bursty use) and
  the open model is lower quality than Claude — quantified by the eval harness, not hand-waved.
- **Ops:** set `GROQ_API_KEY` in the Vercel env to switch the deployed app to Groq; it takes
  precedence over any Anthropic key. `npm run *:local` (subscription) and the eval are
  unaffected unless `GROQ_API_KEY` is present in that environment.
