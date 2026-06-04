# ADR-0007: Eval harness with a golden set + accuracy gate

**Status:** Accepted
**Date:** 2026-06-03

## Context

The agent's quality lives in prompts and the chosen model — both easy to change and easy
to silently regress. We need an objective signal that the classifier still works after a
prompt tweak or a model swap (ADR-0006 explicitly defers the model choice to "whatever the
evals say"). "It looked fine when I clicked around" is not a signal.

## Decision

Add a small **eval harness** (`scripts/eval.ts`) that runs the real `classify` step over a
hand-labeled **golden set** (`evals/golden.json`, 15 items spanning every category) and
reports **category accuracy** and **sentiment accuracy**, plus average latency. It prints a
per-item PASS/MISS line and a summary, and **exits non-zero if either metric drops below
80%** so it can act as a CI/quality gate.

We eval **category and sentiment** (objective, stable labels) rather than priority (more
subjective and context-dependent) or the drafted reply (no single correct answer).

## Alternatives considered

- **No evals, manual spot-checks.** Zero infrastructure, but regressions are invisible and
  the model choice in ADR-0006 would be unjustified hand-waving.
- **LLM-as-judge on the drafted replies.** Useful for open-ended output, but adds cost and
  its own reliability questions. Out of scope for a one-day build; the deterministic
  classification metrics give us most of the safety for far less complexity.
- **A large labeled dataset.** Better statistical power, but expensive to build by hand.
  15 well-chosen items across categories is enough to catch gross regressions here.

## Consequences

- **Good:** A single command (`npm run eval`) turns "is the agent still good?" into a
  number. Makes the Haiku-vs-Sonnet decision empirical and guards against prompt drift.
- **Cost:** Running the eval makes ~15 real Anthropic calls (a few cents). It is opt-in
  (run manually), not part of every build.
- **Limited scope:** Small golden set = coarse signal; it catches big regressions, not
  subtle ones. Expanding the set later is cheap.
