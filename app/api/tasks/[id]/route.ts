import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { TaskStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const VALID: TaskStatus[] = ["TODO", "IN_PROGRESS", "DONE", "DISMISSED"];

// PATCH /api/tasks/[id]  { status }  -> move a task across the board.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const status = body?.status as TaskStatus | undefined;
  if (!status || !VALID.includes(status)) {
    return NextResponse.json(
      { error: "status must be TODO, IN_PROGRESS, DONE, or DISMISSED" },
      { status: 400 }
    );
  }
  try {
    const updated = await prisma.task.update({ where: { id }, data: { status } });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }
}
