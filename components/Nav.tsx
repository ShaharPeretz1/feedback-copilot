"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Feedback" },
  { href: "/monitoring", label: "Monitoring" },
  { href: "/ops", label: "Ops" },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <nav className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-1 px-4">
        <span className="mr-3 py-3 text-sm font-bold tracking-tight text-slate-900">
          Feedback Copilot
        </span>
        {LINKS.map((l) => {
          const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`-mb-px border-b-2 px-3 py-3 text-sm font-medium ${
                active
                  ? "border-indigo-600 text-indigo-700"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
