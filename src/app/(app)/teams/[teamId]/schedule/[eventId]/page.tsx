import { notFound } from "next/navigation";
import { MapPin } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { Avatar } from "@/components/Avatar";
import { AutoSubmitSelect } from "@/components/AutoSubmitSelect";
import { ConfirmButton } from "@/components/ConfirmButton";
import { EventTypeBadge } from "@/components/EventTypeBadge";
import { formatDateTime } from "@/lib/format";
import {
  deleteEvent,
  setRsvpForm,
  setAttendanceForm,
  recordResult,
  recordStats,
} from "@/lib/actions/schedule";

const RSVP_OPTIONS = [
  { value: "PENDING", label: "No response" },
  { value: "IN", label: "In" },
  { value: "OUT", label: "Out" },
  { value: "MAYBE", label: "Maybe" },
];

const ATTENDANCE_OPTIONS = [
  { value: "UNKNOWN", label: "Unknown" },
  { value: "PRESENT", label: "Present" },
  { value: "LATE", label: "Late" },
  { value: "ABSENT", label: "Absent" },
];

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ teamId: string; eventId: string }>;
}) {
  const { teamId, eventId } = await params;

  const [event, members, rsvps, attendance, result, statDefs, stats, user] =
    await Promise.all([
      prisma.event.findUnique({ where: { id: eventId } }),
      prisma.teamMembership.findMany({
        where: { teamId, role: "PLAYER" },
        include: { user: true },
        orderBy: { user: { name: "asc" } },
      }),
      prisma.rsvp.findMany({ where: { eventId } }),
      prisma.attendance.findMany({ where: { eventId } }),
      prisma.gameResult.findUnique({ where: { eventId } }),
      prisma.statDefinition.findMany({ where: { teamId } }),
      prisma.gameStat.findMany({ where: { eventId } }),
      getCurrentUser(),
    ]);

  if (!event || event.teamId !== teamId) notFound();

  const rsvpByUser = new Map(rsvps.map((r) => [r.userId, r]));
  const attendanceByUser = new Map(attendance.map((a) => [a.userId, a]));
  const statByKey = new Map(stats.map((s) => [`${s.userId}:${s.statDefinitionId}`, s.value]));

  const myRsvp = user ? rsvpByUser.get(user.id) : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <EventTypeBadge type={event.type} />
          </div>
          <h1 className="text-xl font-bold">
            {event.title}
            {event.opponent ? ` vs ${event.opponent}` : ""}
          </h1>
          <p className="text-sm text-neutral-500">{formatDateTime(event.startsAt)}</p>
          {event.location && (
            <p className="flex items-center gap-1 text-sm text-neutral-500">
              <MapPin size={14} /> {event.location}
            </p>
          )}
          {event.notes && <p className="mt-2 text-sm">{event.notes}</p>}
        </div>
        <form action={deleteEvent.bind(null, teamId, eventId)}>
          <ConfirmButton
            confirmText="Delete this event? This cannot be undone."
            className="text-xs font-medium text-red-600 hover:underline"
          >
            Delete event
          </ConfirmButton>
        </form>
      </div>

      {user && (
        <section className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="mb-2 text-sm font-semibold uppercase text-neutral-400">
            Your RSVP
          </h2>
          <AutoSubmitSelect
            name="status"
            defaultValue={myRsvp?.status ?? "PENDING"}
            options={RSVP_OPTIONS}
            action={setRsvpForm.bind(null, teamId, eventId, user.id)}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        </section>
      )}

      {event.type === "GAME" && (
        <section className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="mb-3 text-sm font-semibold uppercase text-neutral-400">Result</h2>
          <form
            action={recordResult.bind(null, teamId, eventId)}
            className="flex flex-wrap items-end gap-3"
          >
            <label className="text-sm font-medium">
              Us
              <input
                type="number"
                name="teamScore"
                defaultValue={result?.teamScore ?? 0}
                className="mt-1 w-20 rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              />
            </label>
            <label className="text-sm font-medium">
              {event.opponent || "Opponent"}
              <input
                type="number"
                name="opponentScore"
                defaultValue={result?.opponentScore ?? 0}
                className="mt-1 w-20 rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              />
            </label>
            <button
              type="submit"
              className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Save Result
            </button>
            {result && (
              <span className="text-sm font-semibold">Current: {result.outcome}</span>
            )}
          </form>
        </section>
      )}

      <section className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="mb-3 text-sm font-semibold uppercase text-neutral-400">
          Roster &amp; Attendance
        </h2>
        <div className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between gap-2 py-2">
              <div className="flex min-w-0 items-center gap-2">
                <Avatar name={m.user.name} photoUrl={m.user.photoUrl} size={32} />
                <span className="truncate text-sm font-medium">{m.user.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-400">
                  RSVP: {rsvpByUser.get(m.userId)?.status ?? "PENDING"}
                </span>
                <AutoSubmitSelect
                  name="status"
                  defaultValue={attendanceByUser.get(m.userId)?.status ?? "UNKNOWN"}
                  options={ATTENDANCE_OPTIONS}
                  action={setAttendanceForm.bind(null, teamId, eventId, m.userId)}
                  className="rounded-lg border border-neutral-300 px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-900"
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {event.type === "GAME" && statDefs.length > 0 && (
        <section className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="mb-3 text-sm font-semibold uppercase text-neutral-400">
            Game Stats
          </h2>
          <form action={recordStats.bind(null, teamId, eventId)} className="flex flex-col gap-3">
            <div className="overflow-x-auto">
              <table className="w-full min-w-max text-sm">
                <thead>
                  <tr className="text-left text-xs text-neutral-400">
                    <th className="pb-2 pr-4">Player</th>
                    {statDefs.map((sd) => (
                      <th key={sd.id} className="pb-2 pr-4">
                        {sd.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.id} className="border-t border-neutral-100 dark:border-neutral-800">
                      <td className="py-2 pr-4 font-medium">{m.user.name}</td>
                      {statDefs.map((sd) => (
                        <td key={sd.id} className="py-2 pr-4">
                          <input
                            type="number"
                            step="1"
                            name={`stat:${m.userId}:${sd.id}`}
                            defaultValue={statByKey.get(`${m.userId}:${sd.id}`) ?? 0}
                            className="w-16 rounded-lg border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              type="submit"
              className="self-start rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Save Stats
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
