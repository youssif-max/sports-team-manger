import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { deleteUpload } from "@/lib/blob";

// Deletes matching highlights and, for uploaded videos, the stored file too.
export async function removeHighlights(where: Prisma.HighlightWhereInput): Promise<number> {
  const rows = await prisma.highlight.findMany({
    where,
    select: { id: true, videoUrl: true, uploaded: true },
  });
  if (rows.length === 0) return 0;
  await prisma.highlight.deleteMany({ where: { id: { in: rows.map((r) => r.id) } } });
  await Promise.all(rows.filter((r) => r.uploaded).map((r) => deleteUpload(r.videoUrl)));
  return rows.length;
}

// Reports on one highlight needed to hide it automatically, and the one reason
// that hides it on the very first report because it concerns a minor's safety.
export const AUTO_HIDE_REPORTS = 3;
export const MINOR_SAFETY_REASON = "Unsafe or concerning toward a minor";
