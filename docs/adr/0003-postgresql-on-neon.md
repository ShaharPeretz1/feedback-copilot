# ADR-0003: PostgreSQL on Neon (serverless)

**Status:** Accepted
**Date:** 2026-06-03

## Context

The app needs a relational database to store feedback, the themes the agent clusters
them into, and per-step agent traces. We want a real, queryable, relational store (not
a toy/in-memory one) and we want a **live demo** reachable from a resume link, which
means the database must be hosted somewhere the deployed app can reach. The build also
has to stay on free tiers — no spend without explicit approval.

## Decision

Use **PostgreSQL hosted on Neon** (serverless Postgres, free tier), accessed through
Prisma. The same connection string is used for local development and for the deployed
app, so there is one source of truth.

## Alternatives considered

- **Local PostgreSQL (Docker / Postgres.app).** Fine for development, but gives no
  publicly reachable database, so there'd be no live demo without also provisioning a
  hosted DB. The dev machine has neither Docker nor a local Postgres installed.
- **Supabase.** Also hosted Postgres on a free tier, plus auth/storage we don't need.
  Slightly heavier to set up than Neon for this scope.
- **SQLite.** Zero-setup, but not a realistic production posture and awkward on
  serverless/Vercel (ephemeral filesystem). We specifically want to show Postgres.

## Consequences

- **Good:** Free, zero-ops, scales to zero when idle, and integrates cleanly with
  Vercel. One connection string works everywhere.
- **Cost / trade-off:** Requires a one-time account sign-in (done by the repo owner;
  we don't log into third-party accounts on their behalf). Serverless Postgres can have
  cold-start latency on the first query after idle — negligible for a demo. We use
  Neon's **pooled** connection string so serverless function invocations don't exhaust
  direct connections.
