import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the Anthropic client module so importing structured.ts doesn't construct a real
// client (which would require an API key at import time).
vi.mock("@/lib/anthropic", () => ({ anthropic: {}, MODEL: "test-model" }));

import {
  setStructuredCallImpl,
  structuredCall,
  structuredCallApi,
  type StructuredImpl,
  type StructuredOpts,
  type StructuredResult,
} from "@/lib/agent/structured";

describe("structuredCall backend dispatch", () => {
  beforeEach(() => setStructuredCallImpl(structuredCallApi)); // reset to default

  it("delegates to the swapped implementation at call time", async () => {
    let calls = 0;
    const fake: StructuredImpl = async <T>(opts: StructuredOpts): Promise<StructuredResult<T>> => {
      calls++;
      return { data: { tool: opts.toolName } as unknown as T, latencyMs: 1, model: "fake" };
    };
    setStructuredCallImpl(fake);

    const r = await structuredCall<{ tool: string }>({
      system: "s",
      user: "u",
      toolName: "classify",
      toolDescription: "d",
      schema: { type: "object", properties: {} },
    });

    expect(calls).toBe(1);
    expect(r.model).toBe("fake");
    expect(r.data.tool).toBe("classify");
  });
});
