import Link from "next/link";
import { Sparkles } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { isTeamPremium } from "@/lib/billing";
import { formatDate } from "@/lib/format";

export default async function AnalyticsPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const team = await prisma.team.findUniqueOrThrow({ where: { id: teamId } });

  if (!isTeamPremium(team)) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 rounded-xl border border-neutral-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-900">
        <Sparkles size={28} className="text-amber-500" />
        <h1 className="text-lg font-bold">Advanced Analytics is a Premium feature</h1>
        <p className="text-sm text-neutral-500">
          See season-long leaderboards per stat and a game-by-game trend for your team, beyond
          the running totals on each player&apos;s profile.
        </p>
        <Link
          href={`/teams/${teamId}/premium`}
          className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
        >
          Upgrade to Premium
        </Link>
      </div>
    );
  }

  const [statDefs, gameStats] = await Promise.all([
    prisma.statDefinition.findMany({ where: { teamId }, orderBy: { name: "asc" } }),
    prisma.gameStat.findMany({
      where: { event: { teamId } },
      include: { user: true, statDefinition: true, event: true },
      orderBy: { event: { startsAt: "desc" } },
    }),
  ]);

  const leaderboards = statDefs.map((sd) => {
    const totals = new Map<string, { name: string; value: number }>();
    for (const gs of gameStats) {
      if (gs.statDefinitionId !== sd.id) continue;
      const entry = totals.get(gs.userId) ?? { name: gs.user.name, value: 0 };
      entry.value += gs.value;
      totals.set(gs.userId, entry);
    }
    const ranked = [...totals.values()].sort((a, b) => b.value - a.value).slice(0, 5);
    return { stat: sd, ranked };
  });

  const eventOrder: string[] = [];
  const eventMeta = new Map<string, { title: string; startsAt: Date; opponent: string | null }>();
  const perEventTotals = new Map<string, Map<string, number>>();
  for (const gs of gameStats) {
    if (!eventMeta.has(gs.eventId)) {
      eventMeta.set(gs.eventId, {
        title: gs.event.title,
        startsAt: gs.event.startsAt,
        opponent: gs.event.opponent,
      });
      eventOrder.push(gs.eventId);
      perEventTotals.set(gs.eventId, new Map());
    }
    const totals = perEventTotals.get(gs.eventId)!;
    totals.set(gs.statDefinitionId, (totals.get(gs.statDefinitionId) ?? 0) + gs.value);
  }
  const recentEvents = eventOrder.slice(0, 6);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Sparkles size={18} className="text-amber-500" />
        <h1 className="text-xl font-bold">Analytics</h1>
      </div>

      {statDefs.length === 0 ? (
        <p className="text-sm text-neutral-400">
          No stat categories set up for this team yet.
        </p>
      ) : (
        <>
          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase text-neutral-400">
              Season Leaderboards
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {leaderboards.map(({ stat, ranked }) => (
                <div
                  key={stat.id}
                  className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
                >
                  <h3 className="mb-2 text-sm font-semibold">{stat.name}</h3>
                  {ranked.length === 0 ? (
                    <p className="text-xs text-neutral-400">No stats recorded yet.</p>
                  ) : (
                    <ol className="flex flex-col gap-1.5">
                      {ranked.map((r, i) => (
                        <li key={r.name} className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-neutral-400">
                              {i + 1}
                            </span>
                            {r.name}
                          </span>
                          <span className="font-semibold">{r.value}</span>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase text-neutral-400">
              Recent Game Trend
            </h2>
            {recentEvents.length === 0 ? (
              <p className="text-sm text-neutral-400">No game stats recorded yet.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
                <table className="w-full min-w-max text-sm">
                  <thead>
                    <tr className="border-b border-neutral-100 text-left text-xs text-neutral-400 dark:border-neutral-800">
                      <th className="px-4 py-2">Game</th>
                      {statDefs.map((sd) => (
                        <th key={sd.id} className="px-4 py-2">
                          {sd.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recentEvents.map((eventId) => {
                      const meta = eventMeta.get(eventId)!;
                      const totals = perEventTotals.get(eventId)!;
                      return (
                        <tr key={eventId} className="border-b border-neutral-50 last:border-0 dark:border-neutral-800/50">
                          <td className="px-4 py-2">
                            <p className="font-medium">
                              {meta.title}
                              {meta.opponent ? ` vs ${meta.opponent}` : ""}
                            </p>
                            <p className="text-xs text-neutral-500">{formatDate(meta.startsAt)}</p>
                          </td>
                          {statDefs.map((sd) => (
                            <td key={sd.id} className="px-4 py-2">
                              {totals.get(sd.id) ?? 0}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
