import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addExistingUserToTeam } from "@/lib/actions/team";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const teams = await prisma.team.findMany({
    include: { memberships: true, _count: { select: { memberships: true } } },
    orderBy: { createdAt: "desc" },
  });

  const myTeams = teams.filter((t) =>
    t.memberships.some((m) => m.userId === user.id)
  );
  const otherTeams = teams.filter(
    (t) => !t.memberships.some((m) => m.userId === user.id)
  );

  return (
    <>
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-xl font-bold">My Teams</h1>
          <Link
            href="/teams/new"
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700"
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
                  {team.season ?? "No season set"} · {team._count.memberships} members
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {otherTeams.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold">Other Teams</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {otherTeams.map((team) => (
              <div
                key={team.id}
                className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
              >
                <div>
                  <h3 className="font-semibold">{team.name}</h3>
                  <p className="text-xs text-neutral-500 capitalize">{team.sport}</p>
                </div>
                <form action={addExistingUserToTeam.bind(null, team.id)}>
                  <input type="hidden" name="userId" value={user.id} />
                  <select
                    name="role"
                    className="mr-2 rounded-lg border border-neutral-300 px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-900"
                  >
                    <option value="PLAYER">Player</option>
                    <option value="COACH">Coach</option>
                    <option value="PARENT">Parent</option>
                  </select>
                  <button
                    type="submit"
                    className="rounded-lg bg-neutral-800 px-3 py-1 text-xs font-semibold text-white hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900"
                  >
                    Join
                  </button>
                </form>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
