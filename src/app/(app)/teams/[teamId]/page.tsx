import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/format";
import { EventTypeBadge } from "@/components/EventTypeBadge";

export default async function TeamOverviewPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;

  const [nextEvents, announcements, results, rosterCount] = await Promise.all([
    prisma.event.findMany({
      where: { teamId, startsAt: { gte: new Date() } },
      orderBy: { startsAt: "asc" },
      take: 3,
    }),
    prisma.announcement.findMany({
      where: { teamId },
      include: { author: true },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
    prisma.gameResult.findMany({
      where: { event: { teamId } },
      include: { event: true },
    }),
    prisma.teamMembership.count({ where: { teamId } }),
  ]);

  const record = results.reduce(
    (acc, r) => {
      if (r.outcome === "WIN") acc.wins++;
      else if (r.outcome === "LOSS") acc.losses++;
      else acc.ties++;
      return acc;
    },
    { wins: 0, losses: 0, ties: 0 }
  );

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <p className="text-xs font-semibold uppercase text-neutral-400">Record</p>
        <p className="mt-1 text-2xl font-bold">
          {record.wins}-{record.losses}-{record.ties}
        </p>
        <Link href={`/teams/${teamId}/standings`} className="text-xs text-brand-600 hover:underline">
          View standings →
        </Link>
      </div>
      <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <p className="text-xs font-semibold uppercase text-neutral-400">Roster</p>
        <p className="mt-1 text-2xl font-bold">{rosterCount}</p>
        <Link href={`/teams/${teamId}/roster`} className="text-xs text-brand-600 hover:underline">
          View roster →
        </Link>
      </div>
      <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <p className="text-xs font-semibold uppercase text-neutral-400">Next Up</p>
        <p className="mt-1 text-sm font-semibold">
          {nextEvents[0] ? formatDateTime(nextEvents[0].startsAt) : "Nothing scheduled"}
        </p>
        <Link href={`/teams/${teamId}/schedule`} className="text-xs text-brand-600 hover:underline">
          View schedule →
        </Link>
      </div>

      <div className="sm:col-span-2">
        <h2 className="mb-2 text-sm font-semibold text-neutral-500">Upcoming Events</h2>
        <div className="flex flex-col gap-2">
          {nextEvents.length === 0 && (
            <p className="text-sm text-neutral-400">No upcoming events yet.</p>
          )}
          {nextEvents.map((e) => (
            <Link
              key={e.id}
              href={`/teams/${teamId}/schedule/${e.id}`}
              className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-3 text-sm hover:shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
            >
              <div>
                <div className="flex items-center gap-2">
                  <EventTypeBadge type={e.type} />
                  <p className="font-medium">{e.title}</p>
                </div>
                <p className="mt-0.5 text-xs text-neutral-500">{e.location}</p>
              </div>
              <p className="text-xs font-medium text-neutral-500">
                {formatDateTime(e.startsAt)}
              </p>
            </Link>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-neutral-500">Announcements</h2>
        <div className="flex flex-col gap-2">
          {announcements.length === 0 && (
            <p className="text-sm text-neutral-400">Nothing posted yet.</p>
          )}
          {announcements.map((a) => (
            <div
              key={a.id}
              className="rounded-xl border border-neutral-200 bg-white p-3 text-sm dark:border-neutral-800 dark:bg-neutral-900"
            >
              <p className="font-medium">{a.title}</p>
              <p className="text-xs text-neutral-500">by {a.author.name}</p>
            </div>
          ))}
          <Link
            href={`/teams/${teamId}/announcements`}
            className="text-xs text-brand-600 hover:underline"
          >
            View all →
          </Link>
        </div>
      </div>
    </div>
  );
}
