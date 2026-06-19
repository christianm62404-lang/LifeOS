import "server-only";
import { headers } from "next/headers";

/**
 * Best-effort, in-memory fixed-window rate limiter. This guards against rapid
 * abuse (e.g. credential stuffing) within a single server instance. For
 * multi-instance/serverless deployments, back this with Redis/Upstash — see
 * SECURITY.md.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }

  if (existing.count >= limit) {
    return { ok: false, remaining: 0 };
  }

  existing.count += 1;
  return { ok: true, remaining: limit - existing.count };
}

/** Derive a best-effort client identifier from forwarded headers. */
export async function clientKey(scope: string): Promise<string> {
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown";
  return `${scope}:${ip}`;
}

// Opportunistically evict stale buckets to bound memory.
function sweep() {
  const now = Date.now();
  for (const [key, value] of buckets) {
    if (value.resetAt < now) buckets.delete(key);
  }
}
if (typeof setInterval !== "undefined") {
  const t = setInterval(sweep, 60_000);
  // Don't keep the event loop alive for this housekeeping timer.
  (t as { unref?: () => void }).unref?.();
}
