import Anthropic from "@anthropic-ai/sdk";

// Lazy singleton: the client is only constructed on first use, so importing this module
// (and thus structuredCall) does NOT require ANTHROPIC_API_KEY at load time — important
// when the app runs on a different provider (e.g. Groq) and no Anthropic key is set.
let client: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  return (client ??= new Anthropic());
}

// Cheap, fast model for high-volume classification/drafting. Override via env.
export const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-3-5-haiku-latest";
