// Shared UI types + style maps, reused across the Feedback, Monitoring, and Ops
// dashboards so badge colors and the feedback shape are defined in one place.

export type Sentiment = "POSITIVE" | "NEUTRAL" | "NEGATIVE";
export type Priority = "P0" | "P1" | "P2" | "P3";
export type FeedbackStatus = "NEW" | "TRIAGED";
export type Category =
  | "BUG"
  | "FEATURE_REQUEST"
  | "USABILITY"
  | "PERFORMANCE"
  | "BILLING"
  | "PRAISE"
  | "OTHER";

export const CATEGORIES: Category[] = [
  "BUG",
  "FEATURE_REQUEST",
  "USABILITY",
  "PERFORMANCE",
  "BILLING",
  "PRAISE",
  "OTHER",
];

export const PRIORITIES: Priority[] = ["P0", "P1", "P2", "P3"];
export const SENTIMENTS: Sentiment[] = ["POSITIVE", "NEUTRAL", "NEGATIVE"];

export type Theme = { id: string; name: string };

export type FeedbackItem = {
  id: string;
  source: string;
  rawText: string;
  customerName: string | null;
  status: FeedbackStatus;
  sentiment: Sentiment | null;
  category: Category | null;
  priority: Priority | null;
  summary: string | null;
  suggestedReply: string | null;
  theme: Theme | null;
  createdAt: string;
};

// Ranked theme rollup returned by GET /api/themes.
export type ThemeRollup = {
  id: string;
  name: string;
  summary: string | null;
  count: number;
  negative: number;
  topPriority: Priority | null;
  impactScore: number;
  sentimentMix: Record<string, number>;
  categoryMix: Record<string, number>;
};

export const PRIORITY_STYLE: Record<string, string> = {
  P0: "bg-red-100 text-red-800 ring-red-600/20",
  P1: "bg-orange-100 text-orange-800 ring-orange-600/20",
  P2: "bg-amber-100 text-amber-800 ring-amber-600/20",
  P3: "bg-slate-100 text-slate-600 ring-slate-500/20",
};

export const SENTIMENT_STYLE: Record<string, string> = {
  POSITIVE: "bg-green-100 text-green-800 ring-green-600/20",
  NEUTRAL: "bg-slate-100 text-slate-600 ring-slate-500/20",
  NEGATIVE: "bg-rose-100 text-rose-800 ring-rose-600/20",
};

export function prettyEnum(value: string): string {
  return value.replace(/_/g, " ");
}

// ---- Monitoring -----------------------------------------------------------

export type MonitorEventType =
  | "RUNTIME_ERROR"
  | "SUSPECT_CLASSIFICATION"
  | "ACCURACY_DRIFT"
  | "MISUSE";
export type MonitorSeverity = "INFO" | "WARNING" | "CRITICAL";
export type MonitorStatus = "OPEN" | "ACKNOWLEDGED" | "RESOLVED";

export type MonitorEvent = {
  id: string;
  type: MonitorEventType;
  severity: MonitorSeverity;
  status: MonitorStatus;
  title: string;
  detail: string | null;
  feedbackId: string | null;
  createdAt: string;
  resolvedAt: string | null;
};

export const MONITOR_TYPE_LABEL: Record<MonitorEventType, string> = {
  RUNTIME_ERROR: "Runtime error",
  SUSPECT_CLASSIFICATION: "Suspect classification",
  ACCURACY_DRIFT: "Accuracy drift",
  MISUSE: "Misuse / bad input",
};

export const SEVERITY_STYLE: Record<string, string> = {
  CRITICAL: "bg-red-100 text-red-800 ring-red-600/20",
  WARNING: "bg-amber-100 text-amber-800 ring-amber-600/20",
  INFO: "bg-slate-100 text-slate-600 ring-slate-500/20",
};

export const MONITOR_STATUS_STYLE: Record<string, string> = {
  OPEN: "bg-rose-50 text-rose-700 ring-rose-600/20",
  ACKNOWLEDGED: "bg-amber-50 text-amber-700 ring-amber-600/20",
  RESOLVED: "bg-green-50 text-green-700 ring-green-600/20",
};
