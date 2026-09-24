"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { sendPushToTeam } from "@/lib/actions/push";

async function notifyGameResult(
  teamId: string,
  eventId: string,
  outcome: "WIN" | "LOSS" | "TIE",
  scoreLine: string | null
) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { team: true },
  });
  if (!event) return;

  const label = outcome === "WIN" ? "Win" : outcome === "LOSS" ? "Loss" : "Tie";
  const opponentLine = event.opponent ? ` vs ${event.opponent}` : "";

  await sendPushToTeam(teamId, {
    title: `${event.team.name}: ${label}${opponentLine}`,
    body: scoreLine ? `Final score: ${scoreLine}` : `${event.title} result is in.`,
    url: `/teams/${teamId}/schedule/${eventId}`,
  });
}

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
  const repeat = String(formData.get("repeat") ?? "none");

  if (!title || !startsAtRaw) return;

  const firstStart = new Date(startsAtRaw);
  const members = await prisma.teamMembership.findMany({ where: { teamId } });

  if (repeat === "weekly") {
    const days = formData.getAll("repeatDays").map((d) => Number(d));
    const untilRaw = String(formData.get("repeatUntil") ?? "");
    const until = untilRaw ? new Date(`${untilRaw}T23:59:59`) : null;

    if (days.length > 0 && until && until >= firstStart) {
      const recurringGroupId = crypto.randomUUID();
      const occurrences: Date[] = [];
      const cursor = new Date(firstStart);
      let daysScanned = 0;

      while (cursor <= until && daysScanned < 730 && occurrences.length < 200) {
        if (days.includes(cursor.getDay())) {
          occurrences.push(new Date(cursor));
        }
        cursor.setDate(cursor.getDate() + 1);
        daysScanned++;
      }

      const created = await prisma.$transaction(
        occurrences.map((date) =>
          prisma.event.create({
            data: {
              teamId,
              type,
              title,
              startsAt: date,
              location,
              opponent,
              notes,
              recurringGroupId,
            },
          })
        )
      );

      await prisma.rsvp.createMany({
        data: created.flatMap((e) =>
          members.map((m) => ({ eventId: e.id, userId: m.userId }))
        ),
      });

      revalidatePath(`/teams/${teamId}/schedule`);
      redirect(`/teams/${teamId}/schedule`);
    }
  }

  const event = await prisma.event.create({
    data: {
      teamId,
      type,
      title,
      startsAt: firstStart,
      location,
      opponent,
      notes,
    },
  });

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

export async function deleteEventSeries(teamId: string, recurringGroupId: string) {
  await prisma.event.deleteMany({ where: { teamId, recurringGroupId } });
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

  await notifyGameResult(teamId, eventId, outcome, `${teamScore}-${opponentScore}`);
}

export async function setGameOutcome(
  teamId: string,
  eventId: string,
  outcome: "WIN" | "LOSS" | "TIE"
) {
  await prisma.gameResult.upsert({
    where: { eventId },
    update: { outcome },
    create: { eventId, outcome },
  });

  revalidatePath(`/teams/${teamId}/gamedays`);
  revalidatePath(`/teams/${teamId}/standings`);
  revalidatePath(`/teams/${teamId}/schedule/${eventId}`);
  revalidatePath(`/teams/${teamId}/schedule`);

  await notifyGameResult(teamId, eventId, outcome, null);
}

export async function clearGameOutcome(teamId: string, eventId: string) {
  await prisma.gameResult.delete({ where: { eventId } }).catch(() => undefined);

  revalidatePath(`/teams/${teamId}/gamedays`);
  revalidatePath(`/teams/${teamId}/standings`);
  revalidatePath(`/teams/${teamId}/schedule/${eventId}`);
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
