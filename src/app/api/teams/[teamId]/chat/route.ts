import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getMembership } from "@/lib/auth";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const { teamId } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const membership = await getMembership(teamId, user.id);
  if (!membership) {
    return NextResponse.json({ error: "Not a member of this team" }, { status: 403 });
  }

  const messages = await prisma.chatMessage.findMany({
    where: { teamId },
    include: { author: true },
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  return NextResponse.json({
    messages: messages.map((m) => ({
      id: m.id,
      body: m.body,
      createdAt: m.createdAt,
      author: { id: m.author.id, name: m.author.name, photoUrl: m.author.photoUrl },
    })),
  });
}
