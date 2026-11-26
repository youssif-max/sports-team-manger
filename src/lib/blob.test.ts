import { describe, expect, it } from "vitest";
import { isOwnUpload, uploadPrefix } from "@/lib/blob";
import { toEmbedUrl } from "@/lib/video";

const store = "https://abc123.public.blob.vercel-storage.com";

describe("isOwnUpload", () => {
  it("accepts a file in the caller's own folder on our storage host", () => {
    expect(isOwnUpload(`${store}/highlights/user1/clip-xyz.mp4`, "user1")).toBe(true);
  });

  it("rejects another user's folder", () => {
    expect(isOwnUpload(`${store}/highlights/user2/clip.mp4`, "user1")).toBe(false);
    // prefix tricks: user1 must not match user10's folder
    expect(isOwnUpload(`${store}/highlights/user10/clip.mp4`, "user1")).toBe(false);
  });

  it("rejects other hosts, schemes and junk", () => {
    expect(isOwnUpload("https://evil.com/highlights/user1/clip.mp4", "user1")).toBe(false);
    expect(isOwnUpload("https://abc.public.blob.vercel-storage.com.evil.com/highlights/user1/a.mp4", "user1")).toBe(false);
    expect(isOwnUpload("http://abc.public.blob.vercel-storage.com/highlights/user1/a.mp4", "user1")).toBe(false);
    expect(isOwnUpload("javascript:alert(1)", "user1")).toBe(false);
    expect(isOwnUpload("not a url", "user1")).toBe(false);
  });

  it("builds a per-user upload prefix", () => {
    expect(uploadPrefix("u1")).toBe("highlights/u1/");
  });
});

describe("public highlight links", () => {
  it("only YouTube links can be embedded (public posts allow nothing else)", () => {
    expect(toEmbedUrl("https://youtu.be/dQw4w9WgXcQ")).not.toBeNull();
    expect(toEmbedUrl("https://example.com/video")).toBeNull();
    expect(toEmbedUrl("https://vimeo.com/123")).toBeNull();
  });
});
