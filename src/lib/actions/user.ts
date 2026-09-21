"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { setCurrentUserCookie, clearCurrentUserCookie } from "@/lib/auth";

export type AuthFormState = { error?: string } | undefined;

export async function signUp(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!name || !email || !password) {
    return { error: "Please fill in all fields." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (password !== confirmPassword) {
    return { error: "Passwords don't match." };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    if (existing.passwordHash) {
      return { error: "An account with that email already exists." };
    }
    // Claim a roster-only placeholder a coach/admin added for this email.
    await prisma.user.update({
      where: { id: existing.id },
      data: { name, passwordHash },
    });
    await setCurrentUserCookie(existing.id);
    redirect("/");
  }

  const user = await prisma.user.create({
    data: { name, email, passwordHash },
  });

  await setCurrentUserCookie(user.id);
  redirect("/");
}

export async function signIn(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Please enter your email and password." };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) {
    return { error: "Incorrect email or password." };
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return { error: "Incorrect email or password." };
  }

  await setCurrentUserCookie(user.id);
  redirect("/");
}

export async function signOut() {
  await clearCurrentUserCookie();
  redirect("/login");
}
