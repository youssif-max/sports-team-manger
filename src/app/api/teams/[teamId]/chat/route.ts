import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const { teamId } = await params;

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
