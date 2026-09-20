"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { setCurrentUserCookie, clearCurrentUserCookie } from "@/lib/auth";

export async function switchToUser(formData: FormData) {
  const userId = String(formData.get("userId") ?? "");
  if (!userId) return;
  await setCurrentUserCookie(userId);
  redirect("/");
}

export async function createProfile(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  if (!name) return;

  const user = await prisma.user.create({
    data: { name, email, phone },
  });
  await setCurrentUserCookie(user.id);
  redirect("/");
}

export async function signOut() {
  await clearCurrentUserCookie();
  redirect("/login");
}
