import { prisma } from "@/lib/db";
import type { MonitorEventType, MonitorSeverity } from "@prisma/client";

// Helpers for writing system-monitoring events. Detail is JSON-stringified the same
// way TraceLog stores step I/O, so the monitoring UI can pretty-print it.

export async function recordMonitorEvent(args: {
  type: MonitorEventType;
  severity?: MonitorSeverity;
  title: string;
  detail?: unknown;
  feedbackId?: string | null;
}) {
  return prisma.monitorEvent.create({
    data: {
      type: args.type,
      severity: args.severity ?? "WARNING",
      title: args.title,
      detail:
        args.detail == null
          ? null
          : typeof args.detail === "string"
            ? args.detail
            : JSON.stringify(args.detail),
      feedbackId: args.feedbackId ?? null,
    },
  });
}

/** Record a RUNTIME_ERROR event from a thrown/rejected error. */
export async function recordRuntimeError(args: {
  title: string;
  error: unknown;
  step?: string;
  feedbackId?: string | null;
}) {
  const message = args.error instanceof Error ? args.error.message : String(args.error);
  return recordMonitorEvent({
    type: "RUNTIME_ERROR",
    severity: "CRITICAL",
    title: args.title,
    detail: { step: args.step, message },
    feedbackId: args.feedbackId ?? null,
  });
}
