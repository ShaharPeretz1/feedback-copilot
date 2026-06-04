// Ops dashboard. Aggregates feedback themes + monitoring findings into a ranked,
// estimable task list of what to fix, with an exec health summary and GitHub export.
// Full implementation lands in PRs #13–#14; this is the routed placeholder.
export default function OpsPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Ops</h1>
        <p className="mt-1 text-sm text-slate-500">
          Turns the top issues and monitoring findings into a prioritized list of tasks to
          fix, with a health summary and one-click export to GitHub Issues.
        </p>
      </header>
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-400">
        The task board and health summary will appear here. Coming in a later milestone.
      </div>
    </main>
  );
}
