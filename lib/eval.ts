import golden from "@/evals/golden.json";
import { classify } from "@/lib/agent/triage";

// Shared eval scoring, used by BOTH the CLI (scripts/eval.ts) and the drift route
// (POST /api/agent/drift) so there is one source of truth for "is the classifier
// still good?". The golden set is imported (bundled) rather than read from disk so
// it ships inside the serverless function on Vercel.

export const EVAL_THRESHOLD = 0.8;

export type GoldenItem = {
  rawText: string;
  expected: { category: string; sentiment: string };
};

export type EvalMiss = {
  rawText: string;
  gotCategory: string;
  expCategory: string;
  gotSentiment: string;
  expSentiment: string;
};

export type EvalResult = {
  n: number;
  categoryCorrect: number;
  sentimentCorrect: number;
  categoryAccuracy: number; // 0..1
  sentimentAccuracy: number; // 0..1
  avgLatencyMs: number;
  misses: EvalMiss[];
  belowThreshold: boolean;
};

export const GOLDEN = golden as GoldenItem[];

/** Run the real classify step over the golden set and score category + sentiment. */
export async function runEval(items: GoldenItem[] = GOLDEN): Promise<EvalResult> {
  let categoryCorrect = 0;
  let sentimentCorrect = 0;
  let totalLatency = 0;
  const misses: EvalMiss[] = [];

  for (const item of items) {
    const { data, latencyMs } = await classify(item.rawText);
    totalLatency += latencyMs;
    const catOk = data.category === item.expected.category;
    const sentOk = data.sentiment === item.expected.sentiment;
    if (catOk) categoryCorrect++;
    if (sentOk) sentimentCorrect++;
    if (!catOk || !sentOk) {
      misses.push({
        rawText: item.rawText,
        gotCategory: data.category,
        expCategory: item.expected.category,
        gotSentiment: data.sentiment,
        expSentiment: item.expected.sentiment,
      });
    }
  }

  const n = items.length;
  const categoryAccuracy = n ? categoryCorrect / n : 0;
  const sentimentAccuracy = n ? sentimentCorrect / n : 0;
  return {
    n,
    categoryCorrect,
    sentimentCorrect,
    categoryAccuracy,
    sentimentAccuracy,
    avgLatencyMs: n ? Math.round(totalLatency / n) : 0,
    misses,
    belowThreshold: categoryAccuracy < EVAL_THRESHOLD || sentimentAccuracy < EVAL_THRESHOLD,
  };
}
