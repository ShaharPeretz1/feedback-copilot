// Small pill label used for priority / sentiment / category / status across all
// dashboards. Defaults to neutral slate when no className is supplied.

export function Badge({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
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
