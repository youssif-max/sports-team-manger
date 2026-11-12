"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { createSessionCookie, getCurrentUser, getCurrentSessionToken } from "@/lib/auth";
import { rateLimit, rateLimitIp, rateLimitUser, RATE_WINDOWS } from "@/lib/rateLimit";
import {
  decryptSecret,
  encryptSecret,
  generateRecoveryCodes,
  generateTotpSecret,
  hashRecoveryCode,
  isTwoFactorAvailable,
  otpauthUri,
  verifyTotp,
} from "@/lib/totp";
import {
  clearLoginChallenge,
  getLoginChallenge,
  MAX_CHALLENGE_ATTEMPTS,
} from "@/lib/loginChallenge";

export type TwoFactorState =
  | {
      error?: string;
      message?: string;
      // Setup step 1 result
      secret?: string;
      qr?: string;
      // Shown exactly once after enabling / regenerating
      recoveryCodes?: string[];
    }
  | undefined;

const TOO_MANY = "Too many attempts. Please wait a few minutes and try again.";

async function checkPassword(user: { passwordHash: string | null }, password: string) {
  return Boolean(user.passwordHash && (await bcrypt.compare(password.slice(0, 200), user.passwordHash)));
}

// Checks a TOTP code (consuming it so it can't be replayed) or a one-time
// recovery code. Returns which kind matched, or null.
async function consumeSecondFactor(
  user: { id: string; totpSecretEnc: string | null; totpLastStep: number | null; recoveryCodeHashes: string[] },
  input: string
): Promise<"totp" | "recovery" | null> {
  if (!user.totpSecretEnc) return null;
  const trimmed = input.trim();

  // Recovery codes are 10 characters, so exactly six digits can only be TOTP.
  if (/^\d{6}$/.test(trimmed.replace(/\s+/g, ""))) {
    const step = verifyTotp(decryptSecret(user.totpSecretEnc), trimmed, user.totpLastStep);
    if (step === null) return null;
    // Atomic: only the first request to present this step wins.
    const res = await prisma.user.updateMany({
      where: {
        id: user.id,
        OR: [{ totpLastStep: null }, { totpLastStep: { lt: step } }],
      },
      data: { totpLastStep: step },
    });
    return res.count === 1 ? "totp" : null;
  }

  const hash = hashRecoveryCode(trimmed);
  if (!user.recoveryCodeHashes.includes(hash)) return null;
  const res = await prisma.user.updateMany({
    where: { id: user.id, recoveryCodeHashes: { has: hash } },
    data: { recoveryCodeHashes: user.recoveryCodeHashes.filter((h) => h !== hash) },
  });
  return res.count === 1 ? "recovery" : null;
}

// ---- Sign-in second step ---------------------------------------------------

export async function verifyLoginChallenge(
  _prev: TwoFactorState,
  formData: FormData
): Promise<TwoFactorState> {
  const challenge = await getLoginChallenge();
  if (!challenge) {
    return { error: "That sign-in expired. Go back and sign in again." };
  }
  const user = challenge.user;

  // Per-IP and per-account caps, on top of the per-challenge attempt limit,
  // so re-entering the password to get a fresh challenge doesn't reset them.
  const allowed =
    (await rateLimitIp("2fa", 30, 15 * RATE_WINDOWS.MINUTE)) &&
    (await rateLimit(`2fa-user:${user.id}`, 10, RATE_WINDOWS.HOUR));
  if (!allowed) return { error: TOO_MANY };

  const code = String(formData.get("code") ?? "");
  const kind = code ? await consumeSecondFactor(user, code) : null;

  if (!kind) {
    const attempts = challenge.attempts + 1;
    if (attempts >= MAX_CHALLENGE_ATTEMPTS) {
      await clearLoginChallenge(challenge.id);
      return { error: "Too many incorrect codes. Please sign in again." };
    }
    await prisma.loginChallenge.update({ where: { id: challenge.id }, data: { attempts } });
    return { error: "That code isn't right. Check your authenticator app and try again." };
  }

  const target = challenge.redirectTo ?? "/";
  await clearLoginChallenge(challenge.id);
  await createSessionCookie(user.id);
  redirect(target.startsWith("/") && !target.startsWith("//") ? target : "/");
}

// ---- Setup / management (account page) -------------------------------------

export async function beginTwoFactorSetup(): Promise<TwoFactorState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isTwoFactorAvailable()) return { error: "Two-factor sign-in isn't available right now." };
  if (user.totpEnabledAt) return { error: "Two-factor sign-in is already on." };
  if (!user.email) return { error: "Add an email to your account first." };
  if (!(await rateLimitUser(user.id, "2fa-setup", 10, RATE_WINDOWS.HOUR))) return { error: TOO_MANY };

  const secret = generateTotpSecret();
  // Stored (encrypted) but inactive until a correct code is entered.
  await prisma.user.update({ where: { id: user.id }, data: { totpSecretEnc: encryptSecret(secret) } });
  const qr = await QRCode.toDataURL(otpauthUri(secret, user.email), { margin: 1, width: 220 });
  return { secret, qr };
}

export async function confirmTwoFactorSetup(
  _prev: TwoFactorState,
  formData: FormData
): Promise<TwoFactorState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.totpEnabledAt) return { error: "Two-factor sign-in is already on." };
  if (!user.totpSecretEnc) return { error: "Start setup again." };
  if (!(await rateLimitUser(user.id, "2fa-confirm", 10, 15 * RATE_WINDOWS.MINUTE))) {
    return { error: TOO_MANY };
  }

  const step = verifyTotp(decryptSecret(user.totpSecretEnc), String(formData.get("code") ?? ""), null);
  if (step === null) return { error: "That code isn't right. Check your authenticator app and try again." };

  const recoveryCodes = generateRecoveryCodes();
  const currentToken = await getCurrentSessionToken();
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        totpEnabledAt: new Date(),
        totpLastStep: step,
        recoveryCodeHashes: recoveryCodes.map(hashRecoveryCode),
      },
    }),
    // Any other signed-in device was authenticated without the second factor.
    prisma.session.deleteMany({ where: { userId: user.id, token: { not: currentToken ?? "" } } }),
  ]);

  revalidatePath("/account");
  return { message: "Two-factor sign-in is on.", recoveryCodes };
}

export async function disableTwoFactor(
  _prev: TwoFactorState,
  formData: FormData
): Promise<TwoFactorState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.totpEnabledAt) return { error: "Two-factor sign-in isn't on." };
  if (!(await rateLimitUser(user.id, "2fa-disable", 5, 15 * RATE_WINDOWS.MINUTE))) {
    return { error: TOO_MANY };
  }

  if (!(await checkPassword(user, String(formData.get("password") ?? "")))) {
    return { error: "Incorrect password." };
  }
  if (!(await consumeSecondFactor(user, String(formData.get("code") ?? "")))) {
    return { error: "That code isn't right." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { totpSecretEnc: null, totpEnabledAt: null, totpLastStep: null, recoveryCodeHashes: [] },
  });
  revalidatePath("/account");
  return { message: "Two-factor sign-in is off." };
}

export async function regenerateRecoveryCodes(
  _prev: TwoFactorState,
  formData: FormData
): Promise<TwoFactorState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.totpEnabledAt) return { error: "Two-factor sign-in isn't on." };
  if (!(await rateLimitUser(user.id, "2fa-recovery", 5, 15 * RATE_WINDOWS.MINUTE))) {
    return { error: TOO_MANY };
  }

  if (!(await checkPassword(user, String(formData.get("password") ?? "")))) {
    return { error: "Incorrect password." };
  }

  const recoveryCodes = generateRecoveryCodes();
  await prisma.user.update({
    where: { id: user.id },
    data: { recoveryCodeHashes: recoveryCodes.map(hashRecoveryCode) },
  });
  revalidatePath("/account");
  return { message: "New recovery codes created. The old ones no longer work.", recoveryCodes };
}
