"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getMembership, requireRole } from "@/lib/auth";
import { isPlatformAdmin } from "@/lib/platform";
import { AUTO_HIDE_REPORTS, MINOR_SAFETY_REASON, removeHighlights } from "@/lib/highlights";
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
  const user = await getCurrentUser();
  if (!user) return { error: "You must be signed in." };
  if (!(await rateLimitUser(user.id, "report", 15, RATE_WINDOWS.HOUR))) {
    return { error: "You've sent a lot of reports recently. Please try again later." };
  }

  const targetType = TARGETS.find((t) => t === targetTypeRaw);
  const reason = String(reasonRaw ?? "").trim().slice(0, 300);
  if (!targetType || !targetId || !reason) return { error: "Choose a reason." };

  // Team members can report anything in their team. Everyone else (people
  // browsing the public Highlights feed) can only report public highlights.
  const membership = await getMembership(teamId, user.id);
  if (!membership) {
    const publicHighlight =
      targetType === "HIGHLIGHT"
        ? await prisma.highlight.findFirst({
            where: { id: targetId, teamId, visibility: "PUBLIC", hiddenAt: null },
            select: { id: true },
          })
        : null;
    if (!publicHighlight) return { error: "You don't have permission to do that." };
  }

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

    // Take a highlight out of every feed straight away when it's been reported
    // by enough different people, or once for a child-safety concern, until a
    // coach/admin or the app owner reviews it.
    if (targetType === "HIGHLIGHT") {
      const open = await prisma.report.count({
        where: { teamId, targetType, targetId, status: "OPEN" },
      });
      if (open >= AUTO_HIDE_REPORTS || reason === MINOR_SAFETY_REASON) {
        await prisma.highlight.updateMany({
          where: { id: targetId, teamId, hiddenAt: null },
          data: { hiddenAt: new Date() },
        });
        revalidatePath("/highlights");
        revalidatePath("/");
      }
    }

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
      await removeHighlights({ id: report.targetId, teamId });
    } else {
      await prisma.announcement.deleteMany({ where: { id: report.targetId, teamId } });
    }
  }

  await prisma.report.update({
    where: { id: report.id },
    data: { status: decision === "remove" ? "RESOLVED" : "DISMISSED" },
  });

  // If a reviewer dismisses the last open report on an auto-hidden highlight,
  // it comes back.
  if (decision === "dismiss" && report.targetType === "HIGHLIGHT") {
    const stillOpen = await prisma.report.count({
      where: { teamId, targetType: "HIGHLIGHT", targetId: report.targetId, status: "OPEN" },
    });
    if (stillOpen === 0) {
      await prisma.highlight.updateMany({
        where: { id: report.targetId, teamId },
        data: { hiddenAt: null },
      });
    }
  }
  await logAudit(teamId, user.id, `report.${decision}`, `${report.targetType} ${report.targetId}`);

  revalidatePath(`/teams/${teamId}/reports`);
  revalidatePath(`/teams/${teamId}`, "layout");
  revalidatePath("/highlights");
  revalidatePath("/");
}

// ---- App-owner review of reported public highlights ------------------------

export async function adminRemoveHighlight(highlightId: string) {
  const user = await getCurrentUser();
  if (!isPlatformAdmin(user)) return;

  const h = await prisma.highlight.findUnique({ where: { id: highlightId }, select: { teamId: true } });
  if (!h) return;
  await removeHighlights({ id: highlightId });
  await prisma.report.updateMany({
    where: { targetType: "HIGHLIGHT", targetId: highlightId, status: "OPEN" },
    data: { status: "RESOLVED" },
  });
  await logAudit(h.teamId, user!.id, "admin.highlight_removed", highlightId);
  revalidatePath("/admin/moderation");
  revalidatePath("/highlights");
}

export async function adminRestoreHighlight(highlightId: string) {
  const user = await getCurrentUser();
  if (!isPlatformAdmin(user)) return;

  const h = await prisma.highlight.findUnique({ where: { id: highlightId }, select: { teamId: true } });
  if (!h) return;
  await prisma.highlight.update({ where: { id: highlightId }, data: { hiddenAt: null } });
  await prisma.report.updateMany({
    where: { targetType: "HIGHLIGHT", targetId: highlightId, status: "OPEN" },
    data: { status: "DISMISSED" },
  });
  await logAudit(h.teamId, user!.id, "admin.highlight_restored", highlightId);
  revalidatePath("/admin/moderation");
  revalidatePath("/highlights");
}
