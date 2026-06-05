<!-- See CONTRIBUTING.md for the full workflow. -->

## What & why

<!-- One or two sentences: what this changes and the problem it solves. -->

## Changes

-

## ADR

<!-- Link the ADR(s) for any significant decision, or write "n/a" for a trivial/docs change. -->
ADR:

## Verification

- [ ] `npx tsc --noEmit` clean
- [ ] `npm run lint` clean (0 errors)
- [ ] `npm run build` succeeds
- [ ] Runtime check against the DB (new route/UI exercised); any test data cleaned up
- [ ] Agent/integration features fail gracefully without a key (`ANTHROPIC_API_KEY` / `GITHUB_TOKEN`)

## Tracking

- [ ] [CHANGELOG.md](../CHANGELOG.md) entry added (PR → ADR → summary → status)
- [ ] [ADR index](../docs/adr/README.md) row added/updated with this PR (if an ADR was added)
