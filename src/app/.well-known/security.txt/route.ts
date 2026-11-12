import { SUPPORT_EMAIL } from "@/lib/contact";

// RFC 9116: where security researchers should report vulnerabilities.
export function GET() {
  const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
  const body = [
    `Contact: mailto:${SUPPORT_EMAIL}`,
    `Expires: ${expires}`,
    "Preferred-Languages: en",
    "",
  ].join("\n");
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
