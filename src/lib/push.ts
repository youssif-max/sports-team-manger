import webpush from "web-push";
import { prisma } from "@/lib/prisma";

// Deliberately NOT in a "use server" file: every export of those is a
// publicly callable endpoint, and this one can message an entire team.

function ensureVapidConfigured() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT_EMAIL;
  if (!publicKey || !privateKey || !subject) return false;

  webpush.setVapidDetails(`mailto:${subject}`, publicKey, privateKey);
  return true;
}

export async function sendPushToTeam(
  teamId: string,
  payload: { title: string; body: string; url?: string },
  excludeUserId?: string
) {
  if (!ensureVapidConfigured()) return;

  const memberships = await prisma.teamMembership.findMany({
    where: { teamId, ...(excludeUserId ? { userId: { not: excludeUserId } } : {}) },
    include: { user: { include: { pushSubscriptions: true } } },
  });

  const subs = memberships.flatMap((m) => m.user.pushSubscriptions);
  const body = JSON.stringify(payload);

  await Promise.allSettled(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          body
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => undefined);
        }
      }
    })
  );
}
