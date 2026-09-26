"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/lib/auth";
import { isSafeHttpUrl } from "@/lib/url";

export async function createPlay(teamId: string, formData: FormData) {
  const { user } = await requireMembership(teamId);

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const diagram = String(formData.get("diagram") ?? "").trim() || null;
  const thumbnail = String(formData.get("thumbnail") ?? "").trim() || null;
  const fileUrlRaw = String(formData.get("fileUrl") ?? "").trim();
  const fileUrl = fileUrlRaw && isSafeHttpUrl(fileUrlRaw) ? fileUrlRaw : null;

  if (!title || (!diagram && !fileUrl)) return;

  await prisma.play.create({
    data: { teamId, title, description, diagram, thumbnail, fileUrl, createdById: user.id },
  });

  revalidatePath(`/teams/${teamId}/playbook`);
  redirect(`/teams/${teamId}/playbook`);
}

export async function deletePlay(teamId: string, playId: string) {
  const { user, membership } = await requireMembership(teamId);
  const isPrivileged = membership.role === "ADMIN" || membership.role === "COACH";

  await prisma.play.deleteMany({
    where: {
      id: playId,
      teamId,
      ...(isPrivileged ? {} : { createdById: user.id }),
    },
  });

  revalidatePath(`/teams/${teamId}/playbook`);
}
