import { describe, it, expect, vi } from "vitest";

// Mock the agent module so runEval scores against canned classifications instead of
// calling the real API (and so Prisma is never imported). The mock echoes a
// classification encoded in each item's rawText: "cat=BUG;sent=NEGATIVE".
vi.mock("@/lib/agent/triage", () => ({
  classify: vi.fn(async (rawText: string) => {
    const cat = /cat=(\w+)/.exec(rawText)?.[1] ?? "OTHER";
    const sent = /sent=(\w+)/.exec(rawText)?.[1] ?? "NEUTRAL";
    return { data: { category: cat, sentiment: sent, priority: "P2", summary: "" }, latencyMs: 5, model: "test" };
  }),
}));

import { runEval, EVAL_THRESHOLD, type GoldenItem } from "@/lib/eval";

function item(cat: string, sent: string, expCat: string, expSent: string): GoldenItem {
  return { rawText: `cat=${cat};sent=${sent}`, expected: { category: expCat, sentiment: expSent } };
}

describe("runEval", () => {
  it("scores a perfect set at 100% and not below threshold", async () => {
    const r = await runEval([
      item("BUG", "NEGATIVE", "BUG", "NEGATIVE"),
      item("PRAISE", "POSITIVE", "PRAISE", "POSITIVE"),
    ]);
    expect(r.n).toBe(2);
    expect(r.categoryAccuracy).toBe(1);
    expect(r.sentimentAccuracy).toBe(1);
    expect(r.misses).toHaveLength(0);
    expect(r.belowThreshold).toBe(false);
  });

  it("counts category and sentiment misses independently", async () => {
    const r = await runEval([
      item("BUG", "NEGATIVE", "BUG", "NEGATIVE"), // both correct
      item("USABILITY", "NEUTRAL", "BUG", "NEUTRAL"), // category wrong, sentiment right
      item("BUG", "POSITIVE", "BUG", "NEGATIVE"), // category right, sentiment wrong
    ]);
    expect(r.categoryCorrect).toBe(2);
    expect(r.sentimentCorrect).toBe(2);
    expect(r.categoryAccuracy).toBeCloseTo(2 / 3);
    expect(r.misses).toHaveLength(2); // two items had at least one miss
  });

  it("flags belowThreshold when accuracy drops under the gate", async () => {
    // 1 of 5 categories correct = 20% < 80%
    const items = [
      item("BUG", "NEUTRAL", "BUG", "NEUTRAL"),
      ...Array.from({ length: 4 }, () => item("OTHER", "NEUTRAL", "BILLING", "NEUTRAL")),
    ];
    const r = await runEval(items);
    expect(r.categoryAccuracy).toBeLessThan(EVAL_THRESHOLD);
    expect(r.belowThreshold).toBe(true);
  });

  it("handles an empty set without dividing by zero", async () => {
    const r = await runEval([]);
    expect(r.n).toBe(0);
    expect(r.categoryAccuracy).toBe(0);
    expect(r.belowThreshold).toBe(true); // 0 < threshold
  });
});
