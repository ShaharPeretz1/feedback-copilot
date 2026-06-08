"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { clearAdminKey, getAdminKey, setAdminKey } from "@/lib/client-auth";

const LINKS = [
  { href: "/", label: "Feedback" },
  { href: "/monitoring", label: "Monitoring" },
  { href: "/ops", label: "Ops" },
];

export function Nav() {
  const pathname = usePathname();
  const [hasKey, setHasKey] = useState(false);

  useEffect(() => {
    // One-time sync from localStorage after mount (avoids SSR/hydration mismatch).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasKey(Boolean(getAdminKey()));
  }, []);

  const onAdminClick = () => {
    if (getAdminKey()) {
      clearAdminKey();
      setHasKey(false);
      return;
    }
    const value = window.prompt("Enter the admin key to make changes (view is public):");
    if (value && value.trim()) {
      setAdminKey(value);
      setHasKey(true);
    }
  };

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
        <button
          onClick={onAdminClick}
          title={hasKey ? "Admin key set — click to sign out" : "Set admin key to make changes"}
          className={`ml-auto rounded-md px-2 py-1 text-xs font-medium ring-1 ${
            hasKey
              ? "bg-green-50 text-green-700 ring-green-600/20"
              : "bg-white text-slate-500 ring-slate-200 hover:bg-slate-50"
          }`}
        >
          {hasKey ? "🔓 Admin" : "🔒 Admin"}
        </button>
      </div>
    </nav>
  );
}
