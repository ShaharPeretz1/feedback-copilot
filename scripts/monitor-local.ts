/**
 * Local monitor scan on your Claude subscription (no metered API key).
 *   npm run monitor:local
 * Runs the LLM-judge (suspect classifications) + misuse screen over recent feedback and
 * writes MonitorEvents, so the Monitoring dashboard shows real findings.
 */
import { applySubscriptionBackend } from "@/lib/agent/subscription";
import { runMonitorScan } from "@/lib/agent/monitor";
import { prisma } from "@/lib/db";

applySubscriptionBackend();

async function main() {
  console.log("Running monitor scan (LLM-judge + misuse) via the Claude subscription…");
  console.log("(Two calls per item, ~10-20s each — this takes a few minutes.)\n");
  const r = await runMonitorScan();
  console.log(`\nDone. checked=${r.checked} suspect=${r.suspect} misuse=${r.misuse}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
