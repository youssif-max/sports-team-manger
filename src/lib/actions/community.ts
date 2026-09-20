"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function postChatMessage(teamId: string, formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;

  await prisma.chatMessage.create({
    data: { teamId, authorId: user!.id, body },
  });

  revalidatePath(`/teams/${teamId}/chat`);
}

export async function postAnnouncement(teamId: string, formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!title || !body) return;

  await prisma.announcement.create({
    data: { teamId, authorId: user!.id, title, body },
  });

  revalidatePath(`/teams/${teamId}/announcements`);
  revalidatePath(`/teams/${teamId}`);
}

export async function deleteAnnouncement(teamId: string, id: string) {
  await prisma.announcement.delete({ where: { id } });
  revalidatePath(`/teams/${teamId}/announcements`);
}

export async function postHighlight(teamId: string, formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

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
  await prisma.highlight.delete({ where: { id } });
  revalidatePath(`/teams/${teamId}/highlights`);
}
