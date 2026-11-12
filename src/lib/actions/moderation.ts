"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireMembership, requireRole } from "@/lib/auth";
import { rateLimitUser, RATE_WINDOWS } from "@/lib/rateLimit";
import { sendEmail } from "@/lib/email";
import { logAudit } from "@/lib/audit";

export type ModerationResult = { error?: string; success?: boolean };

const TARGETS = ["CHAT_MESSAGE", "HIGHLIGHT", "ANNOUNCEMENT"] as const;
type Target = (typeof TARGETS)[number];

async function findTargetAuthor(
  teamId: string,
  targetType: Target,
  targetId: string
): Promise<{ exists: boolean; authorId: string | null }> {
  if (targetType === "CHAT_MESSAGE") {
    const m = await prisma.chatMessage.findFirst({ where: { id: targetId, teamId } });
    return { exists: Boolean(m), authorId: m?.authorId ?? null };
  }
  if (targetType === "HIGHLIGHT") {
    const h = await prisma.highlight.findFirst({ where: { id: targetId, teamId } });
    return { exists: Boolean(h), authorId: h?.postedById ?? null };
  }
  const a = await prisma.announcement.findFirst({ where: { id: targetId, teamId } });
  return { exists: Boolean(a), authorId: a?.authorId ?? null };
}

export async function reportContent(
  teamId: string,
  targetTypeRaw: string,
  targetId: string,
  reasonRaw: string
): Promise<ModerationResult> {
  const { user } = await requireMembership(teamId);
  if (!(await rateLimitUser(user.id, "report", 15, RATE_WINDOWS.HOUR))) {
    return { error: "You've sent a lot of reports recently. Please try again later." };
  }

  const targetType = TARGETS.find((t) => t === targetTypeRaw);
  const reason = String(reasonRaw ?? "").trim().slice(0, 300);
  if (!targetType || !targetId || !reason) return { error: "Choose a reason." };

  const { exists, authorId } = await findTargetAuthor(teamId, targetType, targetId);
  if (!exists) return { error: "That content no longer exists." };
  if (authorId === user.id) return { error: "You can't report your own content." };

  const already = await prisma.report.findFirst({
    where: { teamId, reporterId: user.id, targetType, targetId, status: "OPEN" },
  });
  if (!already) {
    await prisma.report.create({
      data: { teamId, reporterId: user.id, targetType, targetId, targetUserId: authorId, reason },
    });

    // Also tell the app owner, since a team's coaches may not act on it.
    const supportEmail = process.env.SUPPORT_EMAIL;
    if (supportEmail) {
      await sendEmail({
        to: supportEmail,
        subject: "New SportSync content report",
        text: `A ${targetType.toLowerCase().replace("_", " ")} was reported.\nTeam id: ${teamId}\nReason: ${reason}`,
      });
    }
  }
  return { success: true };
}

export async function blockUser(userId: string): Promise<ModerationResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "You must be signed in." };
  if (userId === user.id) return { error: "You can't block yourself." };
  if (!(await rateLimitUser(user.id, "block", 30, RATE_WINDOWS.HOUR))) {
    return { error: "Too many requests. Try again later." };
  }

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { error: "User not found." };

  await prisma.block.upsert({
    where: { blockerId_blockedId: { blockerId: user.id, blockedId: userId } },
    update: {},
    create: { blockerId: user.id, blockedId: userId },
  });
  revalidatePath("/", "layout");
  return { success: true };
}

export async function unblockUser(userId: string): Promise<ModerationResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "You must be signed in." };
  await prisma.block.deleteMany({ where: { blockerId: user.id, blockedId: userId } });
  revalidatePath("/", "layout");
  return { success: true };
}

export async function resolveReport(teamId: string, reportId: string, decision: "remove" | "dismiss") {
  const { user } = await requireRole(teamId, ["ADMIN", "COACH"]);
  if (!(await rateLimitUser(user.id, "report-resolve", 60, RATE_WINDOWS.HOUR))) return;

  const report = await prisma.report.findFirst({ where: { id: reportId, teamId } });
  if (!report || report.status !== "OPEN") return;

  if (decision === "remove") {
    if (report.targetType === "CHAT_MESSAGE") {
      await prisma.chatMessage.deleteMany({ where: { id: report.targetId, teamId } });
    } else if (report.targetType === "HIGHLIGHT") {
      await prisma.highlight.deleteMany({ where: { id: report.targetId, teamId } });
    } else {
      await prisma.announcement.deleteMany({ where: { id: report.targetId, teamId } });
    }
  }

  await prisma.report.update({
    where: { id: report.id },
    data: { status: decision === "remove" ? "RESOLVED" : "DISMISSED" },
  });
  await logAudit(teamId, user.id, `report.${decision}`, `${report.targetType} ${report.targetId}`);

  revalidatePath(`/teams/${teamId}/reports`);
  revalidatePath(`/teams/${teamId}`, "layout");
}
