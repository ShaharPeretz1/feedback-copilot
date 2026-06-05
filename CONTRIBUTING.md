# Contributing

This project optimizes for a legible history: anyone should be able to trace any change from
a decision to the exact diff to the live deployment. These rules keep it that way.

## The loop (one change = one PR)

1. **Branch** off `main`: `prNN-short-topic` (e.g. `pr17-saved-views`).
2. **Build** the change. Reuse existing helpers rather than reinventing them — notably
   `structuredCall` (`lib/agent/structured.ts`) for any new agent step, `impactScore`
   (`lib/score.ts`), the shared `runEval` (`lib/eval.ts`), `recordMonitorEvent`
   (`lib/monitor.ts`), and the shared types/`Badge` in `lib/types.ts` / `components/`.
3. **Write an ADR** for any significant decision (see below).
4. **Verify** (see checklist) and clean up any test data you wrote to the database.
5. **Update the [CHANGELOG](CHANGELOG.md)** with a new entry (PR → ADR → summary → status).
6. **Open a PR** (the template prompts for everything), **squash-merge** it, and delete the
   branch. Merging to `main` auto-deploys to
   [feedback-copilot.vercel.app](https://feedback-copilot.vercel.app).

Commit/PR titles use conventional-commit prefixes: `feat(scope):`, `fix(scope):`, `docs:`,
`chore:`, `refactor:`.

## Verification checklist (before every merge)

```bash
npx tsc --noEmit     # types clean
npm run lint         # eslint clean (0 errors)
npm run build        # next build succeeds
```

Then a **runtime check** against the database for anything touching data or routes (run
`npm run dev` and exercise the new endpoint/UI). If you seed rows to test, delete them
afterward so the demo database stays clean.

## Writing an ADR

Significant = anything that shapes architecture, a data model, a dependency, an external
integration, or a non-obvious tradeoff. Add `docs/adr/NNNN-short-title.md` (next number) with
this structure:

- **Context** — the problem/force that prompted the decision.
- **Decision** — what we chose, concretely.
- **Alternatives considered** — what we rejected and why.
- **Consequences** — what we gain, what we accept/give up.

Set it `Proposed`, add a row to the [ADR index](docs/adr/README.md) with its PR, and flip it
to `Accepted` when the PR merges.

## Database changes

Schema lives in `prisma/schema.prisma`; we use `prisma db push` (no migrations directory —
see ADR-0002/0004). Follow existing conventions: `cuid()` ids, PascalCase models,
SCREAMING_SNAKE enums, `createdAt @default(now())`, `@@index` on filtered columns. Run
`npm run db:push` against the database after editing the schema.

## Environment & keys

Copy `.env.example` to `.env`. Agent features (triage, monitor scan, drift, task generation)
need a funded `ANTHROPIC_API_KEY`; GitHub export needs a `GITHUB_TOKEN` with `issues:write`.
Build code so the feature **fails gracefully** (a clean 4xx/5xx JSON error, never a crash)
when a key is absent — this is the established pattern across all agent routes.

## What "done" looks like

A merged PR with: a passing verification checklist, an ADR (if a decision was made), a
CHANGELOG entry, graceful handling of missing keys, and no stray test data. If you can't trace
the change from the CHANGELOG to the ADR to the diff, it isn't done.
