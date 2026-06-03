"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Theme = { id: string; name: string };
type FeedbackItem = {
  id: string;
  source: string;
  rawText: string;
  customerName: string | null;
  status: "NEW" | "TRIAGED";
  sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE" | null;
  category: string | null;
  priority: "P0" | "P1" | "P2" | "P3" | null;
  summary: string | null;
  suggestedReply: string | null;
  theme: Theme | null;
  createdAt: string;
};
type ThemeRollup = {
  id: string;
  name: string;
  count: number;
  negative: number;
  topPriority: string | null;
};

const PRIORITY_STYLE: Record<string, string> = {
  P0: "bg-red-100 text-red-800 ring-red-600/20",
  P1: "bg-orange-100 text-orange-800 ring-orange-600/20",
  P2: "bg-amber-100 text-amber-800 ring-amber-600/20",
  P3: "bg-slate-100 text-slate-600 ring-slate-500/20",
};
const SENTIMENT_STYLE: Record<string, string> = {
  POSITIVE: "bg-green-100 text-green-800 ring-green-600/20",
  NEUTRAL: "bg-slate-100 text-slate-600 ring-slate-500/20",
  NEGATIVE: "bg-rose-100 text-rose-800 ring-rose-600/20",
};

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
        className ?? "bg-slate-100 text-slate-600 ring-slate-500/20"
      }`}
    >
      {children}
    </span>
  );
}

export default function Home() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [themes, setThemes] = useState<ThemeRollup[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [triaging, setTriaging] = useState(false);
  const [filterPriority, setFilterPriority] = useState<string>("");
  const [filterTheme, setFilterTheme] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [f, t] = await Promise.all([
        fetch("/api/feedback").then((r) => r.json()),
        fetch("/api/themes").then((r) => r.json()),
      ]);
      setItems(f.items ?? []);
      setThemes(t.themes ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const ingest = async () => {
    setError(null);
    // Split on blank lines so a paster can drop in several items at once.
    const blocks = draft
      .split(/\n\s*\n/)
      .map((b) => b.trim())
      .filter(Boolean);
    if (blocks.length === 0) return;
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: blocks.map((rawText) => ({ rawText })) }),
    });
    if (!res.ok) {
      setError((await res.json().catch(() => ({})))?.error ?? "Ingest failed");
      return;
    }
    setDraft("");
    await load();
  };

  const runTriage = async () => {
    setError(null);
    setTriaging(true);
    try {
      const res = await fetch("/api/agent/triage", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) setError(body?.error ?? "Triage failed");
      await load();
    } finally {
      setTriaging(false);
    }
  };

  const newCount = useMemo(() => items.filter((i) => i.status === "NEW").length, [items]);
  const visible = useMemo(
    () =>
      items.filter(
        (i) =>
          (!filterPriority || i.priority === filterPriority) &&
          (!filterTheme || i.theme?.id === filterTheme)
      ),
    [items, filterPriority, filterTheme]
  );

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Feedback Copilot</h1>
        <p className="mt-1 text-sm text-slate-500">
          Agentic triage for customer feedback: classify &rarr; cluster &rarr; prioritize &rarr; draft a reply.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: ingest + themes */}
        <section className="space-y-6 lg:col-span-1">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Add feedback</h2>
            <p className="mt-1 text-xs text-slate-500">
              Paste raw feedback. Separate multiple items with a blank line.
            </p>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={6}
              placeholder={"The export button does nothing on Safari.\n\nLove the new dashboard, so much faster!"}
              className="mt-3 w-full resize-y rounded-lg border border-slate-300 p-2 text-sm text-slate-900 outline-none focus:border-slate-500"
            />
            <div className="mt-3 flex gap-2">
              <button
                onClick={ingest}
                className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
              >
                Add
              </button>
              <button
                onClick={runTriage}
                disabled={triaging || newCount === 0}
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {triaging ? "Triaging…" : `Run triage${newCount ? ` (${newCount})` : ""}`}
              </button>
            </div>
            {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Themes</h2>
            {themes.length === 0 ? (
              <p className="mt-2 text-xs text-slate-400">Run triage to cluster feedback into themes.</p>
            ) : (
              <ul className="mt-2 space-y-1">
                <li>
                  <button
                    onClick={() => setFilterTheme("")}
                    className={`w-full rounded-md px-2 py-1 text-left text-xs ${
                      !filterTheme ? "bg-slate-100 font-medium text-slate-900" : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    All themes
                  </button>
                </li>
                {themes.map((t) => (
                  <li key={t.id}>
                    <button
                      onClick={() => setFilterTheme(t.id === filterTheme ? "" : t.id)}
                      className={`flex w-full items-center justify-between rounded-md px-2 py-1 text-left text-xs ${
                        filterTheme === t.id
                          ? "bg-slate-100 font-medium text-slate-900"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <span className="truncate">{t.name}</span>
                      <span className="ml-2 flex shrink-0 items-center gap-1">
                        {t.topPriority && (
                          <Badge className={PRIORITY_STYLE[t.topPriority]}>{t.topPriority}</Badge>
                        )}
                        <span className="tabular-nums text-slate-400">{t.count}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Right: feedback list */}
        <section className="lg:col-span-2">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Priority:</span>
            {["", "P0", "P1", "P2", "P3"].map((p) => (
              <button
                key={p || "all"}
                onClick={() => setFilterPriority(p)}
                className={`rounded-md px-2 py-1 text-xs ${
                  filterPriority === p
                    ? "bg-slate-900 text-white"
                    : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                {p || "All"}
              </button>
            ))}
            <span className="ml-auto text-xs text-slate-400">
              {loading ? "Loading…" : `${visible.length} shown`}
            </span>
          </div>

          <div className="space-y-3">
            {visible.length === 0 && !loading && (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-400">
                No feedback yet. Add some on the left, then run triage.
              </div>
            )}
            {visible.map((i) => (
              <article key={i.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                  {i.priority && <Badge className={PRIORITY_STYLE[i.priority]}>{i.priority}</Badge>}
                  {i.sentiment && <Badge className={SENTIMENT_STYLE[i.sentiment]}>{i.sentiment}</Badge>}
                  {i.category && <Badge>{i.category.replace("_", " ")}</Badge>}
                  {i.theme && (
                    <Badge className="bg-indigo-50 text-indigo-700 ring-indigo-600/20">{i.theme.name}</Badge>
                  )}
                  {i.status === "NEW" && (
                    <Badge className="bg-yellow-50 text-yellow-700 ring-yellow-600/20">untriaged</Badge>
                  )}
                </div>
                <p className="mt-2 text-sm text-slate-800">{i.rawText}</p>
                {i.summary && (
                  <p className="mt-2 text-xs text-slate-500">
                    <span className="font-medium text-slate-600">Summary:</span> {i.summary}
                  </p>
                )}
                {i.suggestedReply && (
                  <details className="mt-2 rounded-lg bg-slate-50 p-2">
                    <summary className="cursor-pointer text-xs font-medium text-slate-600">
                      Suggested reply
                    </summary>
                    <p className="mt-1 whitespace-pre-wrap text-xs text-slate-700">{i.suggestedReply}</p>
                  </details>
                )}
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
