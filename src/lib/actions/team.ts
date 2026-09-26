"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getMembership, requireRole, requireMembership } from "@/lib/auth";
import { isSafeHttpUrl } from "@/lib/url";
import { isTeamPremium } from "@/lib/billing";

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
  await requireRole(teamId, ["ADMIN"]);

  const role = String(formData.get("role") ?? "");
  if (!["ADMIN", "COACH", "PLAYER", "PARENT"].includes(role)) return;

  if (role !== "ADMIN") {
    const target = await prisma.teamMembership.findUnique({
      where: { teamId_userId: { teamId, userId } },
    });
    if (target?.role === "ADMIN") {
      const adminCount = await prisma.teamMembership.count({
        where: { teamId, role: "ADMIN" },
      });
      if (adminCount <= 1) return; // never leave a team with zero admins
    }
  }

  await prisma.teamMembership.update({
    where: { teamId_userId: { teamId, userId } },
    data: { role: role as "ADMIN" | "COACH" | "PLAYER" | "PARENT" },
  });

  revalidatePath(`/teams/${teamId}/roster`);
}

export async function addNewPlayerToTeam(teamId: string, formData: FormData) {
  await requireRole(teamId, ["ADMIN", "COACH"]);

  const name = String(formData.get("name") ?? "").trim();
  const role = String(formData.get("role") ?? "PLAYER") as "COACH" | "PLAYER" | "PARENT";
  const jerseyNumber = String(formData.get("jerseyNumber") ?? "").trim() || null;
  const position = String(formData.get("position") ?? "").trim() || null;
  const photoUrlRaw = String(formData.get("photoUrl") ?? "").trim();
  const photoUrl = photoUrlRaw && isSafeHttpUrl(photoUrlRaw) ? photoUrlRaw : null;
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
  const { user, membership } = await requireMembership(teamId);
  const isPrivileged = membership.role === "ADMIN" || membership.role === "COACH";
  if (!isPrivileged && user.id !== userId) return;

  const jerseyNumber = String(formData.get("jerseyNumber") ?? "").trim() || null;
  const position = String(formData.get("position") ?? "").trim() || null;
  const photoUrlRaw = String(formData.get("photoUrl") ?? "").trim();
  const photoUrl = photoUrlRaw && isSafeHttpUrl(photoUrlRaw) ? photoUrlRaw : null;
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
  await requireRole(teamId, ["ADMIN"]);

  const target = await prisma.teamMembership.findUnique({
    where: { teamId_userId: { teamId, userId } },
  });
  if (target?.role === "ADMIN") {
    const adminCount = await prisma.teamMembership.count({
      where: { teamId, role: "ADMIN" },
    });
    if (adminCount <= 1) return; // never leave a team with zero admins
  }

  await prisma.teamMembership.delete({
    where: { teamId_userId: { teamId, userId } },
  });
  revalidatePath(`/teams/${teamId}/roster`);
  redirect(`/teams/${teamId}/roster`);
}

export async function updateTeamSettings(teamId: string, formData: FormData) {
  await requireRole(teamId, ["ADMIN"]);

  const name = String(formData.get("name") ?? "").trim();
  const season = String(formData.get("season") ?? "").trim() || null;
  if (!name) return;

  const team = await prisma.team.findUniqueOrThrow({ where: { id: teamId } });
  const data: {
    name: string;
    season: string | null;
    colorPrimary?: string;
    colorSecondary?: string;
    logoUrl?: string | null;
  } = { name, season };

  // Custom branding (colors beyond the creation-time preset, and a logo) is
  // a Premium perk — silently ignore attempts to change it on a free team
  // rather than trusting a hidden/tampered form field.
  if (isTeamPremium(team)) {
    const colorPrimary = String(formData.get("colorPrimary") ?? "").trim();
    const colorSecondary = String(formData.get("colorSecondary") ?? "").trim();
    const logoUrlRaw = String(formData.get("logoUrl") ?? "").trim();

    if (/^#[0-9a-fA-F]{6}$/.test(colorPrimary)) data.colorPrimary = colorPrimary;
    if (/^#[0-9a-fA-F]{6}$/.test(colorSecondary)) data.colorSecondary = colorSecondary;
    data.logoUrl = logoUrlRaw && isSafeHttpUrl(logoUrlRaw) ? logoUrlRaw : null;
  }

  await prisma.team.update({ where: { id: teamId }, data });
  revalidatePath(`/teams/${teamId}/settings`);
  revalidatePath(`/teams/${teamId}`, "layout");
}
