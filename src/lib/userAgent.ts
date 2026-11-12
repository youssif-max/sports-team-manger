// A short, human-friendly label for a User-Agent string ("Safari on iPhone").
export function describeDevice(ua: string | null): string {
  if (!ua) return "Unknown device";
  const os = /iPhone/.test(ua)
    ? "iPhone"
    : /iPad/.test(ua)
    ? "iPad"
    : /Android/.test(ua)
    ? "Android"
    : /Windows/.test(ua)
    ? "Windows"
    : /Mac OS X|Macintosh/.test(ua)
    ? "Mac"
    : /Linux/.test(ua)
    ? "Linux"
    : "Unknown OS";
  const browser = /SportSyncApp/.test(ua)
    ? "SportSync app"
    : /Edg\//.test(ua)
    ? "Edge"
    : /Chrome\//.test(ua)
    ? "Chrome"
    : /Firefox\//.test(ua)
    ? "Firefox"
    : /Safari\//.test(ua)
    ? "Safari"
    : "Browser";
  return `${browser} on ${os}`;
}
