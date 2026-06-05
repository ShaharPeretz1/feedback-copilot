import { prisma } from "@/lib/db";
import { structuredCall } from "@/lib/agent/structured";
import { impactScore, severityImpact, tally } from "@/lib/score";
import type { Priority, TaskEffort, TaskSource } from "@prisma/client";

// Ops agent: turns the top feedback themes + open monitoring events into a ranked,
// deduplicated list of concrete engineering tasks. Reuses structuredCall.

type GeneratedTask = {
  title: string;
  description: string;
  source: TaskSource;
  sourceId: string;
  severity: Priority;
  effort: TaskEffort;
  area: string;
};

async function generate(context: string) {
  return structuredCall<{ tasks: GeneratedTask[] }>({
    toolName: "record_tasks",
    toolDescription:
      "Record a deduplicated, prioritized list of concrete engineering tasks to fix the underlying problems.",
    system:
      "You are an engineering lead turning customer-feedback themes and system-monitoring events " +
      "into an actionable backlog. Write specific, concrete tasks (what to investigate or build), not " +
      "restatements of the complaint. Each task must reference exactly one source by its id. Set " +
      "severity on the P0-P3 scale, effort as S/M/L, and a short area (e.g. Frontend, Backend, Billing, " +
      "Infra, Agent). Merge overlapping issues into one task; do not invent sources not listed.",
    user: context,
    schema: {
      type: "object",
      properties: {
        tasks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string", description: "Imperative, specific (e.g. 'Fix CSV export hang on Safari')." },
              description: { type: "string", description: "1-3 sentences: what to do and why." },
              source: { type: "string", enum: ["FEEDBACK_THEME", "MONITOR_EVENT"] },
              sourceId: { type: "string", description: "The id of the theme or monitor event this addresses." },
              severity: { type: "string", enum: ["P0", "P1", "P2", "P3"] },
              effort: { type: "string", enum: ["S", "M", "L"] },
              area: { type: "string" },
            },
            required: ["title", "source", "sourceId", "severity", "effort", "area"],
          },
        },
      },
      required: ["tasks"],
    },
    maxTokens: 1500,
  });
}

/**
 * Generate tasks from the top themes + open monitor events, dedup against existing
 * open tasks (one task per source), and persist. Returns how many were created.
 */
export async function generateTasks(limitThemes = 8, limitEvents = 20) {
  const themes = await prisma.theme.findMany({
    include: { feedback: { select: { priority: true, sentiment: true, category: true } } },
  });
  const ranked = themes
    .map((t) => ({
      id: t.id,
      name: t.name,
      impact: impactScore(t.feedback),
      count: t.feedback.length,
      mix: tally(t.feedback.map((f) => f.category)),
    }))
    .filter((t) => t.count > 0)
    .sort((a, b) => b.impact - a.impact)
    .slice(0, limitThemes);

  const events = await prisma.monitorEvent.findMany({
    where: { status: { in: ["OPEN", "ACKNOWLEDGED"] } },
    orderBy: { createdAt: "desc" },
    take: limitEvents,
  });

  if (ranked.length === 0 && events.length === 0) {
    return { generated: 0, skipped: 0, considered: 0 };
  }

  const themeImpact = new Map(ranked.map((t) => [t.id, t.impact]));
  const themeIds = new Set(ranked.map((t) => t.id));
  const eventIds = new Set(events.map((e) => e.id));

  const context =
    "TOP FEEDBACK THEMES (id | name | impact | count | category mix):\n" +
    (ranked.length
      ? ranked
          .map((t) => `- ${t.id} | ${t.name} | impact ${t.impact} | ${t.count} | ${JSON.stringify(t.mix)}`)
          .join("\n")
      : "(none)") +
    "\n\nOPEN MONITORING EVENTS (id | type | severity | title):\n" +
    (events.length
      ? events.map((e) => `- ${e.id} | ${e.type} | ${e.severity} | ${e.title}`).join("\n")
      : "(none)");

  const result = await generate(context);

  let generated = 0;
  let skipped = 0;
  for (const gt of result.data.tasks) {
    const themeId = gt.source === "FEEDBACK_THEME" ? gt.sourceId : null;
    const monitorEventId = gt.source === "MONITOR_EVENT" ? gt.sourceId : null;
    // Drop hallucinated source ids.
    if (themeId && !themeIds.has(themeId)) {
      skipped++;
      continue;
    }
    if (monitorEventId && !eventIds.has(monitorEventId)) {
      skipped++;
      continue;
    }
    // Dedup: one active task per source.
    const existing = await prisma.task.count({
      where: {
        status: { in: ["TODO", "IN_PROGRESS"] },
        ...(themeId ? { themeId } : { monitorEventId }),
      },
    });
    if (existing > 0) {
      skipped++;
      continue;
    }
    const impact = themeId ? themeImpact.get(themeId) ?? 0 : severityImpact(events.find((e) => e.id === monitorEventId)!.severity);
    await prisma.task.create({
      data: {
        title: gt.title,
        description: gt.description,
        source: gt.source,
        severity: gt.severity,
        effort: gt.effort,
        impactScore: impact,
        area: gt.area,
        themeId,
        monitorEventId,
      },
    });
    generated++;
  }

  return { generated, skipped, considered: result.data.tasks.length };
}
