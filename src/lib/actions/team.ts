"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const DEFAULT_STATS: Record<string, string[]> = {
  soccer: ["Goals", "Assists", "Saves"],
  basketball: ["Points", "Rebounds", "Assists"],
  baseball: ["Hits", "Runs", "RBIs"],
  softball: ["Hits", "Runs", "RBIs"],
  football: ["Touchdowns", "Yards", "Tackles"],
  hockey: ["Goals", "Assists", "Saves"],
  volleyball: ["Kills", "Digs", "Aces"],
};

export async function createTeam(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  const sport = String(formData.get("sport") ?? "").trim();
  const season = String(formData.get("season") ?? "").trim() || null;
  const colorPrimary = String(formData.get("colorPrimary") ?? "#1d4ed8");
  if (!name || !sport) return;

  const team = await prisma.team.create({
    data: {
      name,
      sport,
      season,
      colorPrimary,
      memberships: {
        create: { userId: user!.id, role: "COACH" },
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

export async function addExistingUserToTeam(teamId: string, formData: FormData) {
  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "PLAYER") as "COACH" | "PLAYER" | "PARENT";
  if (!userId) return;

  await prisma.teamMembership.upsert({
    where: { teamId_userId: { teamId, userId } },
    update: { role },
    create: { teamId, userId, role },
  });

  revalidatePath(`/teams/${teamId}/roster`);
  redirect(`/teams/${teamId}/roster`);
}

export async function addNewPlayerToTeam(teamId: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const role = String(formData.get("role") ?? "PLAYER") as "COACH" | "PLAYER" | "PARENT";
  const jerseyNumber = String(formData.get("jerseyNumber") ?? "").trim() || null;
  const position = String(formData.get("position") ?? "").trim() || null;
  const photoUrl = String(formData.get("photoUrl") ?? "").trim() || null;
  const email = String(formData.get("email") ?? "").trim() || null;
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
  const email = String(formData.get("email") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const emergencyContactName =
    String(formData.get("emergencyContactName") ?? "").trim() || null;
  const emergencyContactPhone =
    String(formData.get("emergencyContactPhone") ?? "").trim() || null;

  await prisma.teamMembership.update({
    where: { teamId_userId: { teamId, userId } },
    data: { jerseyNumber, position, emergencyContactName, emergencyContactPhone },
  });
  await prisma.user.update({
    where: { id: userId },
    data: { photoUrl, email, phone },
  });

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
