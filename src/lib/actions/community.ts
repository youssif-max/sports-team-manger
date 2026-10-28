"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, requireMembership } from "@/lib/auth";
import { sendPushToTeam } from "@/lib/push";
import { isSafeHttpUrl } from "@/lib/url";
import { parseTimestamp } from "@/lib/video";
import { isTeamPremium, FREE_HIGHLIGHT_LIMIT } from "@/lib/billing";
import { rateLimitUser, RATE_WINDOWS } from "@/lib/rateLimit";

export type HighlightFormState = { error?: string; success?: boolean } | undefined;

export async function postChatMessage(teamId: string, formData: FormData) {
  const { user } = await requireMembership(teamId);

  const body = String(formData.get("body") ?? "").trim().slice(0, 2000);
  if (!body) return;

  if (!(await rateLimitUser(user.id, `chat:${teamId}`, 10, 10 * RATE_WINDOWS.SECOND))) return;

  await prisma.chatMessage.create({
    data: { teamId, authorId: user.id, body },
  });

  revalidatePath(`/teams/${teamId}/chat`);
}

export async function postAnnouncement(teamId: string, formData: FormData) {
  const { user } = await requireRole(teamId, ["ADMIN", "COACH"]);
  // Every announcement pushes a notification to the whole team.
  if (!(await rateLimitUser(user.id, "announcement", 10, RATE_WINDOWS.HOUR))) return;

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
  if (!(await rateLimitUser(user.id, "announcement-delete", 60, RATE_WINDOWS.HOUR))) return;

  const isPrivileged = membership.role === "ADMIN" || membership.role === "COACH";
  await prisma.announcement.deleteMany({
    where: { id, teamId, ...(isPrivileged ? {} : { authorId: user.id }) },
  });

  revalidatePath(`/teams/${teamId}/announcements`);
}

async function createHighlight(teamId: string, formData: FormData): Promise<HighlightFormState> {
  const { user, membership } = await requireMembership(teamId);
  const isPrivileged = membership.role === "ADMIN" || membership.role === "COACH";

  if (!(await rateLimitUser(user.id, "highlight", 20, RATE_WINDOWS.HOUR))) {
    return { error: "You're posting too fast. Try again in a little while." };
  }

  const title = String(formData.get("title") ?? "").trim().slice(0, 200);
  const description = String(formData.get("description") ?? "").trim().slice(0, 2000) || null;
  const videoUrl = String(formData.get("videoUrl") ?? "").trim();
  const playerIdRaw = String(formData.get("playerId") ?? "").trim() || null;
  const eventIdRaw = String(formData.get("eventId") ?? "").trim() || null;

  if (!title) return { error: "Give the highlight a title." };
  if (!videoUrl || !isSafeHttpUrl(videoUrl)) {
    return { error: "Enter a valid video link starting with http:// or https://." };
  }

  const startSeconds = parseTimestamp(String(formData.get("start") ?? ""));
  let endSeconds = parseTimestamp(String(formData.get("end") ?? ""));
  if (endSeconds != null && endSeconds <= (startSeconds ?? 0)) endSeconds = null;

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) return { error: "Team not found." };
  if (!isTeamPremium(team)) {
    const count = await prisma.highlight.count({ where: { teamId } });
    if (count >= FREE_HIGHLIGHT_LIMIT) {
      return {
        error: `Free teams can hold ${FREE_HIGHLIGHT_LIMIT} highlights. A team admin can upgrade to Premium for unlimited.`,
      };
    }
  }

  // Coaches/admins can tag any player on the team. Everyone else can only
  // tag themselves — never trust the tagged id from the form on its own.
  let playerId: string | null = null;
  if (isPrivileged) {
    if (playerIdRaw) {
      const tagged = await prisma.teamMembership.findUnique({
        where: { teamId_userId: { teamId, userId: playerIdRaw } },
      });
      playerId = tagged ? playerIdRaw : null;
    }
  } else if (membership.role === "PLAYER") {
    playerId = user.id;
  }

  const event = eventIdRaw
    ? await prisma.event.findFirst({ where: { id: eventIdRaw, teamId } })
    : null;

  await prisma.highlight.create({
    data: {
      teamId,
      userId: playerId,
      postedById: user.id,
      eventId: event ? eventIdRaw : null,
      title,
      description,
      videoUrl,
      startSeconds,
      endSeconds,
    },
  });

  revalidatePath(`/teams/${teamId}/highlights`);
  revalidatePath("/");
  return { success: true };
}

export async function postHighlight(
  teamId: string,
  _prevState: HighlightFormState,
  formData: FormData
): Promise<HighlightFormState> {
  return createHighlight(teamId, formData);
}

// Used by the home-page feed, where the team is chosen in the form itself;
// createHighlight re-checks membership so the field can't be trusted.
export async function postFeedHighlight(
  _prevState: HighlightFormState,
  formData: FormData
): Promise<HighlightFormState> {
  const teamId = String(formData.get("teamId") ?? "");
  if (!teamId) return { error: "Choose a team." };
  return createHighlight(teamId, formData);
}

export async function deleteHighlight(teamId: string, id: string) {
  const { user, membership } = await requireMembership(teamId);
  if (!(await rateLimitUser(user.id, "highlight-delete", 60, RATE_WINDOWS.HOUR))) return;

  // You can remove what you posted; coaches/admins can remove anything.
  const isPrivileged = membership.role === "ADMIN" || membership.role === "COACH";
  await prisma.highlight.deleteMany({
    where: { id, teamId, ...(isPrivileged ? {} : { postedById: user.id }) },
  });

  revalidatePath(`/teams/${teamId}/highlights`);
  revalidatePath("/");
}
