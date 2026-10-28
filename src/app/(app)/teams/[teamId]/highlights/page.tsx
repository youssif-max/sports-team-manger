import Link from "next/link";
import { Sparkles } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getMembership } from "@/lib/auth";
import { HighlightForm } from "@/components/HighlightForm";
import { HighlightCard } from "@/components/HighlightCard";
import { isTeamPremium, FREE_HIGHLIGHT_LIMIT } from "@/lib/billing";

export default async function HighlightsPage({
  params,
  searchParams,
}: {
  params: Promise<{ teamId: string }>;
  searchParams: Promise<{ player?: string }>;
}) {
  const { teamId } = await params;
  const { player: playerFilter } = await searchParams;

  const [highlights, players, team, user] = await Promise.all([
    prisma.highlight.findMany({
      where: { teamId },
      include: { user: true, postedBy: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.teamMembership.findMany({
      where: { teamId, role: "PLAYER" },
      include: { user: true },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.team.findUniqueOrThrow({ where: { id: teamId } }),
    getCurrentUser(),
  ]);

  const membership = user ? await getMembership(teamId, user.id) : null;
  const isPrivileged = membership?.role === "ADMIN" || membership?.role === "COACH";
  const premium = isTeamPremium(team);
  const atLimit = !premium && highlights.length >= FREE_HIGHLIGHT_LIMIT;

  // Reel chips: only players who actually have a tagged clip.
  const reelPlayers = new Map<string, string>();
  for (const h of highlights) if (h.user) reelPlayers.set(h.user.id, h.user.name);

  const activeReelName = playerFilter ? reelPlayers.get(playerFilter) : undefined;
  const visible = activeReelName
    ? highlights.filter((h) => h.userId === playerFilter)
    : highlights;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold">Highlights &amp; Film</h1>

      {atLimit ? (
        <div className="flex flex-col items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-900 dark:bg-amber-950/30">
          <p className="flex items-center gap-1.5 font-semibold text-amber-900 dark:text-amber-200">
            <Sparkles size={16} /> Free plan limit reached
          </p>
          <p className="text-amber-800 dark:text-amber-300">
            This team has posted {highlights.length}/{FREE_HIGHLIGHT_LIMIT} highlights on the free
            plan. Upgrade to Premium for unlimited highlights.
          </p>
          <Link
            href={`/teams/${teamId}/premium`}
            className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
          >
            Upgrade to Premium
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <HighlightForm
            mode="team"
            teamId={teamId}
            players={isPrivileged ? players.map((p) => ({ userId: p.userId, name: p.user.name })) : []}
          />
          {!premium && (
            <p className="text-xs text-neutral-400">
              {highlights.length}/{FREE_HIGHLIGHT_LIMIT} highlights used on the free plan.
              {!isPrivileged && membership?.role === "PLAYER" ? " Your posts are tagged to you." : ""}
            </p>
          )}
        </div>
      )}

      {reelPlayers.size > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/teams/${teamId}/highlights`}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              !activeReelName
                ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                : "border border-neutral-300 text-neutral-600 dark:border-neutral-700 dark:text-neutral-300"
            }`}
          >
            All
          </Link>
          {[...reelPlayers.entries()].map(([id, name]) => (
            <Link
              key={id}
              href={`/teams/${teamId}/highlights?player=${id}`}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                playerFilter === id
                  ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                  : "border border-neutral-300 text-neutral-600 dark:border-neutral-700 dark:text-neutral-300"
              }`}
            >
              {name}
            </Link>
          ))}
        </div>
      )}

      {activeReelName && (
        <p className="text-sm font-semibold">
          {activeReelName}&apos;s reel · {visible.length} clip{visible.length === 1 ? "" : "s"}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {visible.length === 0 && (
          <p className="text-sm text-neutral-400">No highlights posted yet.</p>
        )}
        {visible.map((h) => (
          <HighlightCard
            key={h.id}
            h={{
              id: h.id,
              teamId,
              title: h.title,
              description: h.description,
              videoUrl: h.videoUrl,
              startSeconds: h.startSeconds,
              endSeconds: h.endSeconds,
              createdAt: h.createdAt,
              player: h.user
                ? { id: h.user.id, name: h.user.name, photoUrl: h.user.photoUrl }
                : null,
              postedByName: h.postedBy?.name ?? null,
            }}
            canDelete={isPrivileged || h.postedById === user?.id}
          />
        ))}
      </div>
    </div>
  );
}
