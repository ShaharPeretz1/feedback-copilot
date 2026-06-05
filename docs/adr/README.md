# Architecture Decision Records

Each ADR captures one significant decision in plain English: the context that forced
the decision, what we chose, what we rejected, and the consequences we accept.

Each row links the decision to the PR that shipped it, so you can go decision → code in one
hop. For the full chronological history (every PR, what changed, and whether it's live), see
the [CHANGELOG](../../CHANGELOG.md).

| #    | Decision                                              | Status   | PR |
| ---- | ----------------------------------------------------- | -------- | -- |
| [0001](0001-full-stack-typescript-nextjs.md) | Build as full-stack TypeScript on Next.js | Accepted | [#1](https://github.com/ShaharPeretz1/feedback-copilot/pull/1) |
| [0002](0002-pin-prisma-v6.md) | Pin Prisma to v6 (not v7)                              | Accepted | [#1](https://github.com/ShaharPeretz1/feedback-copilot/pull/1) |
| [0003](0003-postgresql-on-neon.md) | PostgreSQL on Neon (serverless)                  | Accepted | [#2](https://github.com/ShaharPeretz1/feedback-copilot/pull/2) |
| [0004](0004-data-model.md) | Data model: Feedback / Theme / TraceLog                  | Accepted | [#2](https://github.com/ShaharPeretz1/feedback-copilot/pull/2) |
| [0005](0005-multi-step-agent-tool-calling.md) | Multi-step agent with forced tool-calling | Accepted | [#3](https://github.com/ShaharPeretz1/feedback-copilot/pull/3) |
| [0006](0006-claude-haiku-model.md) | Use Claude Haiku as the triage model             | Accepted | [#3](https://github.com/ShaharPeretz1/feedback-copilot/pull/3) |
| [0007](0007-eval-harness.md) | Eval harness with a golden set + accuracy gate         | Accepted | [#6](https://github.com/ShaharPeretz1/feedback-copilot/pull/6) |
| [0008](0008-deploy-vercel.md) | Deploy on Vercel                                      | Accepted | [#8](https://github.com/ShaharPeretz1/feedback-copilot/pull/8) |
| [0009](0009-impact-ranking.md) | Rank issues by impact (recurrence × severity)       | Accepted | [#9](https://github.com/ShaharPeretz1/feedback-copilot/pull/9) |
| [0010](0010-monitoring-model.md) | System-monitoring model + event taxonomy          | Accepted | [#10](https://github.com/ShaharPeretz1/feedback-copilot/pull/10) |
| [0011](0011-llm-judge-misuse.md) | LLM-judge for suspect classifications & misuse    | Accepted | [#11](https://github.com/ShaharPeretz1/feedback-copilot/pull/11) |
| [0012](0012-accuracy-drift.md) | Accuracy drift via the eval golden set              | Accepted | [#12](https://github.com/ShaharPeretz1/feedback-copilot/pull/12) |
| [0013](0013-ops-tasks.md) | Ops layer: Task model + generation                       | Accepted | [#13](https://github.com/ShaharPeretz1/feedback-copilot/pull/13) |
| [0014](0014-github-export.md) | Export tasks to GitHub Issues                        | Accepted | [#14](https://github.com/ShaharPeretz1/feedback-copilot/pull/14) |
| [0015](0015-tests-and-ci.md) | Unit tests (Vitest) + GitHub Actions CI               | Accepted | [#18](https://github.com/ShaharPeretz1/feedback-copilot/pull/18) |
| [0016](0016-trace-timeline.md) | Surface the agent trace timeline in the UI          | Accepted | [#19](https://github.com/ShaharPeretz1/feedback-copilot/pull/19) |

(Statuses move from Proposed to Accepted as each PR merges.)

## Writing a new ADR

When making a significant decision, add `NNNN-short-title.md` (next number) following the
existing format — **Context / Decision / Alternatives considered / Consequences** — set it
`Proposed`, list it in the table above with its PR, and flip it to `Accepted` when the PR
merges. Add a matching entry to the [CHANGELOG](../../CHANGELOG.md).
