# ADR-0001: Build as full-stack TypeScript on Next.js

**Status:** Accepted
**Date:** 2026-06-03

## Context

We need a small but genuinely full-stack web application: a customer-facing UI, a
backend that runs an LLM agent, and a database. It has to be buildable and deployable
in a day, and it should demonstrate breadth across the stack a product engineer is
expected to own (frontend + backend + data + an AI feature).

A separate, existing project already demonstrates a Python/FastAPI backend. So the
marginal value here is showing the *other* common production stack rather than
repeating one we've already shown.

## Decision

Build the whole thing in **TypeScript on Next.js (App Router)**:

- **Frontend:** React 19 + Next.js + Tailwind.
- **Backend:** Next.js API routes (also TypeScript) — same language, same repo, same
  deploy unit.
- One codebase, one toolchain, one deploy.

## Alternatives considered

- **Python/FastAPI backend + separate React frontend.** Closest to what we've already
  built elsewhere; means two languages, two deploy targets, more glue. Rejected because
  it adds operational overhead for a one-day build and doesn't broaden the skill signal.
- **A heavier backend framework (NestJS, separate Express service).** More structure
  than this scope needs; Next.js API routes are enough for a handful of endpoints.

## Consequences

- **Good:** Single language end-to-end, fastest path to a deployable app, first-class
  Vercel support, and it shows TypeScript depth on both ends of the stack.
- **Cost:** Next.js API routes are less suited to long-running or heavy background work
  than a dedicated backend. Our agent runs are short (seconds), so this is acceptable;
  if the workload grew we'd extract a worker service.
