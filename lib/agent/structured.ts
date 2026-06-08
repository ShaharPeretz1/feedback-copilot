import type Anthropic from "@anthropic-ai/sdk";
import { anthropic, MODEL } from "@/lib/anthropic";

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
 * Default implementation: calls the Anthropic API and forces a single tool so we get
 * reliable structured JSON. Used on Vercel / whenever ANTHROPIC_API_KEY is set.
 */
export async function structuredCallApi<T>(opts: StructuredOpts): Promise<StructuredResult<T>> {
  const start = Date.now();
  const res = await anthropic.messages.create({
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

// Swappable backend. Defaults to the API implementation; a local batch run can swap in
// the Claude Agent SDK implementation (subscription auth) via setStructuredCallImpl.
// The Agent SDK is never imported here, so it's never bundled into the deployed app.
let impl: StructuredImpl = structuredCallApi;

export function setStructuredCallImpl(fn: StructuredImpl) {
  impl = fn;
}

/** All agent steps call this; it delegates to the active backend at call time. */
export function structuredCall<T>(opts: StructuredOpts): Promise<StructuredResult<T>> {
  return impl<T>(opts);
}
