import { NextRequest, NextResponse } from "next/server";

// API access gate. Reads (GET/HEAD) stay public so the dashboards are viewable by anyone;
// mutations and agent runs require an admin token. If ADMIN_API_TOKEN is unset (e.g. local
// dev), the gate is open. Also applies a best-effort per-instance rate limit.
//
// Note: the rate-limit map is in-memory and therefore per serverless instance — enough to
// blunt naive hammering, but a production limiter would use a shared store (Vercel KV /
// Upstash). See ADR-0018.

export const config = { matcher: ["/api/:path*"] };

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 60;
const hits = new Map<string, { count: number; resetAt: number }>();

function json(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

export function middleware(req: NextRequest) {
  const method = req.method.toUpperCase();
  // Public reads.
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return NextResponse.next();
  }

  // Best-effort rate limit on mutating requests.
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  const rec = hits.get(ip);
  if (!rec || now > rec.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  } else {
    rec.count += 1;
    if (rec.count > MAX_PER_WINDOW) {
      return json(429, "Rate limit exceeded. Please slow down and try again shortly.");
    }
  }

  // Admin-token gate (only enforced when a token is configured).
  const token = process.env.ADMIN_API_TOKEN;
  if (token) {
    const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    const provided = req.headers.get("x-admin-key") ?? bearer;
    if (provided !== token) {
      return json(401, "Admin key required to make changes. Enter it via the Admin button.");
    }
  }

  return NextResponse.next();
}
