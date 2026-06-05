import { describe, it, expect } from "vitest";
import { impactScore, severityImpact, tally, PRIORITY_WEIGHT } from "@/lib/score";

describe("impactScore", () => {
  it("is 0 for no feedback", () => {
    expect(impactScore([])).toBe(0);
  });

  it("ignores untriaged items (no priority contribute 0)", () => {
    expect(impactScore([{ priority: null, sentiment: null }])).toBe(0);
  });

  it("weights by priority (P0=8 > P1=4 > P2=2 > P3=1)", () => {
    expect(impactScore([{ priority: "P0", sentiment: "NEUTRAL" }])).toBe(PRIORITY_WEIGHT.P0);
    expect(impactScore([{ priority: "P3", sentiment: "NEUTRAL" }])).toBe(PRIORITY_WEIGHT.P3);
  });

  it("applies the 1.25x negative-sentiment multiplier", () => {
    // P1 = 4, negative -> 4 * 1.25 = 5
    expect(impactScore([{ priority: "P1", sentiment: "NEGATIVE" }])).toBe(5);
  });

  it("does not boost positive/neutral sentiment", () => {
    expect(impactScore([{ priority: "P1", sentiment: "POSITIVE" }])).toBe(4);
  });

  it("sums across items and rounds to one decimal", () => {
    // P0 negative (10) + P3 neutral (1) = 11
    expect(impactScore([
      { priority: "P0", sentiment: "NEGATIVE" },
      { priority: "P3", sentiment: "NEUTRAL" },
    ])).toBe(11);
  });

  it("ranks severity over volume (2x P0-negative beats 5x P3)", () => {
    const critical = impactScore(Array(2).fill({ priority: "P0", sentiment: "NEGATIVE" }));
    const nits = impactScore(Array(5).fill({ priority: "P3", sentiment: "NEUTRAL" }));
    expect(critical).toBeGreaterThan(nits); // 20 > 5
  });

  it("tolerates an unknown priority value (weight 0)", () => {
    expect(impactScore([{ priority: "P9", sentiment: "NEUTRAL" }])).toBe(0);
  });
});

describe("severityImpact", () => {
  it("maps CRITICAL > WARNING > INFO", () => {
    expect(severityImpact("CRITICAL")).toBeGreaterThan(severityImpact("WARNING"));
    expect(severityImpact("WARNING")).toBeGreaterThan(severityImpact("INFO"));
  });

  it("defaults unknown severities to 1", () => {
    expect(severityImpact("MYSTERY")).toBe(1);
  });
});

describe("tally", () => {
  it("counts non-null values and skips nulls", () => {
    expect(tally(["BUG", "BUG", "PRAISE", null])).toEqual({ BUG: 2, PRAISE: 1 });
  });

  it("returns an empty object for no values", () => {
    expect(tally([])).toEqual({});
  });
});
