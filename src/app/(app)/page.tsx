import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { JoinTeamForm } from "@/components/JoinTeamForm";
import { HighlightForm } from "@/components/HighlightForm";
import { HighlightCard } from "@/components/HighlightCard";
import { NotificationPrompt } from "@/components/NotificationPrompt";
import { teamTypeLabel } from "@/lib/format";
import { getBlockedIds } from "@/lib/blocks";
import { cancelJoinRequest } from "@/lib/actions/team";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; verified?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { error, verified } = await searchParams;
  const blockedIds = await getBlockedIds(user.id);

  const myTeams = await prisma.team.findMany({
    where: { memberships: { some: { userId: user.id } } },
    include: { _count: { select: { memberships: true } } },
    orderBy: { createdAt: "desc" },
  });

  const roleByTeam = new Map(
    (
      await prisma.teamMembership.findMany({
        where: { userId: user.id },
        select: { teamId: true, role: true },
      })
    ).map((m) => [m.teamId, m.role])
  );
  const pendingRequests = await prisma.joinRequest.findMany({
    where: { userId: user.id },
    include: { team: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  const feed =
    myTeams.length > 0
      ? await prisma.highlight.findMany({
          where: {
            teamId: { in: myTeams.map((t) => t.id) },
            ...(blockedIds.length ? { NOT: { postedById: { in: blockedIds } } } : {}),
          },
          include: { user: true, postedBy: true, team: true },
          orderBy: { createdAt: "desc" },
          take: 12,
        })
      : [];

  return (
    <>
      <NotificationPrompt />

      {verified === "1" && (
        <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800 dark:bg-green-950 dark:text-green-200">
          Email confirmed. Thanks!
        </div>
      )}
      {verified === "0" && (
        <div className="rounded-lg bg-yellow-50 px-4 py-3 text-sm text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200">
          That confirmation link has expired. Request a new one from the banner above.
        </div>
      )}

      {pendingRequests.length > 0 && (
        <section className="flex flex-col gap-2 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100">
          <p className="font-semibold">Waiting for approval</p>
          {pendingRequests.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3">
              <span>
                {r.team.name} — a coach or admin needs to let you in.
              </span>
              <form action={cancelJoinRequest.bind(null, r.id)}>
                <button type="submit" className="text-xs font-medium underline">
                  Cancel request
                </button>
              </form>
            </div>
          ))}
        </section>
      )}

      {error === "not-a-member" && (
        <div className="rounded-lg bg-yellow-50 px-4 py-3 text-sm text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200">
          You&apos;re not a member of that team. Ask its admin or coach for the join code.
        </div>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-xl font-bold">My Teams</h1>
          <Link
            href="/teams/new"
            className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            + Create Team
          </Link>
        </div>

        {myTeams.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500 dark:border-neutral-700">
            You haven&apos;t joined a team yet. Create one, or join one below.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {myTeams.map((team) => (
              <Link
                key={team.id}
                href={`/teams/${team.id}`}
                className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900"
                style={{ borderLeft: `6px solid ${team.colorPrimary}` }}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{team.name}</h3>
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium capitalize text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                    {team.sport}
                  </span>
                </div>
                <p className="mt-1 text-xs text-neutral-500">
                  {teamTypeLabel(team.teamType)}
                  {team.season ? ` · ${team.season}` : ""} · {team._count.memberships} members
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {myTeams.length > 0 && (
        <section className="flex flex-col gap-3">
          <div>
            <h2 className="text-xl font-bold">Highlight Feed</h2>
            <p className="text-xs text-neutral-500">
              Post your best plays for your coaches and teammates. Only members of your teams can
              see these.
            </p>
          </div>
          <HighlightForm mode="feed" teams={myTeams.map((t) => ({ id: t.id, name: t.name }))} />
          {feed.length === 0 ? (
            <p className="text-sm text-neutral-400">No highlights yet — be the first to post one.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {feed.map((h) => {
                const role = roleByTeam.get(h.teamId);
                return (
                  <HighlightCard
                    key={h.id}
                    showTeam
                    h={{
                      id: h.id,
                      teamId: h.teamId,
                      teamName: h.team.name,
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
                    canDelete={role === "ADMIN" || role === "COACH" || h.postedById === user.id}
                    canReport={h.postedById !== user.id}
                  />
                );
              })}
            </div>
          )}
        </section>
      )}

      <section>
        <JoinTeamForm />
      </section>
    </>
  );
}
