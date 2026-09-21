import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { JoinTeamForm } from "@/components/JoinTeamForm";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { error } = await searchParams;

  const myTeams = await prisma.team.findMany({
    where: { memberships: { some: { userId: user.id } } },
    include: { _count: { select: { memberships: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      {error === "not-a-member" && (
        <div className="rounded-lg bg-yellow-50 px-4 py-3 text-sm text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200">
          You&apos;re not a member of that team. Ask its admin or coach for the join code.
        </div>
      )}

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

      <section>
        <JoinTeamForm />
      </section>
    </>
  );
}
