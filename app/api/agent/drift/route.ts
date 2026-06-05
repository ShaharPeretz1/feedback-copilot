import { NextResponse } from "next/server";
import { runEval, EVAL_THRESHOLD } from "@/lib/eval";
import { recordMonitorEvent, recordRuntimeError } from "@/lib/monitor";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // the eval makes ~15 sequential classify calls

// POST /api/agent/drift  -> run the eval golden set and record an ACCURACY_DRIFT event.
export async function POST() {
  try {
    const result = await runEval();
    const pct = (x: number) => Math.round(x * 100);
    await recordMonitorEvent({
      type: "ACCURACY_DRIFT",
      severity: result.belowThreshold ? "CRITICAL" : "INFO",
      title: `Eval: category ${pct(result.categoryAccuracy)}%, sentiment ${pct(result.sentimentAccuracy)}% (n=${result.n})`,
      detail: {
        categoryAccuracy: result.categoryAccuracy,
        sentimentAccuracy: result.sentimentAccuracy,
        n: result.n,
        avgLatencyMs: result.avgLatencyMs,
        misses: result.misses.length,
        threshold: EVAL_THRESHOLD,
      },
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Drift check failed";
    await recordRuntimeError({ title: "Drift check failed", error: err, step: "runEval" }).catch(
      () => {}
    );
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
