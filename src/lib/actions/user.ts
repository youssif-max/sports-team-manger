"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSessionCookie, clearCurrentUserSession } from "@/lib/auth";

export type AuthFormState = { error?: string } | undefined;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;
const MIN_AGE_YEARS = 13;

// A precomputed hash with no real matching password. Comparing against this
// when an email isn't found keeps sign-in taking roughly the same amount of
// time either way, so a script can't tell "wrong password" from "no such
// account" by timing alone.
const DUMMY_HASH = bcrypt.hashSync("no-such-account-placeholder", 10);

function safeRedirectTarget(formData: FormData): string {
  const target = String(formData.get("redirect") ?? "");
  return target.startsWith("/") && !target.startsWith("//") ? target : "/";
}

function ageInYears(dob: Date): number {
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

export async function signUp(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const dobRaw = String(formData.get("dateOfBirth") ?? "");

  if (!name || !email || !password || !dobRaw) {
    return { error: "Please fill in all fields." };
  }
  if (!EMAIL_PATTERN.test(email)) {
    return { error: "Enter a valid email address." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (password !== confirmPassword) {
    return { error: "Passwords don't match." };
  }

  const dateOfBirth = new Date(dobRaw);
  if (Number.isNaN(dateOfBirth.getTime()) || dateOfBirth > new Date()) {
    return { error: "Enter a valid date of birth." };
  }
  if (ageInYears(dateOfBirth) < MIN_AGE_YEARS) {
    return {
      error: `You must be at least ${MIN_AGE_YEARS} to create your own account. Ask a parent or coach to add you to the team roster instead — no login required for that.`,
    };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    if (existing.passwordHash) {
      return { error: "An account with that email already exists." };
    }
    // Claim a roster-only placeholder a coach/admin added for this email.
    const claimed = await prisma.user.update({
      where: { id: existing.id },
      data: { name, passwordHash, dateOfBirth },
    });
    await createSessionCookie(claimed.id);
    redirect(safeRedirectTarget(formData));
  }

  const user = await prisma.user.create({
    data: { name, email, passwordHash, dateOfBirth },
  });

  await createSessionCookie(user.id);
  redirect(safeRedirectTarget(formData));
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

  if (user?.lockedUntil && user.lockedUntil > new Date()) {
    return { error: "Too many failed attempts. Try again in a few minutes." };
  }

  const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);

  if (!user || !user.passwordHash || !valid) {
    if (user) {
      const attempts = user.failedLoginAttempts + 1;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: attempts,
          lockedUntil:
            attempts >= MAX_FAILED_ATTEMPTS ? new Date(Date.now() + LOCKOUT_DURATION_MS) : null,
        },
      });
    }
    return { error: "Incorrect email or password." };
  }

  if (user.failedLoginAttempts > 0 || user.lockedUntil) {
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
  }

  await createSessionCookie(user.id);
  redirect(safeRedirectTarget(formData));
}

export async function signOut() {
  await clearCurrentUserSession();
  redirect("/login");
}
