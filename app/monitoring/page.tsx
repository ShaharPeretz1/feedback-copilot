// System monitoring dashboard. Watches the app itself (not customer sentiment):
// runtime failures, suspect classifications, accuracy drift, and misuse.
// Full implementation lands in PRs #10–#12; this is the routed placeholder.
export default function MonitoringPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">System monitoring</h1>
        <p className="mt-1 text-sm text-slate-500">
          Watches the triage system for runtime failures, suspect classifications, accuracy
          drift, and misuse — separate from customer feedback.
        </p>
      </header>
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-400">
        Monitoring events will appear here. Coming in the next milestone.
      </div>
    </main>
  );
}
