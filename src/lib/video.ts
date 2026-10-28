const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

function youtubeId(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "").replace(/^m\./, "");
    let id: string | null = null;
    if (host === "youtube.com" || host === "youtube-nocookie.com") {
      if (u.pathname === "/watch") id = u.searchParams.get("v");
      else {
        const m = u.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/);
        id = m?.[1] ?? null;
      }
    } else if (host === "youtu.be") {
      id = u.pathname.slice(1).split("/")[0] ?? null;
    }
    return id && YOUTUBE_ID.test(id) ? id : null;
  } catch {
    return null;
  }
}

// Embeds via youtube-nocookie (no tracking cookies until played) and, when a
// clip window is given, only plays that slice of the longer game video.
export function toEmbedUrl(url: string, startSeconds?: number | null, endSeconds?: number | null) {
  const id = youtubeId(url);
  if (!id) return null;
  const params = new URLSearchParams({ rel: "0" });
  if (startSeconds != null && startSeconds >= 0) params.set("start", String(startSeconds));
  if (endSeconds != null && endSeconds > (startSeconds ?? 0)) params.set("end", String(endSeconds));
  return `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`;
}

// Accepts "83", "1:23" or "1:02:03" and returns seconds, or null if blank/invalid.
export function parseTimestamp(raw: string): number | null {
  const value = raw.trim();
  if (!value) return null;
  const parts = value.split(":");
  if (parts.length > 3 || parts.some((p) => !/^\d{1,5}$/.test(p))) return null;
  const nums = parts.map(Number);
  const seconds = nums.reduce((acc, n) => acc * 60 + n, 0);
  return seconds <= 86400 ? seconds : null;
}

export function formatTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}
