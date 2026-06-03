import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

// GET /api/feedback?status=&sentiment=&priority=&themeId=
// Lists feedback with optional filters, newest first.
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const where: Prisma.FeedbackWhereInput = {};
  const status = sp.get("status");
  const sentiment = sp.get("sentiment");
  const priority = sp.get("priority");
  const themeId = sp.get("themeId");
  if (status) where.status = status as Prisma.FeedbackWhereInput["status"];
  if (sentiment) where.sentiment = sentiment as Prisma.FeedbackWhereInput["sentiment"];
  if (priority) where.priority = priority as Prisma.FeedbackWhereInput["priority"];
  if (themeId) where.themeId = themeId;

  const items = await prisma.feedback.findMany({
    where,
    orderBy: [{ createdAt: "desc" }],
    include: { theme: { select: { id: true, name: true } } },
  });
  return NextResponse.json({ items });
}

// POST /api/feedback  { items: [{ rawText, source?, customerName? }] }  OR  { rawText, ... }
// Ingests one or many raw feedback items (status NEW, awaiting triage).
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const rows: { rawText: string; source?: string; customerName?: string }[] = Array.isArray(
    body.items
  )
    ? body.items
    : [body];

  const clean = rows
    .filter((r) => typeof r?.rawText === "string" && r.rawText.trim().length > 0)
    .map((r) => ({
      rawText: r.rawText.trim(),
      source: r.source?.trim() || "manual",
      customerName: r.customerName?.trim() || null,
    }));

  if (clean.length === 0) {
    return NextResponse.json({ error: "No valid feedback (rawText required)" }, { status: 400 });
  }

  await prisma.feedback.createMany({ data: clean });
  return NextResponse.json({ ingested: clean.length }, { status: 201 });
}
