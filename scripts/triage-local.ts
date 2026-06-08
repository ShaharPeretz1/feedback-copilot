/**
 * Local triage on your Claude subscription (Max Agent SDK credit) — NO metered API key.
 *
 *   npm run triage:local
 *
 * Runs the same triage pipeline as the app, but swaps the structuredCall backend to the
 * Claude Agent SDK (which auths via your logged-in `claude` CLI). The deployed dashboards
 * then display the genuinely real classifications, themes, and traces this writes to Neon.
 *
 * Requires: `claude` CLI installed + logged into your Claude plan, DATABASE_URL pointing
 * at the same database the app uses (loaded from .env.local), and ANTHROPIC_API_KEY UNSET
 * (it would override subscription auth and bill the API).
 */
import { setStructuredCallImpl } from "@/lib/agent/structured";
import { structuredCallAgent } from "@/lib/agent/agent-sdk";
import { triagePending } from "@/lib/agent/triage";
import { prisma } from "@/lib/db";

setStructuredCallImpl(structuredCallAgent);

async function main() {
  if (process.env.ANTHROPIC_API_KEY) {
    console.error(
      "ANTHROPIC_API_KEY is set — it overrides subscription auth and bills the API. Unset it and retry."
    );
    process.exit(1);
  }
  const pending = await prisma.feedback.count({ where: { status: "NEW" } });
  if (pending === 0) {
    console.log("No NEW feedback to triage. Add some (or `npm run db:seed`) first.");
    return;
  }
  console.log(`Triaging ${pending} NEW item(s) via the Claude Agent SDK (subscription)…`);
  console.log("(Each step spawns the Claude CLI, so expect ~10-20s per call.)\n");
  const res = await triagePending();
  console.log(`\nDone. processed=${res.processed} failed=${res.failed}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
