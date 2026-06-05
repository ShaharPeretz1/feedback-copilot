import { NextResponse } from "next/server";
import { generateTasks } from "@/lib/agent/ops";
import { recordRuntimeError } from "@/lib/monitor";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST /api/agent/tasks  -> generate tasks from top themes + open monitor events.
export async function POST() {
  try {
    const result = await generateTasks();
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Task generation failed";
    await recordRuntimeError({ title: "Task generation failed", error: err, step: "generateTasks" }).catch(
      () => {}
    );
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
