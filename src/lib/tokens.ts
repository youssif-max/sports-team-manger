import { createHash, randomBytes } from "crypto";
import type { EmailTokenType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const TOKEN_TTL_MS: Record<EmailTokenType, number> = {
  VERIFY_EMAIL: 1000 * 60 * 60 * 24 * 3,
  RESET_PASSWORD: 1000 * 60 * 60,
  CLAIM_PROFILE: 1000 * 60 * 60 * 24,
};

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

// The raw token only ever exists in the email; the database holds a hash, so
// a leaked database can't be used to reset anyone's password.
export async function createEmailToken(userId: string, type: EmailTokenType): Promise<string> {
  const raw = randomBytes(32).toString("hex");

  // Only the newest link of each kind should work.
  await prisma.emailToken.deleteMany({ where: { userId, type } });
  await prisma.emailToken.create({
    data: {
      userId,
      type,
      tokenHash: hashToken(raw),
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS[type]),
    },
  });
  // Opportunistic cleanup of dead tokens.
  if (Math.random() < 0.02) {
    void prisma.emailToken
      .deleteMany({ where: { OR: [{ expiresAt: { lt: new Date() } }, { usedAt: { not: null } }] } })
      .catch(() => undefined);
  }
  return raw;
}

// Look at a token without using it (to render the right page).
export async function peekEmailToken(raw: string, type: EmailTokenType) {
  if (!/^[a-f0-9]{64}$/.test(raw)) return null;
  const token = await prisma.emailToken.findUnique({
    where: { tokenHash: hashToken(raw) },
    include: { user: true },
  });
  if (!token || token.type !== type || token.usedAt || token.expiresAt < new Date()) return null;
  return token;
}

// Atomically marks the token used so it can only ever succeed once, even if
// two requests race. Returns the user id, or null if invalid/used/expired.
export async function consumeEmailToken(raw: string, type: EmailTokenType): Promise<string | null> {
  if (!/^[a-f0-9]{64}$/.test(raw)) return null;
  const tokenHash = hashToken(raw);
  const claimed = await prisma.emailToken.updateMany({
    where: { tokenHash, type, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });
  if (claimed.count !== 1) return null;
  const token = await prisma.emailToken.findUnique({ where: { tokenHash } });
  return token?.userId ?? null;
}
