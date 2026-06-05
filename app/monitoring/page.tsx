"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/Badge";
import {
  MONITOR_STATUS_STYLE,
  MONITOR_TYPE_LABEL,
  SEVERITY_STYLE,
  prettyEnum,
  type MonitorEvent,
  type MonitorEventType,
  type MonitorStatus,
} from "@/lib/types";

const TYPES: MonitorEventType[] = [
  "RUNTIME_ERROR",
  "SUSPECT_CLASSIFICATION",
  "ACCURACY_DRIFT",
  "MISUSE",
];

async function getEvents(query: string): Promise<MonitorEvent[]> {
  const d = await fetch(`/api/monitor?${query}`).then((r) => r.json());
  return d.events ?? [];
}

type DriftPoint = { at: string; category: number; sentiment: number };

async function getDriftHistory(): Promise<DriftPoint[]> {
  const d = await fetch("/api/monitor?type=ACCURACY_DRIFT").then((r) => r.json());
  const events: MonitorEvent[] = d.events ?? [];
  // API returns newest-first; reverse to oldest-first for the sparkline.
  return events
    .map((e) => {
      try {
        const j = JSON.parse(e.detail ?? "{}");
        return { at: e.createdAt, category: j.categoryAccuracy ?? 0, sentiment: j.sentimentAccuracy ?? 0 };
      } catch {
        return null;
      }
    })
    .filter((p): p is DriftPoint => p !== null)
    .reverse();
}

function formatDetail(detail: string | null): string | null {
  if (!detail) return null;
  try {
    const obj = JSON.parse(detail);
    if (obj && typeof obj === "object" && "message" in obj) {
      return [obj.step ? `[${obj.step}] ` : "", obj.message].join("");
    }
    return JSON.stringify(obj, null, 2);
  } catch {
    return detail;
  }
}

export default function MonitoringPage() {
  const [events, setEvents] = useState<MonitorEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [scanning, setScanning] = useState(false);
  const [drifting, setDrifting] = useState(false);
  const [drift, setDrift] = useState<DriftPoint[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  const query = useMemo(() => {
    const sp = new URLSearchParams();
    if (typeFilter) sp.set("type", typeFilter);
    if (statusFilter) sp.set("status", statusFilter);
    return sp.toString();
  }, [typeFilter, statusFilter]);

  useEffect(() => {
    let cancelled = false;
    getEvents(query).then((list) => {
      if (cancelled) return;
      setEvents(list);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [query]);

  // Drift history is independent of the events filter.
  useEffect(() => {
    let cancelled = false;
    getDriftHistory().then((d) => {
      if (!cancelled) setDrift(d);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const reload = async () => setEvents(await getEvents(query));

  const runDrift = async () => {
    setDrifting(true);
    setNotice(null);
    try {
      const res = await fetch("/api/agent/drift", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) setNotice(body?.error ?? "Drift check failed");
      else
        setNotice(
          `Drift check: category ${Math.round(body.categoryAccuracy * 100)}%, sentiment ${Math.round(
            body.sentimentAccuracy * 100
          )}% over ${body.n} golden items.`
        );
      setDrift(await getDriftHistory());
      await reload();
    } finally {
      setDrifting(false);
    }
  };

  const runScan = async () => {
    setScanning(true);
    setNotice(null);
    try {
      const res = await fetch("/api/agent/monitor", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) setNotice(body?.error ?? "Monitor scan failed");
      else
        setNotice(
          `Scanned ${body.checked} item(s): ${body.suspect} suspect classification(s), ${body.misuse} misuse flag(s).`
        );
      await reload();
    } finally {
      setScanning(false);
    }
  };

  const setStatus = async (id: string, status: MonitorStatus) => {
    await fetch(`/api/monitor/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await reload();
  };

  // Open-by-severity summary across the *unfiltered* set would need a second fetch;
  // here we summarize what's currently shown.
  const openCount = events.filter((e) => e.status === "OPEN").length;
  const critical = events.filter((e) => e.severity === "CRITICAL" && e.status !== "RESOLVED").length;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">System monitoring</h1>
          <p className="mt-1 text-sm text-slate-500">
            Watches the triage system itself — runtime failures, suspect classifications,
            accuracy drift, and misuse — separate from customer feedback.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={runDrift}
            disabled={drifting}
            className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {drifting ? "Checking…" : "Run drift check"}
          </button>
          <button
            onClick={runScan}
            disabled={scanning}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {scanning ? "Scanning…" : "Run monitor scan"}
          </button>
        </div>
      </header>
      {notice && (
        <p className="mb-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 ring-1 ring-slate-200">
          {notice}
        </p>
      )}

      {drift.length > 0 && <DriftPanel points={drift} />}

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Shown" value={events.length} />
        <Stat label="Open" value={openCount} tone={openCount ? "text-rose-600" : undefined} />
        <Stat label="Critical (unresolved)" value={critical} tone={critical ? "text-red-600" : undefined} />
        <Stat label="Resolved" value={events.filter((e) => e.status === "RESOLVED").length} />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-slate-500"
        >
          <option value="">Type: All</option>
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {MONITOR_TYPE_LABEL[t]}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-slate-500"
        >
          <option value="">Status: All</option>
          {["OPEN", "ACKNOWLEDGED", "RESOLVED"].map((s) => (
            <option key={s} value={s}>
              {prettyEnum(s)}
            </option>
          ))}
        </select>
        <span className="ml-auto text-xs text-slate-400">{loading ? "Loading…" : `${events.length} events`}</span>
      </div>

      <div className="space-y-3">
        {events.length === 0 && !loading && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-400">
            No monitoring events. Runtime errors are captured automatically; classification,
            misuse, and drift checks arrive in the next milestones.
          </div>
        )}
        {events.map((e) => {
          const detail = formatDetail(e.detail);
          return (
            <article key={e.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={SEVERITY_STYLE[e.severity]}>{e.severity}</Badge>
                <Badge>{MONITOR_TYPE_LABEL[e.type]}</Badge>
                <Badge className={MONITOR_STATUS_STYLE[e.status]}>{prettyEnum(e.status)}</Badge>
                <span className="ml-auto text-[11px] text-slate-400">
                  {new Date(e.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="mt-2 text-sm font-medium text-slate-800">{e.title}</p>
              {detail && (
                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-2 text-xs text-slate-600">
                  {detail}
                </pre>
              )}
              <div className="mt-3 flex gap-2">
                {e.status === "OPEN" && (
                  <ActionButton onClick={() => setStatus(e.id, "ACKNOWLEDGED")}>Acknowledge</ActionButton>
                )}
                {e.status !== "RESOLVED" && (
                  <ActionButton onClick={() => setStatus(e.id, "RESOLVED")} primary>
                    Resolve
                  </ActionButton>
                )}
                {e.status === "RESOLVED" && (
                  <ActionButton onClick={() => setStatus(e.id, "OPEN")}>Reopen</ActionButton>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </main>
  );
}

function DriftPanel({ points }: { points: DriftPoint[] }) {
  const latest = points[points.length - 1];
  return (
    <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Classifier accuracy</h2>
        <span className="text-[11px] text-slate-400">{points.length} check(s)</span>
      </div>
      <div className="mt-3 flex items-end gap-6">
        <div className="flex gap-6">
          <Metric label="Category" value={latest.category} />
          <Metric label="Sentiment" value={latest.sentiment} />
        </div>
        <div className="ml-auto flex items-end gap-4">
          <Sparkline values={points.map((p) => p.category)} label="cat" />
          <Sparkline values={points.map((p) => p.sentiment)} label="sent" />
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100);
  const tone = value < 0.8 ? "text-red-600" : "text-slate-900";
  return (
    <div>
      <div className={`text-2xl font-bold tabular-nums ${tone}`}>{pct}%</div>
      <div className="text-[11px] text-slate-500">{label}</div>
    </div>
  );
}

function Sparkline({ values, label }: { values: number[]; label: string }) {
  const w = 80;
  const h = 24;
  // Accuracy is 0..1; map directly to the box height.
  const pts =
    values.length === 1
      ? `0,${h - values[0] * h} ${w},${h - values[0] * h}`
      : values
          .map((v, i) => `${(i / (values.length - 1)) * w},${h - v * h}`)
          .join(" ");
  const last = values[values.length - 1];
  const stroke = last < 0.8 ? "#dc2626" : "#4f46e5";
  return (
    <div className="text-center">
      <svg width={w} height={h} className="overflow-visible">
        <polyline points={pts} fill="none" stroke={stroke} strokeWidth="1.5" />
      </svg>
      <div className="text-[10px] text-slate-400">{label}</div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className={`text-xl font-bold tabular-nums ${tone ?? "text-slate-900"}`}>{value}</div>
      <div className="text-[11px] text-slate-500">{label}</div>
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  primary,
}: {
  children: React.ReactNode;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-2.5 py-1 text-xs font-medium ${
        primary
          ? "bg-slate-900 text-white hover:bg-slate-700"
          : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}
