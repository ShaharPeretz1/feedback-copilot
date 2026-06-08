"use client";

// Client-side admin-key storage + an authed fetch wrapper for mutating requests.
// The key is kept in localStorage and sent as x-admin-key; reads don't need it.

const STORAGE_KEY = "fc_admin_key";

export function getAdminKey(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(STORAGE_KEY) ?? "";
}

export function setAdminKey(value: string) {
  window.localStorage.setItem(STORAGE_KEY, value.trim());
}

export function clearAdminKey() {
  window.localStorage.removeItem(STORAGE_KEY);
}

/** fetch() that attaches the admin key (if set) — use for POST/PATCH/DELETE calls. */
export function authedFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const key = getAdminKey();
  if (key) headers.set("x-admin-key", key);
  return fetch(url, { ...init, headers });
}
