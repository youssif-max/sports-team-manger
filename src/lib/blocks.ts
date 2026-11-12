import { prisma } from "@/lib/prisma";

// Ids of people this user has blocked. Their chat messages and highlights are
// hidden from the blocker.
export async function getBlockedIds(userId: string): Promise<string[]> {
  const blocks = await prisma.block.findMany({
    where: { blockerId: userId },
    select: { blockedId: true },
  });
  return blocks.map((b) => b.blockedId);
}
