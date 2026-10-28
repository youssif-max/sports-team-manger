import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
export const RATE_WINDOWS = { SECOND, MINUTE, HOUR };

// Fixed-window counter stored in Postgres so it holds across serverless
// instances (an in-memory counter would reset on every cold start). The
// insert-or-increment is a single atomic statement. Returns true if this
// request is within the limit.
export async function rateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  const resetAt = new Date(Date.now() + windowMs);
  try {
    const rows = await prisma.$queryRaw<{ count: number }[]>`
      INSERT INTO "RateLimit" ("key", "count", "resetAt")
      VALUES (${key}, 1, ${resetAt})
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE WHEN "RateLimit"."resetAt" < now() THEN 1 ELSE "RateLimit"."count" + 1 END,
        "resetAt" = CASE WHEN "RateLimit"."resetAt" < now() THEN ${resetAt} ELSE "RateLimit"."resetAt" END
      RETURNING "count"
    `;

    // Opportunistic cleanup so the table doesn't grow forever.
    if (Math.random() < 0.01) {
      void prisma.rateLimit.deleteMany({ where: { resetAt: { lt: new Date() } } }).catch(() => undefined);
    }

    return (rows[0]?.count ?? 1) <= limit;
  } catch {
    // If the limiter itself breaks, don't take the whole app down with it.
    return true;
  }
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  // On Vercel these are set by the platform, not by the client.
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || h.get("x-real-ip") || "local";
}

export function rateLimitUser(userId: string, action: string, limit: number, windowMs: number) {
  return rateLimit(`u:${action}:${userId}`, limit, windowMs);
}

export async function rateLimitIp(action: string, limit: number, windowMs: number) {
  return rateLimit(`ip:${action}:${await clientIp()}`, limit, windowMs);
}
