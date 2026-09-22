"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function createPlay(teamId: string, formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const diagram = String(formData.get("diagram") ?? "").trim() || null;
  const fileUrl = String(formData.get("fileUrl") ?? "").trim() || null;

  if (!title || (!diagram && !fileUrl)) return;

  await prisma.play.create({
    data: { teamId, title, description, diagram, fileUrl, createdById: user!.id },
  });

  revalidatePath(`/teams/${teamId}/playbook`);
  redirect(`/teams/${teamId}/playbook`);
}

export async function deletePlay(teamId: string, playId: string) {
  await prisma.play.delete({ where: { id: playId } });
  revalidatePath(`/teams/${teamId}/playbook`);
}
