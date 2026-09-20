import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/format";

const TYPE_ICON: Record<string, string> = {
  GAME: "🏟️",
  PRACTICE: "🏃",
  OTHER: "📌",
};

export default async function SchedulePage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const now = new Date();

  const [upcoming, past] = await Promise.all([
    prisma.event.findMany({
      where: { teamId, startsAt: { gte: now } },
      orderBy: { startsAt: "asc" },
      include: { result: true },
    }),
    prisma.event.findMany({
      where: { teamId, startsAt: { lt: now } },
      orderBy: { startsAt: "desc" },
      include: { result: true },
      take: 15,
    }),
  ]);

  const renderList = (events: typeof upcoming) => (
    <div className="flex flex-col gap-2">
      {events.map((e) => (
        <Link
          key={e.id}
          href={`/teams/${teamId}/schedule/${e.id}`}
          className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-3 text-sm hover:shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
        >
          <div>
            <p className="font-medium">
              {TYPE_ICON[e.type]} {e.title}
              {e.opponent ? ` vs ${e.opponent}` : ""}
            </p>
            <p className="text-xs text-neutral-500">{e.location}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium text-neutral-500">
              {formatDateTime(e.startsAt)}
            </p>
            {e.result && (
              <p className="text-xs font-semibold">
                {e.result.outcome} {e.result.teamScore}-{e.result.opponentScore}
              </p>
            )}
          </div>
        </Link>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Schedule</h1>
        <Link
          href={`/teams/${teamId}/schedule/new`}
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          + Add Event
        </Link>
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase text-neutral-400">Upcoming</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-neutral-400">Nothing scheduled yet.</p>
        ) : (
          renderList(upcoming)
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase text-neutral-400">Past</h2>
        {past.length === 0 ? (
          <p className="text-sm text-neutral-400">No past events.</p>
        ) : (
          renderList(past)
        )}
      </section>
    </div>
  );
}
