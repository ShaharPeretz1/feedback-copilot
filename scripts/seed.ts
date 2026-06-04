/**
 * Seeds the database with realistic raw feedback (status NEW, untriaged) so the
 * demo has something to triage on first load.
 *
 *   npx tsx scripts/seed.ts
 */
import { prisma } from "@/lib/db";

const SAMPLES: { rawText: string; source: string; customerName?: string }[] = [
  { rawText: "The CSV export just spins and never downloads on Safari. Works fine in Chrome.", source: "intercom", customerName: "Dana R." },
  { rawText: "Love the redesigned dashboard, it loads so much faster now. Whatever you did, keep it up!", source: "nps", customerName: "Marcus T." },
  { rawText: "I got charged twice this month and the invoice doesn't match my plan. Need a refund please.", source: "email", customerName: "Priya N." },
  { rawText: "Took me forever to find the settings page, the left nav is really confusing for new users.", source: "intercom", customerName: "Sam K." },
  { rawText: "Generating a report with ~500 rows takes 30+ seconds. It's painfully slow during demos.", source: "support", customerName: "Olivia B." },
  { rawText: "Please add a Slack integration so our team gets alerts in our channel instead of email.", source: "feature-board", customerName: "Wei L." },
  { rawText: "Entire app threw a 500 on every page for about 10 minutes this morning. Lost some work.", source: "support", customerName: "Hassan A." },
  { rawText: "The onboarding wizard skipped the data-source step and I never connected my warehouse.", source: "intercom", customerName: "Grace M." },
  { rawText: "Could you let us bulk-assign tickets? Clicking through them one at a time is tedious.", source: "feature-board", customerName: "Tom V." },
  { rawText: "Search jumps back to the top of the page every time I click next page. Mildly infuriating.", source: "intercom", customerName: "Lena P." },
  { rawText: "Your support fixed my SSO issue in five minutes flat. Genuinely the best I've dealt with.", source: "nps", customerName: "Diego F." },
  { rawText: "Analytics tab freezes the browser for ~10 seconds whenever I open it. Happens every time.", source: "support", customerName: "Ava S." },
];

async function main() {
  // Clean slate so reseeding is idempotent.
  await prisma.traceLog.deleteMany();
  await prisma.feedback.deleteMany();
  await prisma.theme.deleteMany();

  await prisma.feedback.createMany({ data: SAMPLES });
  const count = await prisma.feedback.count();
  console.log(`Seeded ${count} feedback items (status NEW). Run triage in the UI or via the API.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
