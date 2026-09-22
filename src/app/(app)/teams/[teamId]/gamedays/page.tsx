import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import { setGameOutcome, clearGameOutcome } from "@/lib/actions/schedule";

export default async function GameDaysPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;

  const games = await prisma.event.findMany({
    where: { teamId, type: "GAME" },
    include: { result: true },
    orderBy: { startsAt: "desc" },
  });

  const record = games.reduce(
    (acc, g) => {
      if (g.result?.outcome === "WIN") acc.wins++;
      else if (g.result?.outcome === "LOSS") acc.losses++;
      else if (g.result?.outcome === "TIE") acc.ties++;
      return acc;
    },
    { wins: 0, losses: 0, ties: 0 }
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Game Days</h1>
        <p className="text-sm font-semibold text-neutral-500">
          {record.wins}-{record.losses}-{record.ties}
        </p>
      </div>

      {games.length === 0 ? (
        <p className="text-sm text-neutral-400">
          No games scheduled yet. Add a Game from the Schedule tab.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {games.map((g) => (
            <div
              key={g.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900"
            >
              <div>
                <Link
                  href={`/teams/${teamId}/schedule/${g.id}`}
                  className="font-medium hover:underline"
                >
                  {g.title}
                  {g.opponent ? ` vs ${g.opponent}` : ""}
                </Link>
                <p className="text-xs text-neutral-500">
                  {formatDate(g.startsAt)}
                  {g.location ? ` · ${g.location}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                {(["WIN", "LOSS", "TIE"] as const).map((o) => (
                  <form key={o} action={setGameOutcome.bind(null, teamId, g.id, o)}>
                    <button
                      type="submit"
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                        g.result?.outcome === o
                          ? o === "WIN"
                            ? "bg-green-600 text-white"
                            : o === "LOSS"
                            ? "bg-red-600 text-white"
                            : "bg-neutral-600 text-white"
                          : "border border-neutral-300 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
                      }`}
                    >
                      {o === "WIN" ? "Win" : o === "LOSS" ? "Loss" : "Tie"}
                    </button>
                  </form>
                ))}
                {g.result && (
                  <form action={clearGameOutcome.bind(null, teamId, g.id)}>
                    <button
                      type="submit"
                      className="rounded-lg px-2 py-1.5 text-xs font-medium text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                      title="Clear result"
                    >
                      Clear
                    </button>
                  </form>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
