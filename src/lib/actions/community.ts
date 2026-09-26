"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, requireMembership } from "@/lib/auth";
import { sendPushToTeam } from "@/lib/actions/push";

export async function postChatMessage(teamId: string, formData: FormData) {
  const { user } = await requireMembership(teamId);

  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;

  await prisma.chatMessage.create({
    data: { teamId, authorId: user.id, body },
  });

  revalidatePath(`/teams/${teamId}/chat`);
}

export async function postAnnouncement(teamId: string, formData: FormData) {
  const { user } = await requireRole(teamId, ["ADMIN", "COACH"]);

  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
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

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const videoUrl = String(formData.get("videoUrl") ?? "").trim();
  const playerId = String(formData.get("playerId") ?? "").trim() || null;
  const eventId = String(formData.get("eventId") ?? "").trim() || null;

  if (!title || !videoUrl) return;

  await prisma.highlight.create({
    data: {
      teamId,
      userId: playerId,
      eventId,
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
