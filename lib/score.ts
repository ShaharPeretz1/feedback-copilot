// Impact scoring: rank repeating issues by recurrence AND severity, not raw count.
//
// A theme with five P3 nits should rank below a theme with two P0 outages. We weight
// each feedback item by its priority and nudge negative-sentiment items up, then sum.
// Pure + dependency-free so it's trivially unit-testable and reusable server-side.

export const PRIORITY_WEIGHT: Record<string, number> = {
  P0: 8,
  P1: 4,
  P2: 2,
  P3: 1,
};

const NEGATIVE_MULTIPLIER = 1.25;

export type ScorableFeedback = {
  priority: string | null;
  sentiment: string | null;
};

/**
 * Sum of priority weights across a theme's feedback, with a small boost for
 * negative sentiment. Rounded to one decimal. Untriaged items (no priority)
 * contribute 0 until classified.
 */
export function impactScore(feedback: ScorableFeedback[]): number {
  const raw = feedback.reduce((sum, f) => {
    const weight = f.priority ? PRIORITY_WEIGHT[f.priority] ?? 0 : 0;
    const mult = f.sentiment === "NEGATIVE" ? NEGATIVE_MULTIPLIER : 1;
    return sum + weight * mult;
  }, 0);
  return Math.round(raw * 10) / 10;
}

/** Count occurrences of each non-null value (e.g. category or sentiment mix). */
export function tally(values: (string | null)[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const v of values) {
    if (!v) continue;
    out[v] = (out[v] ?? 0) + 1;
  }
  return out;
}
