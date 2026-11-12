import { cookies } from "next/headers";
import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

// Between "password was right" and "second factor was right" the browser holds
// only this short-lived, single-purpose cookie — it grants no access on its own.

const COOKIE_NAME = process.env.NODE_ENV === "production" ? "__Host-2fa" : "twofa";
const CHALLENGE_MS = 5 * 60 * 1000;
export const MAX_CHALLENGE_ATTEMPTS = 5;

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createLoginChallenge(userId: string, redirectTo: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + CHALLENGE_MS);

  // One live challenge per user is plenty.
  await prisma.loginChallenge.deleteMany({ where: { userId } });
  await prisma.loginChallenge.create({
    data: { userId, tokenHash: hash(token), redirectTo, expiresAt },
  });

  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function getLoginChallenge() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  const challenge = await prisma.loginChallenge.findUnique({
    where: { tokenHash: hash(token) },
    include: { user: true },
  });
  if (!challenge) return null;
  if (challenge.expiresAt < new Date()) {
    await prisma.loginChallenge.delete({ where: { id: challenge.id } }).catch(() => undefined);
    return null;
  }
  return challenge;
}

export async function clearLoginChallenge(challengeId?: string) {
  if (challengeId) {
    await prisma.loginChallenge.deleteMany({ where: { id: challengeId } });
  }
  (await cookies()).delete(COOKIE_NAME);
}
