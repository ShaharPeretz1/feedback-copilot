/**
 * Eval harness for the classify step.
 *
 * Runs the agent's classifier over a labeled golden set and reports category +
 * sentiment accuracy. This is the observability/quality gate: regressions in the
 * prompt or model show up as an accuracy drop before they reach the UI.
 *
 *   npx tsx scripts/eval.ts
 *
 * Requires ANTHROPIC_API_KEY in the environment.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { classify } from "@/lib/agent/triage";

type GoldenItem = {
  rawText: string;
  expected: { category: string; sentiment: string };
};

async function main() {
  const golden: GoldenItem[] = JSON.parse(
    readFileSync(join(process.cwd(), "evals", "golden.json"), "utf8")
  );

  let catCorrect = 0;
  let sentCorrect = 0;
  let totalLatency = 0;
  const misses: string[] = [];

  console.log(`\nRunning classify eval over ${golden.length} golden items...\n`);

  for (const [i, item] of golden.entries()) {
    const { data, latencyMs } = await classify(item.rawText);
    totalLatency += latencyMs;
    const catOk = data.category === item.expected.category;
    const sentOk = data.sentiment === item.expected.sentiment;
    if (catOk) catCorrect++;
    if (sentOk) sentCorrect++;

    const mark = catOk && sentOk ? "PASS" : "MISS";
    console.log(
      `${String(i + 1).padStart(2)}. [${mark}] cat ${data.category}` +
        `${catOk ? "" : ` (exp ${item.expected.category})`}` +
        ` | sent ${data.sentiment}${sentOk ? "" : ` (exp ${item.expected.sentiment})`}` +
        ` | ${latencyMs}ms`
    );
    if (!catOk || !sentOk) misses.push(item.rawText.slice(0, 60));
  }

  const n = golden.length;
  const catAcc = ((catCorrect / n) * 100).toFixed(1);
  const sentAcc = ((sentCorrect / n) * 100).toFixed(1);

  console.log("\n--- Results ---");
  console.log(`Category accuracy : ${catCorrect}/${n}  (${catAcc}%)`);
  console.log(`Sentiment accuracy: ${sentCorrect}/${n}  (${sentAcc}%)`);
  console.log(`Avg latency       : ${Math.round(totalLatency / n)}ms`);
  if (misses.length) {
    console.log("\nMisses:");
    misses.forEach((m) => console.log(`  - ${m}...`));
  }
  console.log("");

  // Fail CI if quality drops below threshold.
  const THRESHOLD = 0.8;
  if (catCorrect / n < THRESHOLD || sentCorrect / n < THRESHOLD) {
    console.error(`Eval below ${THRESHOLD * 100}% threshold.`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
