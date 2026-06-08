// Deterministic prompt-injection screen, applied synchronously at ingest as a cheap
// first line of defense (the LLM misuse scan in lib/agent/monitor.ts is the deeper,
// post-hoc check). Pure + dependency-free so it's unit-tested and runs anywhere.

const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+|the\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|messages?)/i,
  /disregard\s+(the\s+|all\s+)?(previous|prior|above)/i,
  /forget\s+(everything|all\s+(previous|prior))/i,
  /system\s+prompt/i,
  /\byou\s+are\s+now\b/i,
  /act\s+as\s+(an?\s+)?(admin|administrator|developer|dan|root)/i,
  /reveal\s+(your\s+)?(system\s+)?(prompt|instructions)/i,
  /override\s+(your\s+)?(instructions|rules|guardrails)/i,
  /\bprompt\s*injection\b/i,
];

export type InjectionResult = { injection: boolean; pattern?: string };

/** Returns injection:true (with the matched pattern) if the text looks like a prompt-injection attempt. */
export function screenForInjection(text: string): InjectionResult {
  for (const p of INJECTION_PATTERNS) {
    if (p.test(text)) return { injection: true, pattern: p.source };
  }
  return { injection: false };
}
