import type Anthropic from "@anthropic-ai/sdk";
import { getAnthropic, MODEL } from "@/lib/anthropic";

export type StructuredResult<T> = {
  data: T;
  latencyMs: number;
  model: string;
};

export type StructuredOpts = {
  system: string;
  user: string;
  toolName: string;
  toolDescription: string;
  schema: Anthropic.Tool.InputSchema;
  maxTokens?: number;
};

export type StructuredImpl = <T>(opts: StructuredOpts) => Promise<StructuredResult<T>>;

/**
 * Anthropic-API implementation: forces a single tool for reliable structured JSON.
 */
export async function structuredCallApi<T>(opts: StructuredOpts): Promise<StructuredResult<T>> {
  const start = Date.now();
  const res = await getAnthropic().messages.create({
    model: MODEL,
    max_tokens: opts.maxTokens ?? 1024,
    system: opts.system,
    tools: [{ name: opts.toolName, description: opts.toolDescription, input_schema: opts.schema }],
    tool_choice: { type: "tool", name: opts.toolName },
    messages: [{ role: "user", content: opts.user }],
  });

  const block = res.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") {
    throw new Error(`Model did not return tool "${opts.toolName}"`);
  }

  return { data: block.input as T, latencyMs: Date.now() - start, model: MODEL };
}

// Backend selection:
//  1. An explicit override (local *-local scripts swap in the Claude Agent SDK).
//  2. Else GROQ_API_KEY present  -> Groq (free-tier; powers the deployed serverless app).
//  3. Else the Anthropic API.
let override: StructuredImpl | null = null;

export function setStructuredCallImpl(fn: StructuredImpl) {
  override = fn;
}

/** All agent steps call this; it picks the active backend at call time. */
export async function structuredCall<T>(opts: StructuredOpts): Promise<StructuredResult<T>> {
  if (override) return override<T>(opts);
  if (process.env.GROQ_API_KEY) {
    const { structuredCallGroq } = await import("@/lib/agent/groq");
    return structuredCallGroq<T>(opts);
  }
  return structuredCallApi<T>(opts);
}
