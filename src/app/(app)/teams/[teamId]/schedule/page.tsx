import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/format";
import { EventTypeBadge } from "@/components/EventTypeBadge";
import { ScheduleCalendar } from "@/components/ScheduleCalendar";
import { ScheduleViewTabs } from "@/components/ScheduleViewTabs";

export default async function SchedulePage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const now = new Date();
  const rangeStart = new Date(now);
  rangeStart.setDate(rangeStart.getDate() - 120);
  const rangeEnd = new Date(now);
  rangeEnd.setDate(rangeEnd.getDate() + 400);

  const events = await prisma.event.findMany({
    where: { teamId, startsAt: { gte: rangeStart, lte: rangeEnd } },
    orderBy: { startsAt: "asc" },
    include: { result: true },
  });

  const upcoming = events.filter((e) => e.startsAt >= now);
  const past = events
    .filter((e) => e.startsAt < now)
    .slice(-15)
    .reverse();

  const renderList = (list: typeof upcoming) => (
    <div className="flex flex-col gap-2">
      {list.map((e) => (
        <Link
          key={e.id}
          href={`/teams/${teamId}/schedule/${e.id}`}
          className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-3 text-sm hover:shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
        >
          <div>
            <div className="flex items-center gap-2">
              <EventTypeBadge type={e.type} />
              <p className="font-medium">
                {e.title}
                {e.opponent ? ` vs ${e.opponent}` : ""}
              </p>
            </div>
            <p className="mt-0.5 text-xs text-neutral-500">{e.location}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium text-neutral-500">
              {formatDateTime(e.startsAt)}
            </p>
            {e.result && (
              <p className="text-xs font-semibold">
                {e.result.outcome}
                {e.result.teamScore != null && e.result.opponentScore != null
                  ? ` ${e.result.teamScore}-${e.result.opponentScore}`
                  : ""}
              </p>
            )}
          </div>
        </Link>
      ))}
    </div>
  );

  const listView = (
    <div className="flex flex-col gap-6">
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

  const calendarView = (
    <ScheduleCalendar
      teamId={teamId}
      events={events.map((e) => ({
        id: e.id,
        title: e.title,
        type: e.type,
        startsAt: e.startsAt.toISOString(),
      }))}
    />
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Schedule</h1>
        <Link
          href={`/teams/${teamId}/schedule/new`}
          className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          + Add Event
        </Link>
      </div>

      <ScheduleViewTabs list={listView} calendar={calendarView} />
    </div>
  );
}
