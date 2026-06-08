/**
 * Local accuracy-drift check on your Claude subscription (no metered API key).
 *   npm run drift:local
 * Runs the eval golden set and records an ACCURACY_DRIFT MonitorEvent, so the Monitoring
 * dashboard's accuracy sparkline reflects real numbers.
 */
import { applySubscriptionBackend } from "@/lib/agent/subscription";
import { runEval, EVAL_THRESHOLD } from "@/lib/eval";
import { recordMonitorEvent } from "@/lib/monitor";
import { prisma } from "@/lib/db";

applySubscriptionBackend();

async function main() {
  console.log("Running drift check (eval over the golden set) via the Claude subscription…\n");
  const r = await runEval();
  const pct = (x: number) => Math.round(x * 100);
  await recordMonitorEvent({
    type: "ACCURACY_DRIFT",
    severity: r.belowThreshold ? "CRITICAL" : "INFO",
    title: `Eval: category ${pct(r.categoryAccuracy)}%, sentiment ${pct(r.sentimentAccuracy)}% (n=${r.n})`,
    detail: {
      categoryAccuracy: r.categoryAccuracy,
      sentimentAccuracy: r.sentimentAccuracy,
      n: r.n,
      avgLatencyMs: r.avgLatencyMs,
      misses: r.misses.length,
      threshold: EVAL_THRESHOLD,
    },
  });
  console.log(`Done. category=${pct(r.categoryAccuracy)}% sentiment=${pct(r.sentimentAccuracy)}% (n=${r.n})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
