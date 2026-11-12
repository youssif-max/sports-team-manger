import { describe, expect, it } from "vitest";
import { isSafeHttpUrl } from "@/lib/url";
import { toEmbedUrl, parseTimestamp, formatTimestamp } from "@/lib/video";
import { dataUrlByteLength, isTeamPremium, maxUploadBytesFor, FREE_UPLOAD_MAX_BYTES } from "@/lib/billing";
import { describeDevice } from "@/lib/userAgent";

describe("isSafeHttpUrl", () => {
  it("accepts http and https links", () => {
    expect(isSafeHttpUrl("https://example.com/a?b=1")).toBe(true);
    expect(isSafeHttpUrl("http://example.com")).toBe(true);
  });

  it("rejects script and data schemes", () => {
    expect(isSafeHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeHttpUrl("JaVaScRiPt:alert(1)")).toBe(false);
    expect(isSafeHttpUrl("data:text/html,<script>alert(1)</script>")).toBe(false);
    expect(isSafeHttpUrl("vbscript:msgbox(1)")).toBe(false);
  });

  it("rejects things that aren't URLs", () => {
    expect(isSafeHttpUrl("")).toBe(false);
    expect(isSafeHttpUrl("not a url")).toBe(false);
    expect(isSafeHttpUrl("//evil.com")).toBe(false);
  });
});

describe("toEmbedUrl", () => {
  it("embeds YouTube links through the no-cookie domain", () => {
    expect(toEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0"
    );
    expect(toEmbedUrl("https://youtu.be/dQw4w9WgXcQ")).toContain("/embed/dQw4w9WgXcQ");
  });

  it("applies clip start and end times", () => {
    const url = toEmbedUrl("https://youtu.be/dQw4w9WgXcQ", 65, 80)!;
    expect(url).toContain("start=65");
    expect(url).toContain("end=80");
  });

  it("ignores an end time that isn't after the start", () => {
    expect(toEmbedUrl("https://youtu.be/dQw4w9WgXcQ", 90, 30)).not.toContain("end=");
  });

  it("refuses non-YouTube links and malformed ids", () => {
    expect(toEmbedUrl("https://vimeo.com/123")).toBeNull();
    expect(toEmbedUrl("https://www.youtube.com/watch?v=<script>")).toBeNull();
    expect(toEmbedUrl("https://evil.com/?youtube.com/watch?v=dQw4w9WgXcQ")).toBeNull();
  });
});

describe("timestamps", () => {
  it("parses seconds, mm:ss and h:mm:ss", () => {
    expect(parseTimestamp("83")).toBe(83);
    expect(parseTimestamp("1:23")).toBe(83);
    expect(parseTimestamp("1:02:03")).toBe(3723);
  });

  it("returns null for blank or invalid input", () => {
    expect(parseTimestamp("")).toBeNull();
    expect(parseTimestamp("abc")).toBeNull();
    expect(parseTimestamp("1:2:3:4")).toBeNull();
    expect(parseTimestamp("-5")).toBeNull();
  });

  it("formats back to a clock string", () => {
    expect(formatTimestamp(83)).toBe("1:23");
    expect(formatTimestamp(3723)).toBe("1:02:03");
  });
});

describe("billing helpers", () => {
  it("only treats active and trialing subscriptions as premium", () => {
    expect(isTeamPremium({ subscriptionStatus: "active" })).toBe(true);
    expect(isTeamPremium({ subscriptionStatus: "trialing" })).toBe(true);
    expect(isTeamPremium({ subscriptionStatus: "canceled" })).toBe(false);
    expect(isTeamPremium({ subscriptionStatus: "past_due" })).toBe(false);
    expect(isTeamPremium({ subscriptionStatus: null })).toBe(false);
  });

  it("gives free teams the smaller upload limit", () => {
    expect(maxUploadBytesFor({ subscriptionStatus: null })).toBe(FREE_UPLOAD_MAX_BYTES);
    expect(maxUploadBytesFor({ subscriptionStatus: "active" })).toBeGreaterThan(FREE_UPLOAD_MAX_BYTES);
  });

  it("measures a data URL's decoded size", () => {
    // "hello" -> aGVsbG8= (5 bytes)
    expect(dataUrlByteLength("data:text/plain;base64,aGVsbG8=")).toBe(5);
  });
});

describe("describeDevice", () => {
  it("summarizes a user agent", () => {
    expect(
      describeDevice(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
      )
    ).toBe("Safari on iPhone");
    expect(describeDevice(null)).toBe("Unknown device");
  });
});
