import Groq from "groq-sdk";
import type { StructuredOpts, StructuredResult } from "@/lib/agent/structured";

// Groq backend for structuredCall — a free-tier, OpenAI-compatible provider so the DEPLOYED
// serverless app can run the agents for free (the Claude subscription path is local-only).
// Uses forced function-calling for reliable structured JSON, mirroring the Anthropic path.
// Lazy client so importing this module doesn't require GROQ_API_KEY until first use.
let client: Groq | null = null;
function groq(): Groq {
  return (client ??= new Groq());
}

const MODEL = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";

export async function structuredCallGroq<T>(opts: StructuredOpts): Promise<StructuredResult<T>> {
  const start = Date.now();
  const res = await groq().chat.completions.create({
    model: MODEL,
    max_tokens: opts.maxTokens ?? 1024,
    messages: [
      { role: "system", content: opts.system },
      { role: "user", content: opts.user },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: opts.toolName,
          description: opts.toolDescription,
          parameters: opts.schema as Record<string, unknown>,
        },
      },
    ],
    tool_choice: { type: "function", function: { name: opts.toolName } },
  });

  const call = res.choices[0]?.message?.tool_calls?.[0];
  if (!call?.function?.arguments) {
    throw new Error(`Groq did not return tool "${opts.toolName}"`);
  }
  return {
    data: JSON.parse(call.function.arguments) as T,
    latencyMs: Date.now() - start,
    model: MODEL,
  };
}
