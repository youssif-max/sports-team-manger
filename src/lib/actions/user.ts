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
import { rateLimit, rateLimitIp, rateLimitUser, RATE_WINDOWS } from "@/lib/rateLimit";
import { hashPassword, validateNewPassword, BCRYPT_COST } from "@/lib/passwords";
import { sendEmail, isEmailConfigured } from "@/lib/email";
import { createEmailToken, consumeEmailToken, peekEmailToken } from "@/lib/tokens";
import { appOrigin } from "@/lib/appUrl";

export type AuthFormState = { error?: string; message?: string } | undefined;
export type AccountFormState = { error?: string; message?: string; success?: boolean } | undefined;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;
const MIN_AGE_YEARS = 13;

const TOO_MANY = "Too many attempts. Please wait a few minutes and try again.";

// A precomputed hash with no real matching password. Comparing against this
// when an email isn't found keeps sign-in taking roughly the same amount of
// time either way, so a script can't tell "wrong password" from "no such
// account" by timing alone.
const DUMMY_HASH = bcrypt.hashSync("no-such-account-placeholder", BCRYPT_COST);

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

function bcryptCost(hash: string): number {
  return Number(hash.split("$")[2]) || 0;
}

// Returns an error message if the date of birth is missing/invalid/too young.
function checkDateOfBirth(raw: string): { dob?: Date; error?: string } {
  const dob = new Date(raw);
  if (!raw || Number.isNaN(dob.getTime()) || dob > new Date() || dob.getFullYear() < 1900) {
    return { error: "Enter a valid date of birth." };
  }
  if (ageInYears(dob) < MIN_AGE_YEARS) {
    return {
      error: `You must be at least ${MIN_AGE_YEARS} to create your own account. Ask a parent or coach to add you to the team roster instead — no login required for that.`,
    };
  }
  return { dob };
}

async function sendVerificationEmail(userId: string, email: string) {
  const token = await createEmailToken(userId, "VERIFY_EMAIL");
  const origin = await appOrigin();
  return sendEmail({
    to: email,
    subject: "Confirm your SportSync email",
    text: "Welcome to SportSync! Please confirm your email address so you can recover your account if you ever forget your password.",
    ctaLabel: "Confirm email",
    ctaUrl: `${origin}/verify-email/${token}`,
  });
}

export async function signUp(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  if (!(await rateLimitIp("signup", 10, RATE_WINDOWS.HOUR))) return { error: TOO_MANY };

  const name = String(formData.get("name") ?? "").trim().slice(0, 100);
  const email = String(formData.get("email") ?? "").trim().toLowerCase().slice(0, 200);
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const dobRaw = String(formData.get("dateOfBirth") ?? "");
  const acceptedTerms = formData.get("terms") === "on";

  if (!name || !email || !password || !dobRaw) {
    return { error: "Please fill in all fields." };
  }
  if (!EMAIL_PATTERN.test(email)) {
    return { error: "Enter a valid email address." };
  }
  if (!acceptedTerms) {
    return { error: "You need to agree to the Terms of Service and Privacy Policy." };
  }
  const passwordError = await validateNewPassword(password);
  if (passwordError) return { error: passwordError };
  if (password !== confirmPassword) {
    return { error: "Passwords don't match." };
  }

  const { dob: dateOfBirth, error: dobError } = checkDateOfBirth(dobRaw);
  if (dobError || !dateOfBirth) return { error: dobError };

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    if (existing.passwordHash) {
      return { error: "An account with that email already exists." };
    }
    // A coach/admin already added a roster profile for this email. Never hand
    // it to whoever types the address — they must prove they own the inbox
    // by clicking a link we email there.
    if (await rateLimit(`claim-email:${email}`, 3, RATE_WINDOWS.HOUR)) {
      const token = await createEmailToken(existing.id, "CLAIM_PROFILE");
      const origin = await appOrigin();
      await sendEmail({
        to: email,
        subject: "Claim your SportSync profile",
        text: "A coach added you to a team on SportSync. Use the button below to set up your account and claim your profile. This link works for 24 hours.",
        ctaLabel: "Claim my profile",
        ctaUrl: `${origin}/claim/${token}`,
      });
    }
    return {
      message: isEmailConfigured()
        ? "A team already has a profile for this email. We've sent a link to that address — open it to finish setting up your account."
        : "A team already has a profile for this email, but email isn't set up on this server yet, so the link couldn't be sent.",
    };
  }

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await hashPassword(password),
      dateOfBirth,
      termsAcceptedAt: new Date(),
    },
  });

  await sendVerificationEmail(user.id, email);
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

  // Per-IP covers one machine hammering many accounts; per-email covers many
  // machines hammering one account (the lockout below also does that, but
  // this keeps working for emails that don't exist).
  const allowed =
    (await rateLimitIp("login", 20, 15 * RATE_WINDOWS.MINUTE)) &&
    (await rateLimit(`login-email:${email}`, 10, 15 * RATE_WINDOWS.MINUTE));
  if (!allowed) return { error: TOO_MANY };

  const user = await prisma.user.findUnique({ where: { email } });

  if (user?.lockedUntil && user.lockedUntil > new Date()) {
    return { error: "Too many failed attempts. Try again in a few minutes." };
  }

  const valid = await bcrypt.compare(password.slice(0, 200), user?.passwordHash ?? DUMMY_HASH);

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

  // Quietly upgrade older, cheaper hashes to the current cost on login.
  const upgradedHash =
    bcryptCost(user.passwordHash) < BCRYPT_COST ? await hashPassword(password) : undefined;

  if (user.failedLoginAttempts > 0 || user.lockedUntil || upgradedHash) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        ...(upgradedHash ? { passwordHash: upgradedHash } : {}),
      },
    });
  }

  await createSessionCookie(user.id);
  redirect(safeRedirectTarget(formData));
}

export async function signOut() {
  await clearCurrentUserSession();
  redirect("/login");
}

// Always answers the same way whether or not the email has an account, so it
// can't be used to find out who's registered.
export async function requestPasswordReset(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase().slice(0, 200);
  const generic = {
    message:
      "If an account exists for that email, we've sent a link to reset the password. It expires in 1 hour.",
  };

  if (!EMAIL_PATTERN.test(email)) return { error: "Enter a valid email address." };

  // Don't claim an email went out if this server can't send any.
  if (!isEmailConfigured() && process.env.NODE_ENV === "production") {
    return {
      error:
        "Password reset by email isn't available yet. Please contact support to have your password reset.",
    };
  }

  const allowed =
    (await rateLimitIp("reset-request", 8, RATE_WINDOWS.HOUR)) &&
    (await rateLimit(`reset-email:${email}`, 3, RATE_WINDOWS.HOUR));
  if (!allowed) return { error: TOO_MANY };

  const user = await prisma.user.findUnique({ where: { email } });
  if (user?.passwordHash) {
    const token = await createEmailToken(user.id, "RESET_PASSWORD");
    const origin = await appOrigin();
    await sendEmail({
      to: email,
      subject: "Reset your SportSync password",
      text: "We got a request to reset your SportSync password. This link works for 1 hour. If you didn't ask for this, you can ignore this email — your password won't change.",
      ctaLabel: "Reset password",
      ctaUrl: `${origin}/reset-password/${token}`,
    });
  }
  return generic;
}

export async function resetPassword(
  token: string,
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  if (!(await rateLimitIp("reset-submit", 10, RATE_WINDOWS.HOUR))) return { error: TOO_MANY };

  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  // Validate before spending the one-time token so a typo doesn't burn it.
  if (!(await peekEmailToken(token, "RESET_PASSWORD"))) {
    return { error: "This reset link is invalid or has expired. Request a new one." };
  }
  const passwordError = await validateNewPassword(password);
  if (passwordError) return { error: passwordError };
  if (password !== confirmPassword) return { error: "Passwords don't match." };

  const userId = await consumeEmailToken(token, "RESET_PASSWORD");
  if (!userId) return { error: "This reset link is invalid or has expired. Request a new one." };

  const passwordHash = await hashPassword(password);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        failedLoginAttempts: 0,
        lockedUntil: null,
        // They just proved they control this inbox.
        emailVerifiedAt: new Date(),
      },
    }),
    // A reset should kick out whoever else is signed in (e.g. a thief).
    prisma.session.deleteMany({ where: { userId } }),
  ]);

  redirect("/login?reset=1");
}

export async function claimProfile(
  token: string,
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  if (!(await rateLimitIp("claim-submit", 10, RATE_WINDOWS.HOUR))) return { error: TOO_MANY };

  const name = String(formData.get("name") ?? "").trim().slice(0, 100);
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const acceptedTerms = formData.get("terms") === "on";

  const peeked = await peekEmailToken(token, "CLAIM_PROFILE");
  if (!peeked || peeked.user.passwordHash) {
    return { error: "This link is invalid or has expired. Try signing up again." };
  }
  if (!name) return { error: "Enter your name." };
  if (!acceptedTerms) return { error: "You need to agree to the Terms of Service and Privacy Policy." };
  const { dob: dateOfBirth, error: dobError } = checkDateOfBirth(
    String(formData.get("dateOfBirth") ?? "")
  );
  if (dobError || !dateOfBirth) return { error: dobError };
  const passwordError = await validateNewPassword(password);
  if (passwordError) return { error: passwordError };
  if (password !== confirmPassword) return { error: "Passwords don't match." };

  const userId = await consumeEmailToken(token, "CLAIM_PROFILE");
  if (!userId) return { error: "This link is invalid or has expired. Try signing up again." };

  await prisma.user.update({
    where: { id: userId },
    data: {
      name,
      passwordHash: await hashPassword(password),
      dateOfBirth,
      emailVerifiedAt: new Date(),
      termsAcceptedAt: new Date(),
    },
  });

  await createSessionCookie(userId);
  redirect("/");
}

export async function verifyEmail(token: string) {
  if (!(await rateLimitIp("verify-email", 20, RATE_WINDOWS.HOUR))) redirect("/login");
  const userId = await consumeEmailToken(token, "VERIFY_EMAIL");
  if (userId) {
    await prisma.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } });
  }
  redirect(userId ? "/?verified=1" : "/?verified=0");
}

export async function resendVerification(): Promise<AccountFormState> {
  const user = await getCurrentUser();
  if (!user?.email) return { error: "You must be signed in." };
  if (user.emailVerifiedAt) return { message: "Your email is already verified." };
  if (!isEmailConfigured()) return { error: "Email sending isn't set up yet." };
  if (!(await rateLimitUser(user.id, "resend-verify", 3, RATE_WINDOWS.HOUR))) {
    return { error: TOO_MANY };
  }
  await sendVerificationEmail(user.id, user.email);
  return { message: `Verification email sent to ${user.email}.` };
}

export async function updateProfile(
  _prevState: AccountFormState,
  formData: FormData
): Promise<AccountFormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!(await rateLimitUser(user.id, "profile", 20, RATE_WINDOWS.HOUR))) return { error: TOO_MANY };

  const name = String(formData.get("name") ?? "").trim().slice(0, 100);
  const email = String(formData.get("email") ?? "").trim().toLowerCase().slice(0, 200);
  const phone = String(formData.get("phone") ?? "").trim().slice(0, 30) || null;
  const photoUrlRaw = String(formData.get("photoUrl") ?? "").trim();
  const photoUrl = photoUrlRaw && isSafeHttpUrl(photoUrlRaw) ? photoUrlRaw : null;

  if (!name) return { error: "Name can't be empty." };
  if (!email || !EMAIL_PATTERN.test(email)) {
    return { error: "Enter a valid email address." };
  }

  const emailChanged = email !== user.email;
  if (emailChanged) {
    // Your email is where password resets go, so changing it is as sensitive
    // as changing the password: it needs the current password.
    const currentPassword = String(formData.get("currentPassword") ?? "");
    const ok =
      user.passwordHash &&
      currentPassword &&
      (await bcrypt.compare(currentPassword.slice(0, 200), user.passwordHash));
    if (!ok) return { error: "Enter your current password to change your email." };
  }

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        name,
        email,
        phone,
        photoUrl,
        ...(emailChanged ? { emailVerifiedAt: null } : {}),
      },
    });
  } catch (err) {
    if ((err as { code?: string }).code === "P2002") {
      return { error: "That email is already in use by another account." };
    }
    throw err;
  }

  if (emailChanged) {
    if (user.email) {
      await sendEmail({
        to: user.email,
        subject: "Your SportSync email was changed",
        text: `The email on your SportSync account was changed to ${email}. If this wasn't you, reset your password right away and contact support.`,
      });
    }
    await sendVerificationEmail(user.id, email);
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
  if (!(await rateLimitUser(user.id, "password", 5, 15 * RATE_WINDOWS.MINUTE))) {
    return { error: TOO_MANY };
  }

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { error: "Please fill in all fields." };
  }
  const passwordError = await validateNewPassword(newPassword);
  if (passwordError) return { error: passwordError };
  if (newPassword !== confirmPassword) {
    return { error: "New passwords don't match." };
  }

  const valid =
    user.passwordHash && (await bcrypt.compare(currentPassword.slice(0, 200), user.passwordHash));
  if (!valid) {
    return { error: "Current password is incorrect." };
  }

  const passwordHash = await hashPassword(newPassword);
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

export async function revokeSession(sessionId: string) {
  const user = await getCurrentUser();
  if (!user) return;
  await prisma.session.deleteMany({ where: { id: sessionId, userId: user.id } });
  revalidatePath("/account");
}

export async function revokeOtherSessions() {
  const user = await getCurrentUser();
  if (!user) return;
  const currentToken = await getCurrentSessionToken();
  await prisma.session.deleteMany({
    where: { userId: user.id, token: { not: currentToken ?? "" } },
  });
  revalidatePath("/account");
}

export async function deleteMyAccount(
  _prevState: AccountFormState,
  formData: FormData
): Promise<AccountFormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!(await rateLimitUser(user.id, "delete-account", 5, 15 * RATE_WINDOWS.MINUTE))) {
    return { error: TOO_MANY };
  }

  const password = String(formData.get("password") ?? "");
  if (!password) return { error: "Enter your password to confirm." };

  const valid =
    user.passwordHash && (await bcrypt.compare(password.slice(0, 200), user.passwordHash));
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
