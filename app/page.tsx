"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/Badge";
import {
  CATEGORIES,
  PRIORITIES,
  PRIORITY_STYLE,
  SENTIMENTS,
  SENTIMENT_STYLE,
  prettyEnum,
  type FeedbackItem,
  type ThemeRollup,
  type Trace,
} from "@/lib/types";
import { prettyJson, stepLabel, totalLatency } from "@/lib/trace";
import { authedFetch } from "@/lib/client-auth";

const ALL = "";

// Stateless fetchers — kept out of the component so effects can resolve them and
// set state inside a .then() callback (the data-fetch pattern react-hooks allows).
async function getThemes(): Promise<ThemeRollup[]> {
  const t = await fetch("/api/themes").then((r) => r.json());
  return t.themes ?? [];
}
async function getFeedback(query: string): Promise<FeedbackItem[]> {
  const f = await fetch(`/api/feedback?${query}`).then((r) => r.json());
  return f.items ?? [];
}

export default function Home() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [themes, setThemes] = useState<ThemeRollup[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [triaging, setTriaging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters (server-driven).
  const [status, setStatus] = useState(ALL);
  const [priority, setPriority] = useState(ALL);
  const [sentiment, setSentiment] = useState(ALL);
  const [category, setCategory] = useState(ALL);
  const [themeId, setThemeId] = useState(ALL);
  const [sort, setSort] = useState<"recent" | "priority">("recent");
  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");

  // Debounce the search box so we don't refetch on every keystroke.
  useEffect(() => {
    const id = setTimeout(() => setQ(searchInput.trim()), 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  const query = useMemo(() => {
    const sp = new URLSearchParams();
    if (status) sp.set("status", status);
    if (priority) sp.set("priority", priority);
    if (sentiment) sp.set("sentiment", sentiment);
    if (category) sp.set("category", category);
    if (themeId) sp.set("themeId", themeId);
    if (q) sp.set("q", q);
    sp.set("sort", sort);
    return sp.toString();
  }, [status, priority, sentiment, category, themeId, q, sort]);

  const activeTheme = useMemo(
    () => themes.find((t) => t.id === themeId) ?? null,
    [themes, themeId]
  );

  // Load themes once on mount.
  useEffect(() => {
    let cancelled = false;
    getThemes().then((t) => {
      if (!cancelled) setThemes(t);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Reload the feedback list whenever a filter changes.
  useEffect(() => {
    let cancelled = false;
    getFeedback(query).then((list) => {
      if (cancelled) return;
      setItems(list);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [query]);

  const reload = async () => {
    const [t, list] = await Promise.all([getThemes(), getFeedback(query)]);
    setThemes(t);
    setItems(list);
  };

  const ingest = async () => {
    setError(null);
    const blocks = draft
      .split(/\n\s*\n/)
      .map((b) => b.trim())
      .filter(Boolean);
    if (blocks.length === 0) return;
    const res = await authedFetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: blocks.map((rawText) => ({ rawText })) }),
    });
    if (!res.ok) {
      setError((await res.json().catch(() => ({})))?.error ?? "Ingest failed");
      return;
    }
    setDraft("");
    await reload();
  };

  const runTriage = async () => {
    setError(null);
    setTriaging(true);
    try {
      const res = await authedFetch("/api/agent/triage", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) setError(body?.error ?? "Triage failed");
      else if (body?.failed > 0)
        setError(`${body.failed} item(s) failed to triage — see Monitoring.`);
      await reload();
    } finally {
      setTriaging(false);
    }
  };

  const newCount = useMemo(() => items.filter((i) => i.status === "NEW").length, [items]);
  const hasFilters = Boolean(
    status || priority || sentiment || category || themeId || q || sort !== "recent"
  );

  const clearFilters = () => {
    setStatus(ALL);
    setPriority(ALL);
    setSentiment(ALL);
    setCategory(ALL);
    setThemeId(ALL);
    setSearchInput("");
    setQ("");
    setSort("recent");
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Feedback triage</h1>
        <p className="mt-1 text-sm text-slate-500">
          Classify &rarr; cluster &rarr; prioritize &rarr; draft a reply. Issues are ranked by
          impact (how often they recur &times; how severe they are).
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: ingest + ranked themes */}
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
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">Top issues</h2>
              <span className="text-xs text-slate-400">by impact</span>
            </div>
            {themes.length === 0 ? (
              <p className="mt-2 text-xs text-slate-400">
                Run triage to cluster feedback into ranked themes.
              </p>
            ) : (
              <ul className="mt-2 space-y-1">
                <li>
                  <button
                    onClick={() => setThemeId(ALL)}
                    className={`w-full rounded-md px-2 py-1 text-left text-xs ${
                      !themeId ? "bg-slate-100 font-medium text-slate-900" : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    All themes
                  </button>
                </li>
                {themes.map((t) => (
                  <li key={t.id}>
                    <button
                      onClick={() => setThemeId(t.id === themeId ? ALL : t.id)}
                      className={`w-full rounded-md px-2 py-1.5 text-left ${
                        themeId === t.id ? "bg-slate-100" : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-medium text-slate-800">{t.name}</span>
                        <span className="flex shrink-0 items-center gap-1">
                          {t.topPriority && (
                            <Badge className={PRIORITY_STYLE[t.topPriority]}>{t.topPriority}</Badge>
                          )}
                          <span
                            className="rounded bg-indigo-50 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-indigo-700"
                            title="Impact = recurrence × severity"
                          >
                            {t.impactScore}
                          </span>
                        </span>
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-400">
                        {t.count} item{t.count === 1 ? "" : "s"}
                        {t.negative > 0 && <span className="text-rose-500"> · {t.negative} neg</span>}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Right: filter bar + feedback list */}
        <section className="lg:col-span-2">
          <div className="mb-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search feedback…"
                className="min-w-[10rem] flex-1 rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-900 outline-none focus:border-slate-500"
              />
              <FilterSelect label="Status" value={status} onChange={setStatus} options={["NEW", "TRIAGED"]} />
              <FilterSelect label="Priority" value={priority} onChange={setPriority} options={PRIORITIES} />
              <FilterSelect label="Sentiment" value={sentiment} onChange={setSentiment} options={SENTIMENTS} />
              <FilterSelect
                label="Category"
                value={category}
                onChange={setCategory}
                options={CATEGORIES}
                render={prettyEnum}
              />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as "recent" | "priority")}
                className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-slate-500"
              >
                <option value="recent">Sort: Recent</option>
                <option value="priority">Sort: Priority</option>
              </select>
            </div>
            <div className="mt-2 flex items-center gap-2">
              {activeTheme && (
                <Badge className="bg-indigo-50 text-indigo-700 ring-indigo-600/20">
                  theme: {activeTheme.name}
                </Badge>
              )}
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="text-[11px] font-medium text-slate-500 underline-offset-2 hover:underline"
                >
                  Clear filters
                </button>
              )}
              <span className="ml-auto text-xs text-slate-400">
                {loading ? "Loading…" : `${items.length} shown`}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {items.length === 0 && !loading && (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-400">
                {hasFilters
                  ? "No feedback matches these filters."
                  : "No feedback yet. Add some on the left, then run triage."}
              </div>
            )}
            {items.map((i) => (
              <FeedbackCard key={i.id} item={i} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function FeedbackCard({ item }: { item: FeedbackItem }) {
  const [traces, setTraces] = useState<Trace[] | null>(null);
  const [open, setOpen] = useState(false);
  const [loadingTraces, setLoadingTraces] = useState(false);

  const toggleTraces = async () => {
    if (!open && traces === null) {
      setLoadingTraces(true);
      try {
        const d = await fetch(`/api/traces?feedbackId=${item.id}`).then((r) => r.json());
        setTraces(d.traces ?? []);
      } finally {
        setLoadingTraces(false);
      }
    }
    setOpen((o) => !o);
  };

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        {item.priority && <Badge className={PRIORITY_STYLE[item.priority]}>{item.priority}</Badge>}
        {item.sentiment && <Badge className={SENTIMENT_STYLE[item.sentiment]}>{item.sentiment}</Badge>}
        {item.category && <Badge>{prettyEnum(item.category)}</Badge>}
        {item.theme && (
          <Badge className="bg-indigo-50 text-indigo-700 ring-indigo-600/20">{item.theme.name}</Badge>
        )}
        {item.status === "NEW" && (
          <Badge className="bg-yellow-50 text-yellow-700 ring-yellow-600/20">untriaged</Badge>
        )}
      </div>
      <p className="mt-2 text-sm text-slate-800">{item.rawText}</p>
      {item.summary && (
        <p className="mt-2 text-xs text-slate-500">
          <span className="font-medium text-slate-600">Summary:</span> {item.summary}
        </p>
      )}
      {item.suggestedReply && (
        <details className="mt-2 rounded-lg bg-slate-50 p-2">
          <summary className="cursor-pointer text-xs font-medium text-slate-600">Suggested reply</summary>
          <p className="mt-1 whitespace-pre-wrap text-xs text-slate-700">{item.suggestedReply}</p>
        </details>
      )}
      {item.status === "TRIAGED" && (
        <div className="mt-2">
          <button
            onClick={toggleTraces}
            className="text-xs font-medium text-indigo-600 underline-offset-2 hover:underline"
          >
            {open ? "Hide agent trace" : "Agent trace"}
          </button>
          {open && <TraceTimeline traces={traces} loading={loadingTraces} />}
        </div>
      )}
    </article>
  );
}

function TraceTimeline({ traces, loading }: { traces: Trace[] | null; loading: boolean }) {
  if (loading) return <p className="mt-2 text-xs text-slate-400">Loading trace…</p>;
  if (!traces || traces.length === 0)
    return <p className="mt-2 text-xs text-slate-400">No trace recorded for this item.</p>;
  return (
    <div className="mt-2 space-y-2 border-l-2 border-slate-100 pl-3">
      <p className="text-[11px] text-slate-400">
        {traces.length} steps · {totalLatency(traces)}ms total
      </p>
      {traces.map((t, idx) => (
        <div key={t.id} className="rounded-lg bg-slate-50 p-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold tabular-nums text-slate-400">{idx + 1}</span>
            <span className="text-xs font-medium text-slate-700">{stepLabel(t.step)}</span>
            {t.model && <Badge>{t.model}</Badge>}
            {t.latencyMs != null && (
              <span className="ml-auto text-[11px] tabular-nums text-slate-400">{t.latencyMs}ms</span>
            )}
          </div>
          {(t.input || t.output) && (
            <details className="mt-1">
              <summary className="cursor-pointer text-[11px] text-slate-500">input / output</summary>
              {t.input && (
                <pre className="mt-1 overflow-x-auto whitespace-pre-wrap rounded bg-white p-1.5 text-[11px] text-slate-600 ring-1 ring-slate-100">
                  in: {prettyJson(t.input)}
                </pre>
              )}
              {t.output && (
                <pre className="mt-1 overflow-x-auto whitespace-pre-wrap rounded bg-white p-1.5 text-[11px] text-slate-600 ring-1 ring-slate-100">
                  out: {prettyJson(t.output)}
                </pre>
              )}
            </details>
          )}
        </div>
      ))}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  render,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  render?: (v: string) => string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-slate-500"
    >
      <option value="">{label}: All</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {render ? render(o) : o}
        </option>
      ))}
    </select>
  );
}
