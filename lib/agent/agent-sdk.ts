import { query } from "@anthropic-ai/claude-agent-sdk";
import type { StructuredOpts, StructuredResult } from "@/lib/agent/structured";

// Claude Agent SDK implementation of structuredCall — authenticates with your Claude
// subscription (Max Agent SDK credit) via the Claude Code CLI, so no metered API key is
// used. The SDK spawns the CLI as a subprocess, so this only runs LOCALLY / in batch,
// never inside a Vercel serverless function. It is imported only by scripts/triage-local.ts.
export async function structuredCallAgent<T>(opts: StructuredOpts): Promise<StructuredResult<T>> {
  const start = Date.now();
  const prompt = `${opts.system}\n\n${opts.user}`;

  let data: T | undefined;
  let failure = "";
  for await (const message of query({
    prompt,
    options: {
      // Schema-validated structured output; SDK re-prompts on mismatch.
      outputFormat: { type: "json_schema", schema: opts.schema as Record<string, unknown> },
      allowedTools: [], // pure classification — no file/bash tools needed
      maxTurns: 6, // allow a turn to answer + validation retries
    },
  })) {
    if (message.type === "result") {
      if (message.subtype === "success" && "structured_output" in message) {
        data = (message as { structured_output: T }).structured_output;
      } else {
        failure = message.subtype;
      }
    }
  }

  if (data === undefined) {
    throw new Error(`Agent SDK returned no structured output (${failure || "no result message"})`);
  }
  return { data, latencyMs: Date.now() - start, model: "claude-agent-sdk (subscription)" };
}
