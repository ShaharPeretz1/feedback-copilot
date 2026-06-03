# ADR-0006: Use Claude Haiku as the triage model

**Status:** Accepted
**Date:** 2026-06-03

## Context

The agent makes three LLM calls per feedback item. The work is mostly classification and
short drafting — bounded, well-specified tasks, not open-ended reasoning. We're cost-
sensitive (calls run on the owner's API key) and we want the batch to feel responsive.

## Decision

Default to **Claude Haiku** (`claude-3-5-haiku-latest`), configurable via the
`ANTHROPIC_MODEL` env var. We validate the choice empirically with the eval harness
(ADR-0007): if Haiku's category/sentiment accuracy on the golden set holds above the
threshold, it stays; if not, bump to Sonnet by changing one env var.

## Alternatives considered

- **Claude Sonnet.** Higher accuracy and better drafting, but several times the cost and
  latency per call — multiplied by 3 calls × every item. Reserve as the fallback if evals
  show Haiku is too weak.
- **A non-Anthropic model.** We standardized on Claude for this build; no reason to add a
  second provider.

## Consequences

- **Good:** Cheap and fast, which matters when every item triggers 3 calls. The model is
  swappable via one env var, and the eval harness gives us a number to justify it.
- **Cost / trade-off:** Haiku can be slightly less nuanced on ambiguous feedback or
  borderline priority calls; the eval gate is how we catch that.
- **Prompt caching considered, not used:** Our system prompts are short (well under the
  per-model minimum cacheable prompt size), so prompt caching wouldn't engage and adds
  no benefit here. Revisit if prompts grow large.
