"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getMembership, requireRole, requireMembership } from "@/lib/auth";
import { isSafeHttpUrl } from "@/lib/url";
import { isTeamPremium } from "@/lib/billing";
import { randomInt } from "crypto";
import { rateLimitUser, rateLimitIp, RATE_WINDOWS } from "@/lib/rateLimit";
import { logAudit } from "@/lib/audit";

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
    code += JOIN_CODE_CHARS[randomInt(JOIN_CODE_CHARS.length)];
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
  if (!(await rateLimitUser(user.id, "team-create", 5, RATE_WINDOWS.HOUR))) return;

  const name = String(formData.get("name") ?? "").trim().slice(0, 100);
  const sport = String(formData.get("sport") ?? "").trim().slice(0, 60);
  const teamTypeRaw = String(formData.get("teamType") ?? "OTHER");
  const VALID_TEAM_TYPES = ["CLUB", "SCHOOL", "RECREATIONAL", "TRAVEL", "OTHER"] as const;
  const teamType = (VALID_TEAM_TYPES as readonly string[]).includes(teamTypeRaw)
    ? (teamTypeRaw as (typeof VALID_TEAM_TYPES)[number])
    : "OTHER";
  const season = String(formData.get("season") ?? "").trim().slice(0, 50) || null;
  const colorPrimaryRaw = String(formData.get("colorPrimary") ?? "#1d4ed8");
  // This gets interpolated directly into a CSS style string in the team
  // header — an unvalidated value here would be a CSS-injection vector, not
  // just an invalid color.
  const colorPrimary = /^#[0-9a-fA-F]{6}$/.test(colorPrimaryRaw) ? colorPrimaryRaw : "#1d4ed8";
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

  // Join codes are short, so cap guessing hard — both per account and per IP
  // (a script could otherwise sign up many accounts to get around the first).
  const allowed =
    (await rateLimitUser(user.id, "join", 10, 15 * RATE_WINDOWS.MINUTE)) &&
    (await rateLimitIp("join", 30, 15 * RATE_WINDOWS.MINUTE));
  if (!allowed) {
    return { error: "Too many attempts. Please wait a few minutes and try again." };
  }

  const team = await prisma.team.findUnique({ where: { joinCode: code } });
  if (!team) {
    return { error: "That code doesn't match any team." };
  }

  const existing = await getMembership(team.id, user!.id);
  if (existing) {
    redirect(`/teams/${team.id}`);
  }

  // Teams can require a coach/admin to approve newcomers (recommended for
  // youth teams) — the person waits on the dashboard until they're let in.
  if (team.requireApproval) {
    await prisma.joinRequest.upsert({
      where: { teamId_userId: { teamId: team.id, userId: user.id } },
      update: { role },
      create: { teamId: team.id, userId: user.id, role },
    });
    await logAudit(team.id, user.id, "member.join_requested", role);
    redirect("/?requested=1");
  }

  await prisma.teamMembership.create({
    data: { teamId: team.id, userId: user!.id, role },
  });
  await logAudit(team.id, user!.id, "member.joined", role);

  redirect(`/teams/${team.id}`);
}

export async function approveJoinRequest(teamId: string, requestId: string) {
  const { user } = await requireRole(teamId, ["ADMIN", "COACH"]);
  if (!(await rateLimitUser(user.id, "join-review", 120, RATE_WINDOWS.HOUR))) return;

  // Scoped to this team so a coach can't approve requests for someone else's.
  const request = await prisma.joinRequest.findFirst({ where: { id: requestId, teamId } });
  if (!request) return;

  await prisma.$transaction([
    prisma.teamMembership.upsert({
      where: { teamId_userId: { teamId, userId: request.userId } },
      update: {},
      create: { teamId, userId: request.userId, role: request.role },
    }),
    prisma.joinRequest.delete({ where: { id: request.id } }),
  ]);
  await logAudit(teamId, user.id, "member.join_approved", request.userId);
  revalidatePath(`/teams/${teamId}`, "layout");
}

export async function declineJoinRequest(teamId: string, requestId: string) {
  const { user } = await requireRole(teamId, ["ADMIN", "COACH"]);
  if (!(await rateLimitUser(user.id, "join-review", 120, RATE_WINDOWS.HOUR))) return;

  const res = await prisma.joinRequest.deleteMany({ where: { id: requestId, teamId } });
  if (res.count > 0) await logAudit(teamId, user.id, "member.join_declined", requestId);
  revalidatePath(`/teams/${teamId}`, "layout");
}

export async function cancelJoinRequest(requestId: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  await prisma.joinRequest.deleteMany({ where: { id: requestId, userId: user.id } });
  revalidatePath("/");
}

export async function updateMemberRole(
  teamId: string,
  userId: string,
  formData: FormData
) {
  const { user } = await requireRole(teamId, ["ADMIN"]);
  if (!(await rateLimitUser(user.id, "role-change", 60, RATE_WINDOWS.HOUR))) return;

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
  await logAudit(teamId, user.id, "member.role_changed", `${userId} -> ${role}`);

  revalidatePath(`/teams/${teamId}/roster`);
}

export async function addNewPlayerToTeam(teamId: string, formData: FormData) {
  const { user } = await requireRole(teamId, ["ADMIN", "COACH"]);
  if (!(await rateLimitUser(user.id, "roster-add", 40, RATE_WINDOWS.HOUR))) return;

  // Whoever adds a player (possibly a child under 13) must confirm they're
  // allowed to share that person's details.
  if (formData.get("consent") !== "on") redirect(`/teams/${teamId}/roster/new?error=consent`);

  const name = String(formData.get("name") ?? "").trim().slice(0, 100);
  const roleRaw = String(formData.get("role") ?? "PLAYER");
  // A coach can add players, but must never be able to grant ADMIN this way
  // (the UI's <select> only ever offers these three, but a server action is
  // a public endpoint — never trust that a raw request matches the form).
  const role: "COACH" | "PLAYER" | "PARENT" =
    roleRaw === "COACH" || roleRaw === "PARENT" ? roleRaw : "PLAYER";
  const jerseyNumber = String(formData.get("jerseyNumber") ?? "").trim().slice(0, 10) || null;
  const position = String(formData.get("position") ?? "").trim().slice(0, 60) || null;
  const photoUrlRaw = String(formData.get("photoUrl") ?? "").trim();
  const photoUrl = photoUrlRaw && isSafeHttpUrl(photoUrlRaw) ? photoUrlRaw : null;
  const email = String(formData.get("email") ?? "").trim().toLowerCase().slice(0, 200) || null;
  const phone = String(formData.get("phone") ?? "").trim().slice(0, 30) || null;
  const emergencyContactName =
    String(formData.get("emergencyContactName") ?? "").trim().slice(0, 100) || null;
  const emergencyContactPhone =
    String(formData.get("emergencyContactPhone") ?? "").trim().slice(0, 30) || null;

  if (!name) return;

  if (email) {
    const taken = await prisma.user.findUnique({ where: { email } });
    if (taken) redirect(`/teams/${teamId}/roster/new?error=email-taken`);
  }

  const created = await prisma.user.create({
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
  await logAudit(teamId, user.id, "member.added", `${created.id} as ${role}`);

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
  if (!(await rateLimitUser(user.id, "roster-edit", 60, RATE_WINDOWS.HOUR))) return;

  const jerseyNumber = String(formData.get("jerseyNumber") ?? "").trim().slice(0, 10) || null;
  const position = String(formData.get("position") ?? "").trim().slice(0, 60) || null;
  const photoUrlRaw = String(formData.get("photoUrl") ?? "").trim();
  const photoUrl = photoUrlRaw && isSafeHttpUrl(photoUrlRaw) ? photoUrlRaw : null;
  const email = String(formData.get("email") ?? "").trim().toLowerCase().slice(0, 200) || null;
  const phone = String(formData.get("phone") ?? "").trim().slice(0, 30) || null;
  const emergencyContactName =
    String(formData.get("emergencyContactName") ?? "").trim().slice(0, 100) || null;
  const emergencyContactPhone =
    String(formData.get("emergencyContactPhone") ?? "").trim().slice(0, 30) || null;

  await prisma.teamMembership.update({
    where: { teamId_userId: { teamId, userId } },
    data: { jerseyNumber, position, emergencyContactName, emergencyContactPhone },
  });

  // Account-level fields belong to the account holder. A coach may only edit
  // them for roster-only placeholders (no login). Letting a coach change a
  // real account's email would let them take it over through "forgot
  // password", so for real accounts the owner changes those in Settings.
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (target) {
    const isPlaceholder = !target.passwordHash;
    if (isPlaceholder && isPrivileged) {
      await prisma.user
        .update({ where: { id: userId }, data: { photoUrl, email, phone } })
        .catch(() => undefined); // email already used by another account
    } else if (user.id === userId) {
      await prisma.user.update({ where: { id: userId }, data: { photoUrl, phone } });
    }
  }

  revalidatePath(`/teams/${teamId}/roster/${userId}`);
  redirect(`/teams/${teamId}/roster/${userId}`);
}

export async function removeMembership(teamId: string, userId: string) {
  const { user } = await requireRole(teamId, ["ADMIN"]);
  if (!(await rateLimitUser(user.id, "member-remove", 30, RATE_WINDOWS.HOUR))) return;

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
  await prisma.parentLink.deleteMany({
    where: { teamId, OR: [{ parentId: userId }, { childId: userId }] },
  });

  // A roster-only entry with no login and no other team has no reason to
  // keep existing — delete it so a child's details don't linger orphaned.
  const leftover = await prisma.user.findUnique({
    where: { id: userId },
    include: { _count: { select: { memberships: true } } },
  });
  if (leftover && !leftover.passwordHash && leftover._count.memberships === 0) {
    await prisma.user.delete({ where: { id: userId } });
  }

  await logAudit(teamId, user.id, "member.removed", userId);
  revalidatePath(`/teams/${teamId}/roster`);
  redirect(`/teams/${teamId}/roster`);
}

export async function regenerateJoinCode(teamId: string) {
  const { user } = await requireRole(teamId, ["ADMIN"]);
  if (!(await rateLimitUser(user.id, "regen-code", 10, RATE_WINDOWS.HOUR))) return;

  const joinCode = await uniqueJoinCode();
  await prisma.team.update({ where: { id: teamId }, data: { joinCode } });
  await logAudit(teamId, user.id, "team.join_code_regenerated");

  revalidatePath(`/teams/${teamId}`, "layout");
}

// Links a PARENT-role member to one child's roster entry so they can see that
// child's details and RSVP for them.
export async function linkParent(teamId: string, childId: string, formData: FormData) {
  const { user } = await requireRole(teamId, ["ADMIN", "COACH"]);
  if (!(await rateLimitUser(user.id, "parent-link", 60, RATE_WINDOWS.HOUR))) return;

  const parentId = String(formData.get("parentId") ?? "");
  const [parentMembership, childMembership] = await Promise.all([
    prisma.teamMembership.findUnique({ where: { teamId_userId: { teamId, userId: parentId } } }),
    prisma.teamMembership.findUnique({ where: { teamId_userId: { teamId, userId: childId } } }),
  ]);
  if (!parentMembership || parentMembership.role !== "PARENT" || !childMembership) return;
  if (parentId === childId) return;

  await prisma.parentLink.upsert({
    where: { teamId_parentId_childId: { teamId, parentId, childId } },
    update: {},
    create: { teamId, parentId, childId },
  });
  await logAudit(teamId, user.id, "parent.linked", `${parentId} -> ${childId}`);
  revalidatePath(`/teams/${teamId}/roster/${childId}`);
}

export async function unlinkParent(teamId: string, childId: string, parentId: string) {
  const { user } = await requireRole(teamId, ["ADMIN", "COACH"]);
  await prisma.parentLink.deleteMany({ where: { teamId, parentId, childId } });
  await logAudit(teamId, user.id, "parent.unlinked", `${parentId} -> ${childId}`);
  revalidatePath(`/teams/${teamId}/roster/${childId}`);
}

export async function updateTeamSettings(teamId: string, formData: FormData) {
  const { user } = await requireRole(teamId, ["ADMIN"]);
  if (!(await rateLimitUser(user.id, "team-settings", 30, RATE_WINDOWS.HOUR))) return;

  const name = String(formData.get("name") ?? "").trim().slice(0, 100);
  const season = String(formData.get("season") ?? "").trim().slice(0, 50) || null;
  if (!name) return;

  const team = await prisma.team.findUniqueOrThrow({ where: { id: teamId } });
  const data: {
    name: string;
    season: string | null;
    requireApproval: boolean;
    colorPrimary?: string;
    colorSecondary?: string;
    logoUrl?: string | null;
  } = { name, season, requireApproval: formData.get("requireApproval") === "on" };

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
  await logAudit(
    teamId,
    user.id,
    "team.settings_updated",
    data.requireApproval !== team.requireApproval
      ? `join approval ${data.requireApproval ? "on" : "off"}`
      : undefined
  );
  revalidatePath(`/teams/${teamId}/settings`);
  revalidatePath(`/teams/${teamId}`, "layout");
}
