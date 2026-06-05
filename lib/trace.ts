// Helpers for displaying agent traces (TraceLog rows) in the UI.

/** Sum step latencies, treating missing values as 0. */
export function totalLatency(traces: { latencyMs: number | null }[]): number {
  return traces.reduce((sum, t) => sum + (t.latencyMs ?? 0), 0);
}

/** Pretty-print a stored JSON string; fall back to the raw string if it isn't JSON. */
export function prettyJson(value: string | null): string {
  if (!value) return "";
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

// Human labels for the agent step names recorded in TraceLog.step.
export const STEP_LABEL: Record<string, string> = {
  classify: "Classify",
  assignTheme: "Assign theme",
  draftReply: "Draft reply",
  judgeClassification: "Judge classification",
  screenInput: "Screen input",
};

export function stepLabel(step: string): string {
  return STEP_LABEL[step] ?? step;
}
