import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

const COOKIE_NAME = "session";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

export async function getCurrentUser() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session) return null;

  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }

  return session.user;
}

// Creates a brand new opaque session token tied to this user and sets it as
// the auth cookie. The cookie never contains the user's id directly, so a
// leaked/guessed id alone can't be used to impersonate someone.
export async function createSessionCookie(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await prisma.session.create({ data: { token, userId, expiresAt } });

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearCurrentUserSession() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { token } }).catch(() => undefined);
  }
  store.delete(COOKIE_NAME);
}

export async function getMembership(teamId: string, userId: string) {
  return prisma.teamMembership.findUnique({
    where: { teamId_userId: { teamId, userId } },
  });
}

export class AuthError extends Error {}

// Throws if there's no signed-in user, or they aren't a member of the team
// with one of the allowed roles. Server actions should call this before any
// mutation that isn't meant to be open to any authenticated visitor — never
// rely on a button simply being hidden in the UI as the only protection.
export async function requireRole(teamId: string, allowed: Role[]) {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("You must be signed in.");

  const membership = await getMembership(teamId, user.id);
  if (!membership || !allowed.includes(membership.role)) {
    throw new AuthError("You don't have permission to do that.");
  }

  return { user, membership };
}

// Same as requireRole, but any team role is acceptable — just confirms the
// caller is actually a member of this team before touching its data.
export async function requireMembership(teamId: string) {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("You must be signed in.");

  const membership = await getMembership(teamId, user.id);
  if (!membership) throw new AuthError("You don't have permission to do that.");

  return { user, membership };
}
