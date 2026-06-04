import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { MonitorStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const VALID: MonitorStatus[] = ["OPEN", "ACKNOWLEDGED", "RESOLVED"];

// PATCH /api/monitor/[id]  { status }  -> acknowledge / resolve / reopen an event.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const status = body?.status as MonitorStatus | undefined;
  if (!status || !VALID.includes(status)) {
    return NextResponse.json({ error: "status must be OPEN, ACKNOWLEDGED, or RESOLVED" }, { status: 400 });
  }
  try {
    const updated = await prisma.monitorEvent.update({
      where: { id },
      data: { status, resolvedAt: status === "RESOLVED" ? new Date() : null },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }
}
