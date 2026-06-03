# ADR-0002: Pin Prisma to v6 (not v7)

**Status:** Accepted
**Date:** 2026-06-03

## Context

We need an ORM / query layer for PostgreSQL. Prisma is the obvious fit for a TypeScript
project: typed queries, a readable schema language, and simple migrations. At build time
the latest published Prisma was **v7**, which ships a new client generator (`prisma-client`)
that changes how and where the client is generated and imported.

## Decision

Pin both `prisma` and `@prisma/client` to **v6** (6.19.x).

## Alternatives considered

- **Prisma v7 (latest).** The new generator is the future direction and has some
  performance wins, but it requires extra configuration (explicit output path, ESM
  import changes) and is less represented in existing docs/examples. For a one-day build
  where Vercel deploy reliability matters, that's avoidable risk.
- **Drizzle ORM.** Lighter and SQL-first, but Prisma's schema-first model and generated
  types are faster to stand up and easier to read in a portfolio context.

## Consequences

- **Good:** Battle-tested with Next.js + Vercel + Neon; the `@prisma/client` import
  "just works"; abundant documentation if something goes wrong.
- **Cost:** Not on the newest major version. Upgrading to v7 later is a contained,
  well-documented migration if we ever need it.
- **Note:** `prisma generate` runs in `postinstall` and in the `build` script so the
  client is always present in CI/Vercel before `next build`.
