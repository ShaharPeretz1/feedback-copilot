import { NextRequest, NextResponse } from "next/server";
import { triagePending } from "@/lib/agent/triage";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // allow the agent loop time on Vercel

// POST /api/agent/triage  -> runs the multi-step agent over all NEW feedback.
export async function POST(_req: NextRequest) {
  try {
    const result = await triagePending();
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Triage failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
