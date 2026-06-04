# Architecture Decision Records

Each ADR captures one significant decision in plain English: the context that forced
the decision, what we chose, what we rejected, and the consequences we accept.

| #    | Decision                                              | Status   |
| ---- | ----------------------------------------------------- | -------- |
| 0001 | Build as full-stack TypeScript on Next.js             | Accepted |
| 0002 | Pin Prisma to v6 (not v7)                              | Accepted |
| 0003 | PostgreSQL on Neon (serverless)                       | Accepted |
| 0004 | Data model: Feedback / Theme / TraceLog               | Accepted |
| 0005 | Multi-step agent with forced tool-calling             | Accepted |
| 0006 | Use Claude Haiku as the triage model                  | Accepted |
| 0007 | Eval harness with a golden set + accuracy gate        | Accepted |
| 0008 | Deploy on Vercel                                       | Proposed |

(Statuses move from Proposed to Accepted as each PR merges.)
