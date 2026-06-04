import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { impactScore, tally } from "@/lib/score";

export const dynamic = "force-dynamic";

// GET /api/themes -> themes with feedback counts, sentiment/category mixes, and an
// impact score (recurrence x severity). Sorted by impact so the most pressing
// repeating issues surface first.
export async function GET() {
  const themes = await prisma.theme.findMany({
    include: {
      feedback: {
        select: { priority: true, sentiment: true, category: true },
      },
    },
  });

  const shaped = themes
    .map((t) => {
      const count = t.feedback.length;
      const negative = t.feedback.filter((f) => f.sentiment === "NEGATIVE").length;
      const topPriority =
        ["P0", "P1", "P2", "P3"].find((p) => t.feedback.some((f) => f.priority === p)) ?? null;
      return {
        id: t.id,
        name: t.name,
        summary: t.summary,
        count,
        negative,
        topPriority,
        impactScore: impactScore(t.feedback),
        sentimentMix: tally(t.feedback.map((f) => f.sentiment)),
        categoryMix: tally(t.feedback.map((f) => f.category)),
      };
    })
    // Highest impact first; break ties by raw count.
    .sort((a, b) => b.impactScore - a.impactScore || b.count - a.count);

  return NextResponse.json({ themes: shaped });
}
