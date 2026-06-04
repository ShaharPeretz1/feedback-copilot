import { NextResponse } from "next/server";
import { triagePending } from "@/lib/agent/triage";
import { recordRuntimeError } from "@/lib/monitor";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // allow the agent loop time on Vercel

// POST /api/agent/triage  -> runs the multi-step agent over all NEW feedback.
export async function POST() {
  try {
    const result = await triagePending();
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Triage failed";
    // Best-effort: log the run-level failure for the monitoring dashboard.
    await recordRuntimeError({
      title: "Triage run failed",
      error: err,
      step: "triagePending",
    }).catch(() => {});
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
