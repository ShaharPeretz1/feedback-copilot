import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

// GET /api/tasks?status=&source=  -> tasks ranked by impact.
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const where: Prisma.TaskWhereInput = {};
  const status = sp.get("status");
  const source = sp.get("source");
  if (status) where.status = status as Prisma.TaskWhereInput["status"];
  if (source) where.source = source as Prisma.TaskWhereInput["source"];

  const tasks = await prisma.task.findMany({
    where,
    orderBy: [{ impactScore: "desc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ tasks });
}
