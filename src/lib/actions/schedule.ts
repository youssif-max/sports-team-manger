"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function createEvent(teamId: string, formData: FormData) {
  const type = String(formData.get("type") ?? "PRACTICE") as
    | "PRACTICE"
    | "GAME"
    | "OTHER";
  const title = String(formData.get("title") ?? "").trim();
  const startsAtRaw = String(formData.get("startsAt") ?? "");
  const location = String(formData.get("location") ?? "").trim() || null;
  const opponent = String(formData.get("opponent") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!title || !startsAtRaw) return;

  const event = await prisma.event.create({
    data: {
      teamId,
      type,
      title,
      startsAt: new Date(startsAtRaw),
      location,
      opponent,
      notes,
    },
  });

  const members = await prisma.teamMembership.findMany({ where: { teamId } });
  await prisma.rsvp.createMany({
    data: members.map((m) => ({ eventId: event.id, userId: m.userId })),
  });

  revalidatePath(`/teams/${teamId}/schedule`);
  redirect(`/teams/${teamId}/schedule/${event.id}`);
}

export async function deleteEvent(teamId: string, eventId: string) {
  await prisma.event.delete({ where: { id: eventId } });
  revalidatePath(`/teams/${teamId}/schedule`);
  redirect(`/teams/${teamId}/schedule`);
}

export async function setRsvp(
  teamId: string,
  eventId: string,
  userId: string,
  status: "IN" | "OUT" | "MAYBE"
) {
  await prisma.rsvp.upsert({
    where: { eventId_userId: { eventId, userId } },
    update: { status, respondedAt: new Date() },
    create: { eventId, userId, status, respondedAt: new Date() },
  });
  revalidatePath(`/teams/${teamId}/schedule/${eventId}`);
}

export async function setAttendance(
  teamId: string,
  eventId: string,
  userId: string,
  status: "PRESENT" | "ABSENT" | "LATE" | "UNKNOWN"
) {
  await prisma.attendance.upsert({
    where: { eventId_userId: { eventId, userId } },
    update: { status },
    create: { eventId, userId, status },
  });
  revalidatePath(`/teams/${teamId}/schedule/${eventId}`);
}

export async function setRsvpForm(
  teamId: string,
  eventId: string,
  userId: string,
  formData: FormData
) {
  const status = String(formData.get("status") ?? "PENDING") as
    | "IN"
    | "OUT"
    | "MAYBE";
  await setRsvp(teamId, eventId, userId, status);
}

export async function setAttendanceForm(
  teamId: string,
  eventId: string,
  userId: string,
  formData: FormData
) {
  const status = String(formData.get("status") ?? "UNKNOWN") as
    | "PRESENT"
    | "ABSENT"
    | "LATE"
    | "UNKNOWN";
  await setAttendance(teamId, eventId, userId, status);
}

export async function recordResult(teamId: string, eventId: string, formData: FormData) {
  const teamScore = Number(formData.get("teamScore") ?? 0);
  const opponentScore = Number(formData.get("opponentScore") ?? 0);
  const outcome =
    teamScore > opponentScore ? "WIN" : teamScore < opponentScore ? "LOSS" : "TIE";

  await prisma.gameResult.upsert({
    where: { eventId },
    update: { teamScore, opponentScore, outcome },
    create: { eventId, teamScore, opponentScore, outcome },
  });

  revalidatePath(`/teams/${teamId}/schedule/${eventId}`);
  revalidatePath(`/teams/${teamId}/standings`);
}

export async function recordStats(teamId: string, eventId: string, formData: FormData) {
  const entries = Array.from(formData.entries()).filter(([key]) =>
    key.startsWith("stat:")
  );

  for (const [key, rawValue] of entries) {
    const [, userId, statDefinitionId] = key.split(":");
    const value = Number(rawValue);
    if (!userId || !statDefinitionId || Number.isNaN(value)) continue;

    if (value === 0) {
      await prisma.gameStat
        .delete({
          where: {
            eventId_userId_statDefinitionId: { eventId, userId, statDefinitionId },
          },
        })
        .catch(() => undefined);
      continue;
    }

    await prisma.gameStat.upsert({
      where: { eventId_userId_statDefinitionId: { eventId, userId, statDefinitionId } },
      update: { value },
      create: { eventId, userId, statDefinitionId, value },
    });
  }

  revalidatePath(`/teams/${teamId}/schedule/${eventId}`);
  revalidatePath(`/teams/${teamId}/roster`);
}

export async function addStatDefinition(teamId: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  await prisma.statDefinition
    .create({ data: { teamId, name } })
    .catch(() => undefined);
  revalidatePath(`/teams`);
}
