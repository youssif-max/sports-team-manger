import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Avatar } from "@/components/Avatar";
import { AutoSubmitSelect } from "@/components/AutoSubmitSelect";
import { getCurrentUser, getMembership } from "@/lib/auth";
import { updateMemberRole } from "@/lib/actions/team";

const ROLE_OPTIONS = [
  { value: "ADMIN", label: "Admin" },
  { value: "COACH", label: "Coach" },
  { value: "PLAYER", label: "Player" },
  { value: "PARENT", label: "Parent" },
];

export default async function RosterPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;

  const [memberships, user] = await Promise.all([
    prisma.teamMembership.findMany({
      where: { teamId },
      include: { user: true },
      orderBy: [{ role: "asc" }, { user: { name: "asc" } }],
    }),
    getCurrentUser(),
  ]);

  const myMembership = user ? await getMembership(teamId, user.id) : null;
  const isAdmin = myMembership?.role === "ADMIN";

  const groups: Record<string, typeof memberships> = {
    ADMIN: [],
    COACH: [],
    PLAYER: [],
    PARENT: [],
  };
  for (const m of memberships) groups[m.role].push(m);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Roster</h1>
        <Link
          href={`/teams/${teamId}/roster/new`}
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          + Add Player
        </Link>
      </div>

      {(["ADMIN", "COACH", "PLAYER", "PARENT"] as const).map((role) =>
        groups[role].length === 0 ? null : (
          <section key={role}>
            <h2 className="mb-2 text-sm font-semibold uppercase text-neutral-400">
              {role === "ADMIN"
                ? "Admins"
                : role === "COACH"
                ? "Coaches"
                : role === "PLAYER"
                ? "Players"
                : "Parents"}
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {groups[role].map((m) => (
                <div
                  key={m.id}
                  className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={m.user.name} photoUrl={m.user.photoUrl} size={48} />
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{m.user.name}</p>
                      <p className="truncate text-xs text-neutral-500">
                        {m.jerseyNumber ? `#${m.jerseyNumber}` : ""}
                        {m.jerseyNumber && m.position ? " · " : ""}
                        {m.position ?? ""}
                      </p>
                    </div>
                  </div>

                  {isAdmin && m.userId !== user!.id && (
                    <AutoSubmitSelect
                      name="role"
                      defaultValue={m.role}
                      options={ROLE_OPTIONS}
                      action={updateMemberRole.bind(null, teamId, m.userId)}
                      className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-xs dark:border-neutral-700 dark:bg-neutral-900"
                    />
                  )}

                  <div className="flex gap-2">
                    <Link
                      href={`/teams/${teamId}/roster/${m.userId}#contact`}
                      className="flex-1 rounded-lg border border-neutral-300 py-1.5 text-center text-xs font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
                    >
                      Contact
                    </Link>
                    <Link
                      href={`/teams/${teamId}/roster/${m.userId}#stats`}
                      className="flex-1 rounded-lg border border-neutral-300 py-1.5 text-center text-xs font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
                    >
                      Stats
                    </Link>
                    <Link
                      href={`/teams/${teamId}/roster/${m.userId}`}
                      className="flex-1 rounded-lg border border-neutral-300 py-1.5 text-center text-xs font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
                    >
                      Profile
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )
      )}
    </div>
  );
}
