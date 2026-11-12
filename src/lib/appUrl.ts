import { headers } from "next/headers";

// Prefer Vercel's own production-domain env var over the client-supplied Host
// header: these URLs end up in emails and payment redirects, where a spoofed
// Host would be dangerous.
export async function appOrigin(): Promise<string> {
  const prodUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (prodUrl) return `https://${prodUrl}`;

  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
