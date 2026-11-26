import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getCurrentUser } from "@/lib/auth";
import { rateLimitUser, RATE_WINDOWS } from "@/lib/rateLimit";
import {
  ALLOWED_VIDEO_TYPES,
  MAX_VIDEO_BYTES,
  isUploadConfigured,
  uploadPrefix,
} from "@/lib/blob";

// Issues short-lived upload tokens so the browser can send a video straight to
// storage. Everything about *who* and *what* is decided here, before a token
// exists: signed in, rate limited, only the caller's own folder, only video
// types, only up to the size cap.
export async function POST(request: Request) {
  if (!isUploadConfigured()) {
    return NextResponse.json({ error: "Video uploads aren't set up yet." }, { status: 503 });
  }

  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  try {
    const result = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (pathname) => {
        const user = await getCurrentUser();
        if (!user) throw new Error("You must be signed in.");

        if (!(await rateLimitUser(user.id, "video-upload", 10, RATE_WINDOWS.HOUR))) {
          throw new Error("You've uploaded a lot recently. Try again in a while.");
        }

        // Must be inside the caller's own folder with a plain file name.
        const prefix = uploadPrefix(user.id);
        if (
          !pathname.startsWith(prefix) ||
          !/^[A-Za-z0-9._-]{1,100}$/.test(pathname.slice(prefix.length))
        ) {
          throw new Error("Invalid upload path.");
        }

        return {
          allowedContentTypes: ALLOWED_VIDEO_TYPES,
          maximumSizeInBytes: MAX_VIDEO_BYTES,
          addRandomSuffix: true,
        };
      },
    });
    return NextResponse.json(result);
  } catch (e) {
    // Messages above are safe to show; anything else gets a generic reply.
    const message = e instanceof Error ? e.message : "Upload failed.";
    const safe = [
      "You must be signed in.",
      "Invalid upload path.",
      "You've uploaded a lot recently. Try again in a while.",
    ].includes(message);
    return NextResponse.json({ error: safe ? message : "Upload failed." }, { status: 400 });
  }
}
