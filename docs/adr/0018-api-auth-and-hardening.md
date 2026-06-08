# ADR-0018: API auth gate + ingest hardening

**Status:** Accepted
**Date:** 2026-06-08

## Context

The API was fully public: anyone could ingest feedback, run the agents, mutate statuses,
generate tasks, and trigger GitHub exports. For a deployed app that's a real gap (spam,
abuse, unwanted writes), and prompt-injection text could flow straight into the agent. We
want a proportionate security posture for a single-owner portfolio app — not a full
multi-user identity system.

## Decision

- **Reads public, writes gated.** Next.js **middleware** (`middleware.ts`, matcher
  `/api/:path*`) lets `GET`/`HEAD` through (so the dashboards stay viewable by anyone) and
  requires an **admin token** for every mutating/agent request (`POST`/`PATCH`/…). The token
  is checked against `ADMIN_API_TOKEN`; if that env var is unset (local dev) the gate is open.
  Supplied via `x-admin-key` or `Authorization: Bearer`.
- **Admin-key UI.** A small "Admin" button (`components/Nav.tsx`) stores the key in
  localStorage; `authedFetch` (`lib/client-auth.ts`) attaches it to mutating calls. Anonymous
  visitors get a read-only experience; the owner unlocks writes with the key.
- **Injection block at ingest.** `screenForInjection` (`lib/security.ts`) is a deterministic
  pattern check run synchronously in `POST /api/feedback`; obvious prompt-injection is rejected
  with `422` before it's ever stored or sent to the agent. (The LLM misuse scan from ADR-0011
  remains the deeper, post-hoc check.)
- **Best-effort rate limit** on mutating requests + baseline **security headers**
  (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` via
  `next.config.ts`).

## Alternatives considered

- **Full auth provider (Clerk/Auth0/NextAuth).** Proper multi-user identity, but heavy and a
  vendor for a single-owner demo. A shared admin token is proportionate and demonstrates the
  middleware gate; swapping in real auth later is localized to the middleware + UI.
- **Gating reads too.** Would hide the portfolio dashboards from viewers; the value is letting
  people *see* it while preventing writes. Reads stay public by design.
- **Real distributed rate limiting (Vercel KV / Upstash).** Correct for production, but adds a
  store. The in-memory limiter here is **best-effort and per serverless instance** — enough to
  blunt naive hammering; a shared-store limiter is the documented upgrade.

## Consequences

- **Good:** the public API can no longer be written to anonymously; injection is stopped at
  the door; standard headers are set — all without a vendor or login system.
- **Limits:** a single shared token is coarse (no per-user identity/audit); the rate limit is
  best-effort per-instance. Both are documented upgrades, not hidden.
- **Ops:** `ADMIN_API_TOKEN` must be set in the Vercel env; the owner enters it once via the
  Admin button to operate the deployed app. `npm run triage:local` writes via Prisma directly,
  so it's unaffected by the gate.
