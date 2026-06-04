import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

// GET /api/monitor?type=&status=&severity=
// Lists system-monitoring events, newest first.
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const where: Prisma.MonitorEventWhereInput = {};
  const type = sp.get("type");
  const status = sp.get("status");
  const severity = sp.get("severity");
  if (type) where.type = type as Prisma.MonitorEventWhereInput["type"];
  if (status) where.status = status as Prisma.MonitorEventWhereInput["status"];
  if (severity) where.severity = severity as Prisma.MonitorEventWhereInput["severity"];

  const events = await prisma.monitorEvent.findMany({
    where,
    orderBy: [{ createdAt: "desc" }],
  });
  return NextResponse.json({ events });
}
