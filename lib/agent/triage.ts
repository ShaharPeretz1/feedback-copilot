import { prisma } from "@/lib/db";
import { structuredCall } from "@/lib/agent/structured";
import type { Sentiment, Category, Priority } from "@prisma/client";

// ---- Step output types --------------------------------------------------

export type Classification = {
  sentiment: Sentiment;
  category: Category;
  priority: Priority;
  summary: string;
};

export type ThemeAssignment = {
  theme: string;
  isNew: boolean;
  reasoning: string;
};

// ---- Step 1: classify ----------------------------------------------------

export async function classify(rawText: string) {
  return structuredCall<Classification>({
    toolName: "record_classification",
    toolDescription:
      "Record the sentiment, category, priority, and a one-line summary of a piece of customer feedback.",
    system:
      "You triage customer feedback for a product team. Be decisive and consistent. " +
      "Priority guide: P0 = blocking outage / data loss / security; P1 = major broken flow or churn risk; " +
      "P2 = meaningful friction or a wanted feature; P3 = minor nit or pure praise.",
    user: `Classify this customer feedback:\n\n"""${rawText}"""`,
    schema: {
      type: "object",
      properties: {
        sentiment: { type: "string", enum: ["POSITIVE", "NEUTRAL", "NEGATIVE"] },
        category: {
          type: "string",
          enum: [
            "BUG",
            "FEATURE_REQUEST",
            "USABILITY",
            "PERFORMANCE",
            "BILLING",
            "PRAISE",
            "OTHER",
          ],
        },
        priority: { type: "string", enum: ["P0", "P1", "P2", "P3"] },
        summary: {
          type: "string",
          description: "One concise sentence (max ~15 words) capturing the core issue or request.",
        },
      },
      required: ["sentiment", "category", "priority", "summary"],
    },
  });
}

// ---- Step 2: assign to a theme (cluster) ---------------------------------

export async function assignTheme(summary: string, existingThemes: string[]) {
  return structuredCall<ThemeAssignment>({
    toolName: "assign_theme",
    toolDescription:
      "Assign this feedback to the single best-matching existing theme, or propose a new short theme name if none fit.",
    system:
      "You cluster customer feedback into themes. Reuse an existing theme whenever the feedback is about the " +
      "same underlying topic, even if worded differently. Only propose a new theme when nothing fits. " +
      "Theme names are short noun phrases in Title Case (2-4 words), e.g. 'Slow Dashboard Load', 'CSV Export', 'Onboarding Confusion'.",
    user:
      `Existing themes:\n${
        existingThemes.length ? existingThemes.map((t) => `- ${t}`).join("\n") : "(none yet)"
      }\n\nFeedback summary:\n"""${summary}"""`,
    schema: {
      type: "object",
      properties: {
        theme: { type: "string", description: "The chosen existing theme name, or a new short theme name." },
        isNew: { type: "boolean", description: "True if this is a newly proposed theme not in the existing list." },
        reasoning: { type: "string", description: "Brief reason for the choice (max ~12 words)." },
      },
      required: ["theme", "isNew", "reasoning"],
    },
    maxTokens: 400,
  });
}

// ---- Step 3: draft a reply -----------------------------------------------

export async function draftReply(rawText: string, c: Classification) {
  return structuredCall<{ reply: string }>({
    toolName: "record_reply",
    toolDescription: "Record a short, empathetic suggested reply to send back to the customer.",
    system:
      "You draft replies a support/product person can send with light editing. Tone: warm, concrete, no corporate filler. " +
      "Acknowledge the specific issue, say what happens next, keep it under 4 sentences. Never invent ship dates or refunds.",
    user:
      `Customer feedback:\n"""${rawText}"""\n\n` +
      `Internal classification: ${c.sentiment}, ${c.category}, ${c.priority}. Summary: ${c.summary}`,
    schema: {
      type: "object",
      properties: {
        reply: { type: "string", description: "The suggested customer-facing reply." },
      },
      required: ["reply"],
    },
    maxTokens: 500,
  });
}

// ---- Orchestrator: run all steps for one feedback item -------------------

async function trace(
  feedbackId: string,
  step: string,
  model: string,
  latencyMs: number,
  input: unknown,
  output: unknown
) {
  await prisma.traceLog.create({
    data: {
      feedbackId,
      step,
      model,
      latencyMs,
      input: typeof input === "string" ? input : JSON.stringify(input),
      output: JSON.stringify(output),
    },
  });
}

/**
 * Runs the full multi-step triage pipeline on one feedback row and persists
 * the results + per-step traces. Theme creation is serialized by the caller
 * (process items sequentially) so clustering can reuse freshly created themes.
 */
export async function triageOne(feedbackId: string) {
  const fb = await prisma.feedback.findUniqueOrThrow({ where: { id: feedbackId } });

  // Step 1 — classify
  const cls = await classify(fb.rawText);
  await trace(feedbackId, "classify", cls.model, cls.latencyMs, fb.rawText, cls.data);

  // Step 2 — assign/create theme
  const themes = await prisma.theme.findMany({ select: { name: true } });
  const ta = await assignTheme(cls.data.summary, themes.map((t) => t.name));
  await trace(feedbackId, "assignTheme", ta.model, ta.latencyMs, cls.data.summary, ta.data);

  const theme = await prisma.theme.upsert({
    where: { name: ta.data.theme },
    update: {},
    create: { name: ta.data.theme },
  });

  // Step 3 — draft reply
  const reply = await draftReply(fb.rawText, cls.data);
  await trace(feedbackId, "draftReply", reply.model, reply.latencyMs, fb.rawText, reply.data);

  // Persist results
  const updated = await prisma.feedback.update({
    where: { id: feedbackId },
    data: {
      status: "TRIAGED",
      sentiment: cls.data.sentiment,
      category: cls.data.category,
      priority: cls.data.priority,
      summary: cls.data.summary,
      suggestedReply: reply.data.reply,
      themeId: theme.id,
      processedAt: new Date(),
    },
    include: { theme: true },
  });

  return updated;
}

/** Triage every NEW feedback item, sequentially so themes accumulate. */
export async function triagePending(limit = 50) {
  const pending = await prisma.feedback.findMany({
    where: { status: "NEW" },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: { id: true },
  });

  const results = [];
  for (const p of pending) {
    results.push(await triageOne(p.id));
  }
  return { processed: results.length, items: results };
}
