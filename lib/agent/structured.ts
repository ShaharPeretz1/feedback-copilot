import type Anthropic from "@anthropic-ai/sdk";
import { anthropic, MODEL } from "@/lib/anthropic";

export type StructuredResult<T> = {
  data: T;
  latencyMs: number;
  model: string;
};

/**
 * Calls Claude and forces it to return data through a single tool, giving us
 * reliable structured JSON instead of free-text we'd have to parse. Returns the
 * tool input plus latency so each step can be traced.
 */
export async function structuredCall<T>(opts: {
  system: string;
  user: string;
  toolName: string;
  toolDescription: string;
  schema: Anthropic.Tool.InputSchema;
  maxTokens?: number;
}): Promise<StructuredResult<T>> {
  const start = Date.now();
  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: opts.maxTokens ?? 1024,
    system: opts.system,
    tools: [
      {
        name: opts.toolName,
        description: opts.toolDescription,
        input_schema: opts.schema,
      },
    ],
    tool_choice: { type: "tool", name: opts.toolName },
    messages: [{ role: "user", content: opts.user }],
  });

  const block = res.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") {
    throw new Error(`Model did not return tool "${opts.toolName}"`);
  }

  return {
    data: block.input as T,
    latencyMs: Date.now() - start,
    model: MODEL,
  };
}
