import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Avatar } from "@/components/Avatar";
import { ConfirmButton } from "@/components/ConfirmButton";
import { removeMembership } from "@/lib/actions/team";
import { formatDate } from "@/lib/format";

export default async function PlayerProfilePage({
  params,
}: {
  params: Promise<{ teamId: string; userId: string }>;
}) {
  const { teamId, userId } = await params;

  const membership = await prisma.teamMembership.findUnique({
    where: { teamId_userId: { teamId, userId } },
    include: { user: true },
  });
  if (!membership) notFound();

  const [stats, attendance, statDefs] = await Promise.all([
    prisma.gameStat.findMany({
      where: { userId, event: { teamId } },
      include: { statDefinition: true },
    }),
    prisma.attendance.findMany({
      where: { userId, event: { teamId } },
      include: { event: true },
      orderBy: { event: { startsAt: "desc" } },
      take: 10,
    }),
    prisma.statDefinition.findMany({ where: { teamId } }),
  ]);

  const totals = new Map<string, number>();
  for (const s of stats) {
    totals.set(s.statDefinition.name, (totals.get(s.statDefinition.name) ?? 0) + s.value);
  }

  const removeAction = removeMembership.bind(null, teamId, userId);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Avatar name={membership.user.name} photoUrl={membership.user.photoUrl} size={64} />
          <div>
            <h1 className="text-xl font-bold">{membership.user.name}</h1>
            <p className="text-sm text-neutral-500">
              {membership.jerseyNumber ? `#${membership.jerseyNumber}` : ""}
              {membership.jerseyNumber && membership.position ? " · " : ""}
              {membership.position ?? ""}
              {" · "}
              <span className="capitalize">{membership.role.toLowerCase()}</span>
            </p>
          </div>
        </div>
        <Link
          href={`/teams/${teamId}/roster/${userId}/edit`}
          className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          Edit
        </Link>
      </div>

      <section id="contact" className="scroll-mt-24 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="mb-3 text-sm font-semibold uppercase text-neutral-400">Contact</h2>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs text-neutral-500">Email</dt>
            <dd>{membership.user.email ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-500">Phone</dt>
            <dd>{membership.user.phone ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-500">Emergency Contact</dt>
            <dd>{membership.emergencyContactName ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-500">Emergency Phone</dt>
            <dd>{membership.emergencyContactPhone ?? "—"}</dd>
          </div>
        </dl>
      </section>

      <section id="stats" className="scroll-mt-24 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="mb-3 text-sm font-semibold uppercase text-neutral-400">
          Season Stats
        </h2>
        {statDefs.length === 0 ? (
          <p className="text-sm text-neutral-400">No stat categories set up for this team.</p>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {statDefs.map((sd) => (
              <div key={sd.id} className="rounded-lg bg-neutral-50 p-3 text-center dark:bg-neutral-800">
                <p className="text-lg font-bold">{totals.get(sd.name) ?? 0}</p>
                <p className="text-xs text-neutral-500">{sd.name}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="mb-3 text-sm font-semibold uppercase text-neutral-400">
          Recent Attendance
        </h2>
        {attendance.length === 0 ? (
          <p className="text-sm text-neutral-400">No attendance recorded yet.</p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {attendance.map((a) => (
              <li key={a.id} className="flex items-center justify-between">
                <span>
                  {a.event.title} · {formatDate(a.event.startsAt)}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    a.status === "PRESENT"
                      ? "bg-green-100 text-green-700"
                      : a.status === "ABSENT"
                      ? "bg-red-100 text-red-700"
                      : a.status === "LATE"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-neutral-100 text-neutral-500"
                  }`}
                >
                  {a.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <form action={removeAction} className="self-start">
        <ConfirmButton
          confirmText={`Remove ${membership.user.name} from this team's roster?`}
          className="text-xs font-medium text-red-600 hover:underline"
        >
          Remove from roster
        </ConfirmButton>
      </form>
    </div>
  );
}
