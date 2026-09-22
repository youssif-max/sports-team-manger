import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import { setGameOutcome } from "@/lib/actions/schedule";

export default async function StandingsPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;

  const results = await prisma.gameResult.findMany({
    where: { event: { teamId } },
    include: { event: true },
    orderBy: { event: { startsAt: "desc" } },
  });

  const record = results.reduce(
    (acc, r) => {
      if (r.outcome === "WIN") acc.wins++;
      else if (r.outcome === "LOSS") acc.losses++;
      else acc.ties++;
      acc.pointsFor += r.teamScore ?? 0;
      acc.pointsAgainst += r.opponentScore ?? 0;
      return acc;
    },
    { wins: 0, losses: 0, ties: 0, pointsFor: 0, pointsAgainst: 0 }
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Standings</h1>
        <Link
          href={`/teams/${teamId}/gamedays`}
          className="text-xs font-medium text-brand-600 hover:underline"
        >
          Log results on Game Days →
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-neutral-200 bg-white p-4 text-center dark:border-neutral-800 dark:bg-neutral-900">
          <p className="text-2xl font-bold">
            {record.wins}-{record.losses}-{record.ties}
          </p>
          <p className="text-xs text-neutral-500">Record</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4 text-center dark:border-neutral-800 dark:bg-neutral-900">
          <p className="text-2xl font-bold">{record.pointsFor}</p>
          <p className="text-xs text-neutral-500">Scored</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4 text-center dark:border-neutral-800 dark:bg-neutral-900">
          <p className="text-2xl font-bold">{record.pointsAgainst}</p>
          <p className="text-xs text-neutral-500">Allowed</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4 text-center dark:border-neutral-800 dark:bg-neutral-900">
          <p className="text-2xl font-bold">{record.pointsFor - record.pointsAgainst}</p>
          <p className="text-xs text-neutral-500">Differential</p>
        </div>
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase text-neutral-400">
          Game Log
        </h2>
        {results.length === 0 ? (
          <p className="text-sm text-neutral-400">
            No results recorded yet. Head to Game Days to log a win or loss.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {results.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-3 text-sm dark:border-neutral-800 dark:bg-neutral-900"
              >
                <Link
                  href={`/teams/${teamId}/schedule/${r.eventId}`}
                  className="hover:underline"
                >
                  <p className="font-medium">
                    {r.event.title}
                    {r.event.opponent ? ` vs ${r.event.opponent}` : ""}
                  </p>
                  <p className="text-xs text-neutral-500">{formatDate(r.event.startsAt)}</p>
                </Link>
                <div className="flex items-center gap-1.5">
                  {r.teamScore != null && r.opponentScore != null && (
                    <span className="text-xs font-medium text-neutral-500">
                      {r.teamScore}-{r.opponentScore}
                    </span>
                  )}
                  {(["WIN", "LOSS", "TIE"] as const).map((o) => (
                    <form key={o} action={setGameOutcome.bind(null, teamId, r.eventId, o)}>
                      <button
                        type="submit"
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          r.outcome === o
                            ? o === "WIN"
                              ? "bg-green-600 text-white"
                              : o === "LOSS"
                              ? "bg-red-600 text-white"
                              : "bg-neutral-600 text-white"
                            : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200 dark:bg-neutral-800"
                        }`}
                      >
                        {o === "WIN" ? "W" : o === "LOSS" ? "L" : "T"}
                      </button>
                    </form>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
