# ADR-0017: Run the agents on a Claude subscription (Agent SDK), locally

**Status:** Accepted
**Date:** 2026-06-08

## Context

ADR-0006 deferred the model/provider choice to "whatever's cheapest that passes the evals,"
and the app has been calling the metered Anthropic API (`ANTHROPIC_API_KEY`). The owner has a
**Claude Max** plan, which (as of June 15, 2026) includes a monthly **Agent SDK credit**
($100 Max 5× / $200 Max 20×) usable by your own projects — so the agents can run for **$0
beyond the existing subscription**, no per-token API bill. The question was how to wire that
in given the SDK's constraints.

## Decision

Add a second `structuredCall` backend that uses the **Claude Agent SDK**
(`@anthropic-ai/claude-agent-sdk`), which authenticates via the logged-in `claude` CLI
(subscription) and returns schema-validated **structured output** — no API key.

Two constraints shaped the architecture:

1. **The SDK spawns the Claude Code CLI as a subprocess**, so it runs locally / in batch, not
   inside a Vercel serverless function (Vercel's own answer is a heavier "Sandbox" microVM).
2. Each structured call is **~10–16s** (CLI startup + validation turns) vs. sub-second for the
   raw API — fine for a batch, wrong for a request handler.

So the subscription backend is **local-batch only**:

- `lib/agent/structured.ts` exposes a swappable backend (`setStructuredCallImpl`), defaulting
  to the API implementation. The Agent SDK impl (`lib/agent/agent-sdk.ts`) is imported **only**
  by `scripts/triage-local.ts` — never by a route — so it is never bundled into the deployed
  app and the live build/runtime are unchanged.
- `npm run triage:local` swaps in the Agent SDK backend and runs the normal `triagePending`
  pipeline against the same Neon DB. The **deployed dashboards then display the genuinely real**
  classifications, themes, and per-step traces it writes.
- The deployed app keeps the API backend (and its graceful `401` when no funded key is set);
  the public site's buttons stay graceful-fail, but everything it *shows* can be real.

`ANTHROPIC_API_KEY` must be **unset** locally — it silently overrides subscription auth and
would bill the API; the script guards against this.

## Alternatives considered

- **Run the Agent SDK inside the Vercel function / a Vercel Sandbox.** Makes the deployed
  "Run triage" button use the subscription, but needs the CLI in a microVM + per-request
  10–16s latency — heavy infra for little gain over the local-batch model.
- **Pass the subscription OAuth token to the raw `messages` API.** The included credit is
  metered for the *Agent SDK* path specifically; using the raw endpoint isn't the supported,
  credit-covered route.
- **A free third-party tier (Gemini/Groq) for the deployed app.** Still the best way to make
  the *public, serverless* buttons work for free; complementary, and easy to add behind the
  same `structuredCall` seam later. Out of scope here (the ask was to leverage Max).

## Consequences

- **Good:** real Claude output for $0 beyond the Max subscription; the swappable-backend seam
  keeps the deployed build clean and lets us add more providers (free tiers, etc.) trivially.
  The eval harness (ADR-0007/0012) can now measure the subscription model too.
- **Limits:** subscription runs are **local/batch**, not the live serverless request path, and
  are slow per call (CLI overhead). The deployed dashboards are the read surface for that data.
- **Footgun documented:** a stray `ANTHROPIC_API_KEY` silently re-routes to the metered API;
  the script refuses to run when it's set.
