# ADR-0014: Export tasks to GitHub Issues

**Status:** Accepted
**Date:** 2026-06-04

## Context

The ops dashboard (ADR-0013) produces a ranked backlog, but engineers work out of an issue
tracker, not this app. The last step of the loop is getting a generated task into the tracker
with one click. The repo already lives on GitHub, so GitHub Issues is the natural target
(decided with the user).

## Decision

Add **`POST /api/tasks/[id]/export`**: it creates a GitHub issue via the REST API
(`POST /repos/{repo}/issues`) using a **`GITHUB_TOKEN`** env var, targeting `GITHUB_REPO`
(default `ShaharPeretz1/feedback-copilot`). The issue title is the task title; the body carries
the description, severity/effort/impact, area, and a link back to the source theme/event. The
returned `html_url` is stored on `Task.externalUrl`. The call is **idempotent** — an
already-exported task returns its existing URL instead of opening a duplicate. An
**"Export to GitHub"** button on each task swaps to a "View issue ↗" link once exported.

Failure modes return clear, actionable JSON: `400` when `GITHUB_TOKEN` is unset, `502` with the
GitHub status/message on an API or network error.

No labels are attached: the GitHub API rejects labels that don't already exist in the repo, so
severity/effort live in the issue body instead — avoids a brittle 422 and keeps export setup to
just a token.

## Alternatives considered

- **Linear** (which the user also has connected). Viable, but the deployed app would need a
  Linear API key + team id, and the repo is already on GitHub — GitHub Issues is the lower-
  friction default. The route is small enough to add a Linear variant later if wanted.
- **Octokit SDK** instead of raw `fetch`. Nicer ergonomics but a dependency for a single POST;
  `fetch` against the documented REST endpoint is enough and keeps the bundle lean.
- **Auto-export on generation.** Too aggressive — it would spam the tracker with unreviewed,
  AI-generated tasks. Export stays an explicit per-task action after a human looks at it.

## Consequences

- **Good:** closes the loop — feedback/monitoring → ranked task → real GitHub issue in one
  click, with traceability back to the source and no duplicate issues.
- **Setup:** requires a `GITHUB_TOKEN` with `issues:write` in the Vercel env; until it's set,
  the button fails gracefully with an actionable message (no crash).
- **Scope:** one tracker (GitHub), no label sync, no two-way status mirroring — export is
  one-directional by design.
