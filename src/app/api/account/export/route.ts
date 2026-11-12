import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { rateLimitUser, RATE_WINDOWS } from "@/lib/rateLimit";

// A copy of the personal data we hold about the signed-in user (a privacy
// "right of access" request). Password hashes and session tokens are
// deliberately left out.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!(await rateLimitUser(user.id, "export", 5, RATE_WINDOWS.HOUR))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const [memberships, rsvps, attendance, gameStats, chatMessages, announcements, highlights, plays, blocks, reports, sessions] =
    await Promise.all([
      prisma.teamMembership.findMany({ where: { userId: user.id }, include: { team: { select: { name: true, sport: true } } } }),
      prisma.rsvp.findMany({ where: { userId: user.id } }),
      prisma.attendance.findMany({ where: { userId: user.id } }),
      prisma.gameStat.findMany({ where: { userId: user.id } }),
      prisma.chatMessage.findMany({ where: { authorId: user.id }, select: { teamId: true, body: true, createdAt: true } }),
      prisma.announcement.findMany({ where: { authorId: user.id }, select: { teamId: true, title: true, body: true, createdAt: true } }),
      prisma.highlight.findMany({
        where: { OR: [{ postedById: user.id }, { userId: user.id }] },
        select: { teamId: true, title: true, description: true, videoUrl: true, startSeconds: true, endSeconds: true, createdAt: true },
      }),
      prisma.play.findMany({ where: { createdById: user.id }, select: { teamId: true, title: true, description: true, fileUrl: true, createdAt: true } }),
      prisma.block.findMany({ where: { blockerId: user.id }, select: { blockedId: true, createdAt: true } }),
      prisma.report.findMany({ where: { reporterId: user.id }, select: { teamId: true, targetType: true, reason: true, status: true, createdAt: true } }),
      prisma.session.findMany({ where: { userId: user.id }, select: { userAgent: true, createdAt: true, expiresAt: true } }),
    ]);

  const body = {
    exportedAt: new Date().toISOString(),
    account: {
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: Boolean(user.emailVerifiedAt),
      phone: user.phone,
      photoUrl: user.photoUrl,
      dateOfBirth: user.dateOfBirth,
      termsAcceptedAt: user.termsAcceptedAt,
      createdAt: user.createdAt,
    },
    teamMemberships: memberships.map((m) => ({
      team: m.team.name,
      sport: m.team.sport,
      role: m.role,
      jerseyNumber: m.jerseyNumber,
      position: m.position,
      emergencyContactName: m.emergencyContactName,
      emergencyContactPhone: m.emergencyContactPhone,
      joinedAt: m.joinedAt,
    })),
    rsvps,
    attendance,
    gameStats,
    chatMessages,
    announcements,
    highlights,
    plays,
    blockedUserIds: blocks,
    reportsFiled: reports,
    signedInDevices: sessions,
  };

  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="sportsync-my-data.json"',
      "Cache-Control": "no-store",
    },
  });
}
