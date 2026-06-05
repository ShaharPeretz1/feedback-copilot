import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { impactScore } from "@/lib/score";

export const dynamic = "force-dynamic";

// GET /api/ops/summary -> exec health summary. Pure aggregation, no LLM calls.
export async function GET() {
  const [tasks, themes, monitorOpen, latestDriftEvent] = await Promise.all([
    prisma.task.findMany({ select: { status: true, severity: true } }),
    prisma.theme.findMany({ include: { feedback: { select: { priority: true, sentiment: true } } } }),
    prisma.monitorEvent.findMany({
      where: { status: { in: ["OPEN", "ACKNOWLEDGED"] } },
      select: { type: true },
    }),
    prisma.monitorEvent.findFirst({
      where: { type: "ACCURACY_DRIFT" },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const open = tasks.filter((t) => t.status === "TODO" || t.status === "IN_PROGRESS");
  const bySeverity: Record<string, number> = {};
  for (const t of open) bySeverity[t.severity] = (bySeverity[t.severity] ?? 0) + 1;

  const monitorOpenByType: Record<string, number> = {};
  for (const e of monitorOpen) monitorOpenByType[e.type] = (monitorOpenByType[e.type] ?? 0) + 1;

  const topThemes = themes
    .map((t) => ({ id: t.id, name: t.name, impactScore: impactScore(t.feedback), count: t.feedback.length }))
    .filter((t) => t.count > 0)
    .sort((a, b) => b.impactScore - a.impactScore)
    .slice(0, 5);

  let latestDrift = null;
  if (latestDriftEvent?.detail) {
    try {
      const j = JSON.parse(latestDriftEvent.detail);
      latestDrift = {
        categoryAccuracy: j.categoryAccuracy ?? 0,
        sentimentAccuracy: j.sentimentAccuracy ?? 0,
        at: latestDriftEvent.createdAt,
      };
    } catch {
      latestDrift = null;
    }
  }

  // "On fire" = P0 open tasks + open CRITICAL monitor events.
  const p0 = open.filter((t) => t.severity === "P0").length;
  const criticalEvents = await prisma.monitorEvent.count({
    where: { severity: "CRITICAL", status: { in: ["OPEN", "ACKNOWLEDGED"] } },
  });

  return NextResponse.json({
    tasks: {
      open: open.length,
      todo: open.filter((t) => t.status === "TODO").length,
      inProgress: open.filter((t) => t.status === "IN_PROGRESS").length,
      done: tasks.filter((t) => t.status === "DONE").length,
      bySeverity,
    },
    onFire: p0 + criticalEvents,
    topThemes,
    monitorOpenByType,
    latestDrift,
  });
}
