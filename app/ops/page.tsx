"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/Badge";
import {
  EFFORT_STYLE,
  PRIORITY_STYLE,
  TASK_STATUS_STYLE,
  prettyEnum,
  type OpsSummary,
  type Task,
  type TaskStatus,
} from "@/lib/types";

const TASK_STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS", "DONE", "DISMISSED"];

async function getTasks(query: string): Promise<Task[]> {
  const d = await fetch(`/api/tasks?${query}`).then((r) => r.json());
  return d.tasks ?? [];
}
async function getSummary(): Promise<OpsSummary | null> {
  return fetch("/api/ops/summary")
    .then((r) => r.json())
    .catch(() => null);
}

export default function OpsPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [summary, setSummary] = useState<OpsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");

  const query = useMemo(() => {
    const sp = new URLSearchParams();
    if (statusFilter) sp.set("status", statusFilter);
    if (sourceFilter) sp.set("source", sourceFilter);
    return sp.toString();
  }, [statusFilter, sourceFilter]);

  useEffect(() => {
    let cancelled = false;
    getTasks(query).then((t) => {
      if (cancelled) return;
      setTasks(t);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    getSummary().then((s) => {
      if (!cancelled) setSummary(s);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const refresh = async () => {
    const [t, s] = await Promise.all([getTasks(query), getSummary()]);
    setTasks(t);
    setSummary(s);
  };

  const generate = async () => {
    setGenerating(true);
    setNotice(null);
    try {
      const res = await fetch("/api/agent/tasks", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) setNotice(body?.error ?? "Task generation failed");
      else setNotice(`Generated ${body.generated} task(s) (${body.skipped} skipped as duplicates/invalid).`);
      await refresh();
    } finally {
      setGenerating(false);
    }
  };

  const setStatus = async (id: string, status: TaskStatus) => {
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await refresh();
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Ops</h1>
          <p className="mt-1 text-sm text-slate-500">
            Top issues and monitoring findings turned into a ranked, estimable backlog of what
            to fix.
          </p>
        </div>
        <button
          onClick={generate}
          disabled={generating}
          className="shrink-0 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {generating ? "Generating…" : "Generate tasks"}
        </button>
      </header>
      {notice && (
        <p className="mb-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 ring-1 ring-slate-200">
          {notice}
        </p>
      )}

      {summary && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="On fire (P0 / critical)" value={summary.onFire} tone={summary.onFire ? "text-red-600" : undefined} />
          <Stat label="Open tasks" value={summary.tasks.open} />
          <Stat label="In progress" value={summary.tasks.inProgress} />
          <Stat
            label="Classifier accuracy"
            value={summary.latestDrift ? Math.round(summary.latestDrift.categoryAccuracy * 100) : 0}
            suffix={summary.latestDrift ? "%" : ""}
            empty={!summary.latestDrift}
          />
        </div>
      )}

      {summary && summary.topThemes.length > 0 && (
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Top issues feeding the backlog</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {summary.topThemes.map((t) => (
              <Badge key={t.id} className="bg-indigo-50 text-indigo-700 ring-indigo-600/20">
                {t.name} · {t.impactScore}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-slate-500"
        >
          <option value="">Status: All</option>
          {TASK_STATUSES.map((s) => (
            <option key={s} value={s}>
              {prettyEnum(s)}
            </option>
          ))}
        </select>
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-slate-500"
        >
          <option value="">Source: All</option>
          <option value="FEEDBACK_THEME">Feedback theme</option>
          <option value="MONITOR_EVENT">Monitor event</option>
        </select>
        <span className="ml-auto text-xs text-slate-400">{loading ? "Loading…" : `${tasks.length} tasks`}</span>
      </div>

      <div className="space-y-3">
        {tasks.length === 0 && !loading && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-400">
            No tasks yet. Click <span className="font-medium">Generate tasks</span> to turn the top
            issues and open monitoring events into a backlog.
          </div>
        )}
        {tasks.map((t) => (
          <article key={t.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={PRIORITY_STYLE[t.severity]}>{t.severity}</Badge>
              <Badge className={EFFORT_STYLE[t.effort]}>{t.effort}</Badge>
              <Badge className={TASK_STATUS_STYLE[t.status]}>{prettyEnum(t.status)}</Badge>
              {t.area && <Badge>{t.area}</Badge>}
              <span
                className="rounded bg-indigo-50 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-indigo-700"
                title="Impact"
              >
                {t.impactScore}
              </span>
              <span className="ml-auto text-[11px] text-slate-400">
                {t.source === "FEEDBACK_THEME" ? "from feedback" : "from monitoring"}
              </span>
            </div>
            <p className="mt-2 text-sm font-medium text-slate-800">{t.title}</p>
            {t.description && <p className="mt-1 text-xs text-slate-500">{t.description}</p>}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <select
                value={t.status}
                onChange={(e) => setStatus(t.id, e.target.value as TaskStatus)}
                className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-slate-500"
              >
                {TASK_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {prettyEnum(s)}
                  </option>
                ))}
              </select>
              {t.externalUrl && (
                <a
                  href={t.externalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] font-medium text-indigo-600 underline-offset-2 hover:underline"
                >
                  View issue ↗
                </a>
              )}
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}

function Stat({
  label,
  value,
  tone,
  suffix,
  empty,
}: {
  label: string;
  value: number;
  tone?: string;
  suffix?: string;
  empty?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className={`text-xl font-bold tabular-nums ${tone ?? "text-slate-900"}`}>
        {empty ? "—" : `${value}${suffix ?? ""}`}
      </div>
      <div className="text-[11px] text-slate-500">{label}</div>
    </div>
  );
}
