import { prisma } from "@/lib/prisma";

// Never let a logging failure break the action being logged.
export async function logAudit(teamId: string, actorId: string | null, action: string, detail?: string) {
  try {
    await prisma.auditLog.create({
      data: { teamId, actorId, action, detail: detail?.slice(0, 500) ?? null },
    });
  } catch {
    // ignore
  }
}
