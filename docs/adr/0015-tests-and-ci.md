# ADR-0015: Unit tests (Vitest) + GitHub Actions CI

**Status:** Accepted
**Date:** 2026-06-05

## Context

Until now, quality was verified by hand on each PR (`tsc`, `lint`, `build`, a runtime check).
That's fine for one author but doesn't scale and isn't enforced — a regression in the impact
ranking or the eval scoring could merge unnoticed. The most logic-heavy, regression-prone
pieces are pure and easily testable: the impact-scoring math (`lib/score.ts`) and the eval
scoring (`lib/eval.ts`). We want those locked down and the whole verification checklist run
automatically on every PR.

## Decision

Add **Vitest** for unit tests and a **GitHub Actions** workflow as the PR gate.

- **Tests** (`tests/*.test.ts`): cover `lib/score.ts` exhaustively (priority weights, the
  negative-sentiment multiplier, rounding, severity-over-volume ranking, unknown values,
  `tally`, `severityImpact`) and `lib/eval.ts` scoring by **mocking `classify`** so accuracy
  math, miss counting, the threshold gate, and the empty-set case are tested with no API or
  database. `vitest.config.ts` resolves the `@/` alias to match the app.
- **CI** (`.github/workflows/ci.yml`): on PRs and pushes to `main`, run `npm ci` →
  `tsc --noEmit` → `lint` → `test` → `build`. Build/test use dummy `DATABASE_URL` /
  `ANTHROPIC_API_KEY` because the build never connects (client UI + `force-dynamic` routes)
  and tests mock the agent — so CI needs no real secrets.

## Alternatives considered

- **Jest.** Works, but needs more config for ESM/TS/path-aliases; Vitest is TS/ESM-native and
  resolves the `@/` alias with a few lines, matching this Vite-less Next project cleanly.
- **Full route/integration tests with a test database.** Higher value eventually, but needs a
  Postgres service in CI and Prisma mocking/fixtures — heavy for this step. The pure logic
  (scoring, eval) is where regressions actually hurt and is testable today; route behavior is
  still covered by `tsc` + `build` + the per-PR runtime check. Integration tests can come
  later.
- **Component tests (React Testing Library).** Deferred — the dashboards are thin views over
  tested APIs/helpers; the payoff is low relative to setup (jsdom, RTL) right now.

## Consequences

- **Good:** the ranking and eval logic can't silently regress; every PR is gated on the same
  checklist a human used to run by hand, enforced in GitHub. `npm test` is part of the local
  loop too.
- **Scope:** coverage is unit-level (pure logic). Routes, agents, and UI are not yet
  unit-tested — guarded by types, build, and manual checks until integration tests are added.
- **Cost:** ~negligible CI minutes (no DB, no real API calls).
