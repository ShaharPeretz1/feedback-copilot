import { describe, it, expect, vi } from "vitest";

type GroqResp = {
  choices: Array<{ message: { tool_calls?: Array<{ function: { name: string; arguments: string } }> } }>;
};

// Mock the Groq SDK so the test exercises our parsing without a network call or key.
const createMock = vi.fn<(args: unknown) => Promise<GroqResp>>(async () => ({
  choices: [
    {
      message: {
        tool_calls: [
          {
            function: {
              name: "record_classification",
              arguments: JSON.stringify({ category: "BUG", sentiment: "NEGATIVE" }),
            },
          },
        ],
      },
    },
  ],
}));

vi.mock("groq-sdk", () => ({
  default: class {
    chat = { completions: { create: createMock } };
  },
}));

import { structuredCallGroq } from "@/lib/agent/groq";

describe("structuredCallGroq", () => {
  it("forces the tool and parses its JSON arguments", async () => {
    const r = await structuredCallGroq<{ category: string; sentiment: string }>({
      system: "s",
      user: "u",
      toolName: "record_classification",
      toolDescription: "d",
      schema: { type: "object", properties: {} },
    });

    expect(r.data.category).toBe("BUG");
    expect(r.data.sentiment).toBe("NEGATIVE");
    expect(typeof r.latencyMs).toBe("number");

    const args = createMock.mock.calls[0]?.[0] as { tool_choice?: unknown };
    expect(args.tool_choice).toEqual({ type: "function", function: { name: "record_classification" } });
  });

  it("throws when no tool call is returned", async () => {
    createMock.mockResolvedValueOnce({ choices: [{ message: {} }] });
    await expect(
      structuredCallGroq({ system: "s", user: "u", toolName: "t", toolDescription: "d", schema: { type: "object" } })
    ).rejects.toThrow(/did not return tool/);
  });
});
