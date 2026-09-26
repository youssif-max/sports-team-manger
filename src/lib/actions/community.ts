"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, requireMembership } from "@/lib/auth";
import { sendPushToTeam } from "@/lib/actions/push";
import { isSafeHttpUrl } from "@/lib/url";
import { isTeamPremium, FREE_HIGHLIGHT_LIMIT } from "@/lib/billing";

const MAX_CHAT_MESSAGES_PER_WINDOW = 10;
const CHAT_RATE_WINDOW_MS = 10_000;

export async function postChatMessage(teamId: string, formData: FormData) {
  const { user } = await requireMembership(teamId);

  const body = String(formData.get("body") ?? "").trim().slice(0, 2000);
  if (!body) return;

  // Lightweight anti-spam check: a DB round trip (not in-memory) so it still
  // works correctly across multiple serverless instances.
  const recentCount = await prisma.chatMessage.count({
    where: {
      teamId,
      authorId: user.id,
      createdAt: { gte: new Date(Date.now() - CHAT_RATE_WINDOW_MS) },
    },
  });
  if (recentCount >= MAX_CHAT_MESSAGES_PER_WINDOW) return;

  await prisma.chatMessage.create({
    data: { teamId, authorId: user.id, body },
  });

  revalidatePath(`/teams/${teamId}/chat`);
}

export async function postAnnouncement(teamId: string, formData: FormData) {
  const { user } = await requireRole(teamId, ["ADMIN", "COACH"]);

  const title = String(formData.get("title") ?? "").trim().slice(0, 200);
  const body = String(formData.get("body") ?? "").trim().slice(0, 5000);
  if (!title || !body) return;

  const announcement = await prisma.announcement.create({
    data: { teamId, authorId: user.id, title, body },
    include: { team: true },
  });

  revalidatePath(`/teams/${teamId}/announcements`);
  revalidatePath(`/teams/${teamId}`);

  await sendPushToTeam(
    teamId,
    {
      title: `${announcement.team.name}: ${title}`,
      body,
      url: `/teams/${teamId}/announcements`,
    },
    user.id
  );
}

export async function deleteAnnouncement(teamId: string, id: string) {
  const { user, membership } = await requireMembership(teamId);

  const isPrivileged = membership.role === "ADMIN" || membership.role === "COACH";
  await prisma.announcement.deleteMany({
    where: { id, teamId, ...(isPrivileged ? {} : { authorId: user.id }) },
  });

  revalidatePath(`/teams/${teamId}/announcements`);
}

export async function postHighlight(teamId: string, formData: FormData) {
  await requireMembership(teamId);

  const title = String(formData.get("title") ?? "").trim().slice(0, 200);
  const description = String(formData.get("description") ?? "").trim().slice(0, 2000) || null;
  const videoUrl = String(formData.get("videoUrl") ?? "").trim();
  const playerIdRaw = String(formData.get("playerId") ?? "").trim() || null;
  const eventIdRaw = String(formData.get("eventId") ?? "").trim() || null;

  if (!title || !videoUrl || !isSafeHttpUrl(videoUrl)) return;

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) return;
  if (!isTeamPremium(team)) {
    const count = await prisma.highlight.count({ where: { teamId } });
    // Defense in depth: the UI already hides the form once the free cap is
    // hit, but never trust that alone — this is a public server action.
    if (count >= FREE_HIGHLIGHT_LIMIT) return;
  }

  // The <select>/hidden field only ever offer this team's own players and
  // events, but never trust that alone — verify the tagged player/event
  // actually belongs to this team before linking them, so a highlight can't
  // be used to falsely tag an unrelated user or leak another team's event.
  const [playerMembership, event] = await Promise.all([
    playerIdRaw
      ? prisma.teamMembership.findUnique({ where: { teamId_userId: { teamId, userId: playerIdRaw } } })
      : null,
    eventIdRaw ? prisma.event.findFirst({ where: { id: eventIdRaw, teamId } }) : null,
  ]);

  await prisma.highlight.create({
    data: {
      teamId,
      userId: playerMembership ? playerIdRaw : null,
      eventId: event ? eventIdRaw : null,
      title,
      description,
      videoUrl,
    },
  });

  revalidatePath(`/teams/${teamId}/highlights`);
}

export async function deleteHighlight(teamId: string, id: string) {
  // Highlight doesn't track who uploaded it (only which player it's about,
  // which is a different thing), so there's no reliable "delete your own"
  // check possible here — keep deletion admin/coach-only instead.
  await requireRole(teamId, ["ADMIN", "COACH"]);

  await prisma.highlight.deleteMany({ where: { id, teamId } });

  revalidatePath(`/teams/${teamId}/highlights`);
}
