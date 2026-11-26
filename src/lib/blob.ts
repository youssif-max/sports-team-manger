import { del } from "@vercel/blob";

// Video uploads go straight from the phone/computer to Vercel Blob storage
// (never through our server), so the only things we police are who may get an
// upload token, what type/size it allows, and that a saved URL really is one of
// the caller's own uploads.

export const MAX_VIDEO_BYTES = 60 * 1024 * 1024; // 60 MB
export const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];
export const UPLOAD_ROUTE = "/api/highlights/upload";

// Uploads only work once a Blob store is connected to the project in Vercel
// (which adds BLOB_READ_WRITE_TOKEN). Until then the UI hides the option.
export function isUploadConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export function uploadPrefix(userId: string): string {
  return `highlights/${userId}/`;
}

// True only for https://<store>.public.blob.vercel-storage.com/highlights/<userId>/...
export function isOwnUpload(url: string, userId: string): boolean {
  try {
    const u = new URL(url);
    return (
      u.protocol === "https:" &&
      u.hostname.endsWith(".public.blob.vercel-storage.com") &&
      u.pathname.startsWith(`/${uploadPrefix(userId)}`)
    );
  } catch {
    return false;
  }
}

export async function deleteUpload(url: string): Promise<void> {
  try {
    await del(url);
  } catch {
    // Storage cleanup is best-effort; never block moderation/deletion on it.
  }
}
