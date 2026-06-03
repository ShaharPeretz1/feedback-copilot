import Anthropic from "@anthropic-ai/sdk";

// Anthropic client. Reads ANTHROPIC_API_KEY (and optional ANTHROPIC_BASE_URL)
// from the environment automatically.
export const anthropic = new Anthropic();

// Cheap, fast model for high-volume classification/drafting. Override via env.
export const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-3-5-haiku-latest";
