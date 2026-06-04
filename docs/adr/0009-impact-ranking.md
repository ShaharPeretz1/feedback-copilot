# ADR-0009: Rank issues by impact (recurrence × severity)

**Status:** Accepted
**Date:** 2026-06-04

## Context

Themes already cluster repeating feedback, and the themes panel sorted them by raw count.
But raw count is the wrong signal for an analyst deciding what to fix next: five P3 "nice to
have" nits would outrank two P0 outages. We need a ranking that combines **how often an issue
recurs** with **how severe/risky it is**, plus richer filtering so an analyst can slice the
feedback list (by category, sentiment, status, free-text search) rather than eyeball it.

## Decision

Introduce a single **impact score** per theme and rank by it.

- `impactScore = Σ(priorityWeight × sentimentMultiplier)` over the theme's feedback, with
  weights `P0=8, P1=4, P2=2, P3=1` and a `×1.25` bump for NEGATIVE items. Pure, dependency-
  free helper in `lib/score.ts` so it's unit-testable and reused server-side.
- `GET /api/themes` now returns `impactScore`, `sentimentMix`, and `categoryMix`, sorted by
  impact (count breaks ties). The dashboard renders a ranked **"Top issues"** list.
- `GET /api/feedback` gains `category`, `q` (case-insensitive search over rawText + summary),
  and `sort` (recent | priority) on top of the existing status/sentiment/priority/theme
  filters. The dashboard moves from in-memory filtering to **server-driven** query params.
- Shared `Badge` component, style maps, and types are extracted to `components/Badge.tsx` and
  `lib/types.ts`, and a top **nav** (`components/Nav.tsx`) introduces multi-page routing
  (`/`, `/monitoring`, `/ops`) ahead of the monitoring and ops dashboards.

## Alternatives considered

- **Sort by raw count (status quo).** Simple but conflates volume with importance; a noisy
  low-severity theme drowns out a rare critical one.
- **A trained/learned priority model.** Overkill for this scale; the weighted heuristic is
  transparent, tunable in one file, and good enough to order a backlog.
- **Client-side filtering only.** Fine for tiny demos, but pushing filters into the query
  keeps the client thin and scales as feedback grows; the API already had a `where` builder.

## Consequences

- **Good:** "What should we look at first?" becomes a single sortable number; analysts can
  filter to a slice in one bar. The score is one constant block to tune.
- **Limited:** The weights are a heuristic, not ground truth — easy to adjust, but not
  individually justified. Untriaged items contribute 0 impact until classified.
- **Foundation:** the extracted nav/types/Badge and the impact helper are reused by the
  monitoring and ops dashboards that follow.
