"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  createSessionCookie,
  clearCurrentUserSession,
  getCurrentUser,
  getCurrentSessionToken,
} from "@/lib/auth";
import { isSafeHttpUrl } from "@/lib/url";

export type AuthFormState = { error?: string } | undefined;
export type AccountFormState = { error?: string; success?: boolean } | undefined;

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
  const name = String(formData.get("name") ?? "").trim().slice(0, 100);
  const email = String(formData.get("email") ?? "").trim().toLowerCase().slice(0, 200);
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
  // bcrypt silently truncates anything past 72 bytes; reject early instead
  // of letting someone submit a huge string that only 72 bytes of it matter.
  if (password.length > 200) {
    return { error: "Password must be 200 characters or fewer." };
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

export async function updateProfile(
  _prevState: AccountFormState,
  formData: FormData
): Promise<AccountFormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const name = String(formData.get("name") ?? "").trim().slice(0, 100);
  const email = String(formData.get("email") ?? "").trim().toLowerCase().slice(0, 200);
  const phone = String(formData.get("phone") ?? "").trim().slice(0, 30) || null;
  const photoUrlRaw = String(formData.get("photoUrl") ?? "").trim();
  const photoUrl = photoUrlRaw && isSafeHttpUrl(photoUrlRaw) ? photoUrlRaw : null;

  if (!name) return { error: "Name can't be empty." };
  if (!email || !EMAIL_PATTERN.test(email)) {
    return { error: "Enter a valid email address." };
  }

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { name, email, phone, photoUrl },
    });
  } catch (err) {
    if ((err as { code?: string }).code === "P2002") {
      return { error: "That email is already in use by another account." };
    }
    throw err;
  }

  revalidatePath("/account");
  revalidatePath("/", "layout");
  return { success: true };
}

export async function changePassword(
  _prevState: AccountFormState,
  formData: FormData
): Promise<AccountFormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { error: "Please fill in all fields." };
  }
  if (newPassword.length < 8) {
    return { error: "New password must be at least 8 characters." };
  }
  if (newPassword.length > 200) {
    return { error: "New password must be 200 characters or fewer." };
  }
  if (newPassword !== confirmPassword) {
    return { error: "New passwords don't match." };
  }

  const valid = user.passwordHash && (await bcrypt.compare(currentPassword, user.passwordHash));
  if (!valid) {
    return { error: "Current password is incorrect." };
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  const currentToken = await getCurrentSessionToken();

  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
    // Signing out every other session is a deliberate side effect: if
    // someone else had a stolen session token, changing the password now
    // revokes it too, instead of leaving it valid for another 30 days.
    prisma.session.deleteMany({
      where: { userId: user.id, token: { not: currentToken ?? "" } },
    }),
  ]);

  return { success: true };
}

export async function deleteMyAccount(
  _prevState: AccountFormState,
  formData: FormData
): Promise<AccountFormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const password = String(formData.get("password") ?? "");
  if (!password) return { error: "Enter your password to confirm." };

  const valid = user.passwordHash && (await bcrypt.compare(password, user.passwordHash));
  if (!valid) return { error: "Incorrect password." };

  const adminTeams = await prisma.team.findMany({
    where: { memberships: { some: { userId: user.id, role: "ADMIN" } } },
    include: { _count: { select: { memberships: { where: { role: "ADMIN" } } } } },
  });
  const stuckTeam = adminTeams.find((t) => t._count.memberships <= 1);
  if (stuckTeam) {
    return {
      error: `You're the only admin on "${stuckTeam.name}". Promote another member to admin there before deleting your account.`,
    };
  }

  await prisma.user.delete({ where: { id: user.id } });
  await clearCurrentUserSession();
  redirect("/signup");
}
