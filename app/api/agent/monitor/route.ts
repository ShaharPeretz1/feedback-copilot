import { NextResponse } from "next/server";
import { runMonitorScan } from "@/lib/agent/monitor";
import { recordRuntimeError } from "@/lib/monitor";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // allow the scan's sequential agent calls time on Vercel

// POST /api/agent/monitor  -> LLM-judge + misuse screen over recent feedback.
export async function POST() {
  try {
    const result = await runMonitorScan();
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Monitor scan failed";
    await recordRuntimeError({
      title: "Monitor scan failed",
      error: err,
      step: "runMonitorScan",
    }).catch(() => {});
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
