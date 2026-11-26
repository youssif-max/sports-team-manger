import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getBlockedIds } from "@/lib/blocks";
import { toEmbedUrl } from "@/lib/video";
import { formatDate } from "@/lib/format";
import { PublicFeed, type FeedItem } from "@/components/PublicFeed";

export const metadata: Metadata = { title: "Highlights — SportSync" };

const PAGE_SIZE = 10;

export default async function PublicHighlightsPage({
  searchParams,
}: {
  searchParams: Promise<{ before?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { before } = await searchParams;
  const cursor = before ? new Date(before) : null;
  const validCursor = cursor && !Number.isNaN(cursor.getTime()) ? cursor : null;

  const blockedIds = await getBlockedIds(user.id);

  // Only posts the poster explicitly made public, not auto-hidden after reports,
  // and not from anyone this viewer blocked.
  const rows = await prisma.highlight.findMany({
    where: {
      visibility: "PUBLIC",
      hiddenAt: null,
      ...(validCursor ? { createdAt: { lt: validCursor } } : {}),
      ...(blockedIds.length ? { NOT: { postedById: { in: blockedIds } } } : {}),
    },
    select: {
      id: true,
      teamId: true,
      title: true,
      description: true,
      videoUrl: true,
      uploaded: true,
      createdAt: true,
      postedById: true,
      postedBy: { select: { name: true } },
      team: { select: { sport: true } },
    },
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE + 1,
  });

  const hasMore = rows.length > PAGE_SIZE;
  const page = rows.slice(0, PAGE_SIZE);

  // Coaches/admins can remove anything in their own team, even from here.
  const roles = new Map(
    (
      await prisma.teamMembership.findMany({
        where: { userId: user.id, teamId: { in: [...new Set(page.map((r) => r.teamId))] } },
        select: { teamId: true, role: true },
      })
    ).map((m) => [m.teamId, m.role])
  );

  // Only ever send the minimum to the browser: first name, sport, the media.
  const items: FeedItem[] = page.flatMap((r) => {
    const embedUrl = r.uploaded ? null : toEmbedUrl(r.videoUrl);
    if (!r.uploaded && !embedUrl) return []; // unsupported link: never shown publicly
    const role = roles.get(r.teamId);
    return [
      {
        id: r.id,
        teamId: r.teamId,
        title: r.title,
        description: r.description,
        posterId: r.postedById,
        posterFirstName: r.postedBy?.name.trim().split(/\s+/)[0] ?? "Player",
        sport: r.team.sport,
        dateLabel: formatDate(r.createdAt),
        fileUrl: r.uploaded ? r.videoUrl : null,
        embedUrl,
        canDelete: r.postedById === user.id || role === "ADMIN" || role === "COACH",
        canReport: r.postedById !== user.id,
      },
    ];
  });

  const olderHref = hasMore
    ? `/highlights?before=${encodeURIComponent(page[page.length - 1].createdAt.toISOString())}`
    : null;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Highlights</h1>
          <p className="text-xs text-neutral-500">Shared by players across SportSync. Scroll for more.</p>
        </div>
        <Link
          href="/"
          className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
        >
          Post yours
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500 dark:border-neutral-700">
          No public highlights yet. Post one from your home page and choose{" "}
          <strong>Everyone on SportSync</strong> to be the first.
        </div>
      ) : (
        <PublicFeed items={items} olderHref={olderHref} />
      )}
    </div>
  );
}
