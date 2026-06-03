import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/themes -> themes with feedback counts and priority/sentiment rollups.
export async function GET() {
  const themes = await prisma.theme.findMany({
    include: {
      feedback: {
        select: { priority: true, sentiment: true },
      },
    },
  });

  const shaped = themes
    .map((t) => {
      const count = t.feedback.length;
      const negative = t.feedback.filter((f) => f.sentiment === "NEGATIVE").length;
      const topPriority = ["P0", "P1", "P2", "P3"].find((p) =>
        t.feedback.some((f) => f.priority === p)
      );
      return {
        id: t.id,
        name: t.name,
        summary: t.summary,
        count,
        negative,
        topPriority: topPriority ?? null,
      };
    })
    .sort((a, b) => b.count - a.count);

  return NextResponse.json({ themes: shaped });
}
