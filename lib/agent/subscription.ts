import { setStructuredCallImpl } from "@/lib/agent/structured";
import { structuredCallAgent } from "@/lib/agent/agent-sdk";

/**
 * Route every structuredCall through the Claude subscription (Agent SDK) instead of the
 * metered API. Local/batch only — the SDK spawns the Claude CLI, so this is imported only
 * by the *-local scripts, never by a route (keeps the Agent SDK out of the deployed bundle).
 */
export function applySubscriptionBackend() {
  if (process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY is set — it overrides subscription auth and bills the API. Unset it and retry."
    );
  }
  setStructuredCallImpl(structuredCallAgent);
}
