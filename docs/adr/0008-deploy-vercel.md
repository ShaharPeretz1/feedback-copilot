# ADR-0008: Deploy on Vercel

**Status:** Accepted
**Date:** 2026-06-04

## Context

The app is a Next.js (App Router) project with `force-dynamic` API routes, a Prisma
client, and an Anthropic-backed agent. It needs a host that runs the Next.js server
runtime, injects secrets (`DATABASE_URL`, `ANTHROPIC_API_KEY`) per environment, and gives
us a public URL with minimal operational overhead. ADR-0003 already committed us to Neon
serverless Postgres, which pairs naturally with serverless hosting.

## Decision

Deploy on **Vercel**, the first-party host for Next.js.

- **Database**: provision **Neon** through the Vercel Marketplace integration, which
  auto-injects the full connection-string family (`DATABASE_URL` pooled + `DATABASE_URL_UNPOOLED`)
  into the project's Production/Preview/Development environments.
- **Build**: `npm run build` runs `prisma generate && next build`. The build needs **no live
  database** — the dashboard is a client component and every API route is `force-dynamic`,
  so nothing queries Postgres at build time. Only `prisma generate` runs, which is offline.
- **Schema**: applied once with `prisma db push` over Neon's **unpooled** connection (DDL
  over the PgBouncer pooler can stall on advisory locks); the app runtime uses the pooled URL.
- **Secrets**: `DATABASE_URL` comes from the Neon integration; `ANTHROPIC_API_KEY` is set as
  a Vercel project env var.

Live: <https://feedback-copilot.vercel.app>

## Alternatives considered

- **Render / Fly.io / a container on a VPS.** All viable, but none are first-party for
  Next.js; we'd hand-roll the build pipeline, env injection, and edge/CDN config that Vercel
  gives by default. ADR-0001 chose Next.js partly for this zero-config host story.
- **Vercel Postgres (native).** Now effectively Neon under the hood and steered through the
  Marketplace anyway; going straight to the Neon integration is the current supported path
  and matches ADR-0003.

## Consequences

- **Good:** `git push` / `vercel --prod` yields a public, server-rendered deployment with
  managed Postgres and per-environment secrets, no infra to babysit. Build is decoupled from
  the database, so deploys never block on DB availability.
- **Operational note:** the agent requires a **funded Anthropic API key** (the API is billed
  separately from any Claude subscription). Until a real key is set in the Vercel env, the
  dashboard, feedback ingest/list, and themes all work against Neon, but `POST /api/agent/triage`
  returns a clean `401 invalid x-api-key` (caught and surfaced as JSON, not a crash). Swapping
  in a funded key is a single env-var change plus a redeploy.
- **Cost:** Vercel Hobby + Neon free tier carry this at $0; the only spend is per-token
  Anthropic usage when triage runs.
