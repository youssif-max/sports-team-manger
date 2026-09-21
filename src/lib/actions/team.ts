"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getMembership } from "@/lib/auth";

const DEFAULT_STATS: Record<string, string[]> = {
  soccer: ["Goals", "Assists", "Saves"],
  basketball: ["Points", "Rebounds", "Assists"],
  baseball: ["Hits", "Runs", "RBIs"],
  softball: ["Hits", "Runs", "RBIs"],
  football: ["Touchdowns", "Yards", "Tackles"],
  hockey: ["Goals", "Assists", "Saves"],
  volleyball: ["Kills", "Digs", "Aces"],
};

const JOIN_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O or 1/I

function generateJoinCode() {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += JOIN_CODE_CHARS[Math.floor(Math.random() * JOIN_CODE_CHARS.length)];
  }
  return code;
}

async function uniqueJoinCode() {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateJoinCode();
    const existing = await prisma.team.findUnique({ where: { joinCode: code } });
    if (!existing) return code;
  }
  throw new Error("Could not generate a unique join code, please try again.");
}

export async function createTeam(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  const sport = String(formData.get("sport") ?? "").trim();
  const teamType = String(formData.get("teamType") ?? "OTHER") as
    | "CLUB"
    | "SCHOOL"
    | "RECREATIONAL"
    | "TRAVEL"
    | "OTHER";
  const season = String(formData.get("season") ?? "").trim() || null;
  const colorPrimary = String(formData.get("colorPrimary") ?? "#1d4ed8");
  if (!name || !sport) return;

  const joinCode = await uniqueJoinCode();

  const team = await prisma.team.create({
    data: {
      name,
      sport,
      teamType,
      season,
      colorPrimary,
      joinCode,
      memberships: {
        create: { userId: user!.id, role: "ADMIN" },
      },
      statDefinitions: {
        create: (DEFAULT_STATS[sport.toLowerCase()] ?? ["Points"]).map((n) => ({
          name: n,
        })),
      },
    },
  });

  redirect(`/teams/${team.id}`);
}

export type JoinTeamState = { error?: string } | undefined;

export async function joinTeamByCode(
  _prevState: JoinTeamState,
  formData: FormData
): Promise<JoinTeamState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const code = String(formData.get("joinCode") ?? "").trim().toUpperCase();
  const role = String(formData.get("role") ?? "PLAYER") as "PLAYER" | "PARENT";

  if (!code) {
    return { error: "Enter a join code." };
  }
  if (role !== "PLAYER" && role !== "PARENT") {
    return { error: "Invalid role." };
  }

  const team = await prisma.team.findUnique({ where: { joinCode: code } });
  if (!team) {
    return { error: "That code doesn't match any team." };
  }

  const existing = await getMembership(team.id, user!.id);
  if (existing) {
    redirect(`/teams/${team.id}`);
  }

  await prisma.teamMembership.create({
    data: { teamId: team.id, userId: user!.id, role },
  });

  redirect(`/teams/${team.id}`);
}

export async function updateMemberRole(
  teamId: string,
  userId: string,
  formData: FormData
) {
  const admin = await getCurrentUser();
  if (!admin) redirect("/login");

  const adminMembership = await getMembership(teamId, admin!.id);
  if (!adminMembership || adminMembership.role !== "ADMIN") {
    throw new Error("Only team admins can change roles.");
  }

  const role = String(formData.get("role") ?? "");
  if (!["ADMIN", "COACH", "PLAYER", "PARENT"].includes(role)) return;

  await prisma.teamMembership.update({
    where: { teamId_userId: { teamId, userId } },
    data: { role: role as "ADMIN" | "COACH" | "PLAYER" | "PARENT" },
  });

  revalidatePath(`/teams/${teamId}/roster`);
}

export async function addNewPlayerToTeam(teamId: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const role = String(formData.get("role") ?? "PLAYER") as "COACH" | "PLAYER" | "PARENT";
  const jerseyNumber = String(formData.get("jerseyNumber") ?? "").trim() || null;
  const position = String(formData.get("position") ?? "").trim() || null;
  const photoUrl = String(formData.get("photoUrl") ?? "").trim() || null;
  const email = String(formData.get("email") ?? "").trim().toLowerCase() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const emergencyContactName =
    String(formData.get("emergencyContactName") ?? "").trim() || null;
  const emergencyContactPhone =
    String(formData.get("emergencyContactPhone") ?? "").trim() || null;

  if (!name) return;

  await prisma.user.create({
    data: {
      name,
      photoUrl,
      email,
      phone,
      memberships: {
        create: {
          teamId,
          role,
          jerseyNumber,
          position,
          emergencyContactName,
          emergencyContactPhone,
        },
      },
    },
  });

  revalidatePath(`/teams/${teamId}/roster`);
  redirect(`/teams/${teamId}/roster`);
}

export async function updateMembership(
  teamId: string,
  userId: string,
  formData: FormData
) {
  const jerseyNumber = String(formData.get("jerseyNumber") ?? "").trim() || null;
  const position = String(formData.get("position") ?? "").trim() || null;
  const photoUrl = String(formData.get("photoUrl") ?? "").trim() || null;
  const email = String(formData.get("email") ?? "").trim().toLowerCase() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const emergencyContactName =
    String(formData.get("emergencyContactName") ?? "").trim() || null;
  const emergencyContactPhone =
    String(formData.get("emergencyContactPhone") ?? "").trim() || null;

  await prisma.teamMembership.update({
    where: { teamId_userId: { teamId, userId } },
    data: { jerseyNumber, position, emergencyContactName, emergencyContactPhone },
  });
  await prisma.user
    .update({
      where: { id: userId },
      data: { photoUrl, email, phone },
    })
    .catch(() => undefined); // ignore if email is already taken by another account

  revalidatePath(`/teams/${teamId}/roster/${userId}`);
  redirect(`/teams/${teamId}/roster/${userId}`);
}

export async function removeMembership(teamId: string, userId: string) {
  await prisma.teamMembership.delete({
    where: { teamId_userId: { teamId, userId } },
  });
  revalidatePath(`/teams/${teamId}/roster`);
  redirect(`/teams/${teamId}/roster`);
}
