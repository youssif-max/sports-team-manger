import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "uid";

export async function getCurrentUser() {
  const store = await cookies();
  const uid = store.get(COOKIE_NAME)?.value;
  if (!uid) return null;

  const user = await prisma.user.findUnique({ where: { id: uid } });
  return user;
}

export async function setCurrentUserCookie(userId: string) {
  const store = await cookies();
  store.set(COOKIE_NAME, userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function clearCurrentUserCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getMembership(teamId: string, userId: string) {
  return prisma.teamMembership.findUnique({
    where: { teamId_userId: { teamId, userId } },
  });
}
