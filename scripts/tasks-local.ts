/**
 * Local ops-task generation on your Claude subscription (no metered API key).
 *   npm run tasks:local
 * Turns the top themes + open monitoring events into a ranked task backlog, so the Ops
 * dashboard shows real generated tasks.
 */
import { applySubscriptionBackend } from "@/lib/agent/subscription";
import { generateTasks } from "@/lib/agent/ops";
import { prisma } from "@/lib/db";

applySubscriptionBackend();

async function main() {
  console.log("Generating ops tasks from top themes + open events via the Claude subscription…\n");
  const r = await generateTasks();
  console.log(`Done. generated=${r.generated} skipped=${r.skipped} considered=${r.considered}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
