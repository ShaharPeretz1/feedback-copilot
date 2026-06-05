/**
 * Eval harness for the classify step (CLI).
 *
 * Runs the agent's classifier over a labeled golden set and reports category +
 * sentiment accuracy. Shares its scoring with the drift route (lib/eval.ts) so the
 * CLI and the in-app monitor never diverge.
 *
 *   npm run eval
 *
 * Requires ANTHROPIC_API_KEY in the environment (loaded from .env).
 */
import { runEval, EVAL_THRESHOLD, GOLDEN } from "@/lib/eval";

async function main() {
  console.log(`\nRunning classify eval over ${GOLDEN.length} golden items...\n`);

  const result = await runEval();

  const pct = (x: number) => (x * 100).toFixed(1);
  console.log("--- Results ---");
  console.log(`Category accuracy : ${result.categoryCorrect}/${result.n}  (${pct(result.categoryAccuracy)}%)`);
  console.log(`Sentiment accuracy: ${result.sentimentCorrect}/${result.n}  (${pct(result.sentimentAccuracy)}%)`);
  console.log(`Avg latency       : ${result.avgLatencyMs}ms`);
  if (result.misses.length) {
    console.log("\nMisses:");
    for (const m of result.misses) {
      const cat = m.gotCategory === m.expCategory ? "" : ` cat ${m.gotCategory}≠${m.expCategory}`;
      const sent = m.gotSentiment === m.expSentiment ? "" : ` sent ${m.gotSentiment}≠${m.expSentiment}`;
      console.log(`  - ${m.rawText.slice(0, 56)}…${cat}${sent}`);
    }
  }
  console.log("");

  if (result.belowThreshold) {
    console.error(`Eval below ${EVAL_THRESHOLD * 100}% threshold.`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
