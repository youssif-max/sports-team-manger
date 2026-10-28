"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { rateLimitUser, RATE_WINDOWS } from "@/lib/rateLimit";

export async function saveSubscription(subscription: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}) {
  const user = await getCurrentUser();
  if (!user) return;
  if (!(await rateLimitUser(user.id, "push-save", 20, RATE_WINDOWS.HOUR))) return;

  const { endpoint, keys } = subscription;
  if (
    typeof endpoint !== "string" ||
    !endpoint.startsWith("https://") ||
    endpoint.length > 1000 ||
    typeof keys?.p256dh !== "string" ||
    typeof keys?.auth !== "string"
  ) {
    return;
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { userId: user.id, p256dh: keys.p256dh, auth: keys.auth },
    create: { userId: user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth },
  });
}

export async function removeSubscription(endpoint: string) {
  const user = await getCurrentUser();
  if (!user) return;
  if (!(await rateLimitUser(user.id, "push-remove", 20, RATE_WINDOWS.HOUR))) return;

  await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: user.id } });
}
