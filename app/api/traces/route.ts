import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/traces?feedbackId=...  -> the agent's per-step trace for one feedback item,
// in pipeline order (oldest first).
export async function GET(req: NextRequest) {
  const feedbackId = req.nextUrl.searchParams.get("feedbackId");
  if (!feedbackId) {
    return NextResponse.json({ error: "feedbackId is required" }, { status: 400 });
  }
  const traces = await prisma.traceLog.findMany({
    where: { feedbackId },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ traces });
}
