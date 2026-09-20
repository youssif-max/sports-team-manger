import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";

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
      acc.pointsFor += r.teamScore;
      acc.pointsAgainst += r.opponentScore;
      return acc;
    },
    { wins: 0, losses: 0, ties: 0, pointsFor: 0, pointsAgainst: 0 }
  );

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold">Standings</h1>

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
          <p className="text-sm text-neutral-400">No results recorded yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {results.map((r) => (
              <Link
                key={r.id}
                href={`/teams/${teamId}/schedule/${r.eventId}`}
                className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-3 text-sm hover:shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
              >
                <div>
                  <p className="font-medium">
                    {r.event.title}
                    {r.event.opponent ? ` vs ${r.event.opponent}` : ""}
                  </p>
                  <p className="text-xs text-neutral-500">{formatDate(r.event.startsAt)}</p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    r.outcome === "WIN"
                      ? "bg-green-100 text-green-700"
                      : r.outcome === "LOSS"
                      ? "bg-red-100 text-red-700"
                      : "bg-neutral-100 text-neutral-600"
                  }`}
                >
                  {r.outcome} {r.teamScore}-{r.opponentScore}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
