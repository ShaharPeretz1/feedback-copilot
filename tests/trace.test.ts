import { describe, it, expect } from "vitest";
import { totalLatency, prettyJson, stepLabel } from "@/lib/trace";

describe("totalLatency", () => {
  it("sums latencies", () => {
    expect(totalLatency([{ latencyMs: 200 }, { latencyMs: 150 }, { latencyMs: 320 }])).toBe(670);
  });
  it("treats null latencies as 0", () => {
    expect(totalLatency([{ latencyMs: null }, { latencyMs: 100 }])).toBe(100);
  });
  it("is 0 for no traces", () => {
    expect(totalLatency([])).toBe(0);
  });
});

describe("prettyJson", () => {
  it("pretty-prints valid JSON", () => {
    expect(prettyJson('{"a":1}')).toBe('{\n  "a": 1\n}');
  });
  it("returns the raw string when not JSON", () => {
    expect(prettyJson("just some raw text")).toBe("just some raw text");
  });
  it("returns empty string for null", () => {
    expect(prettyJson(null)).toBe("");
  });
});

describe("stepLabel", () => {
  it("maps known agent steps to human labels", () => {
    expect(stepLabel("classify")).toBe("Classify");
    expect(stepLabel("assignTheme")).toBe("Assign theme");
    expect(stepLabel("draftReply")).toBe("Draft reply");
  });
  it("falls back to the raw step name", () => {
    expect(stepLabel("somethingNew")).toBe("somethingNew");
  });
});
