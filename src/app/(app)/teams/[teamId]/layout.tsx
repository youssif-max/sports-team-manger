import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getMembership } from "@/lib/auth";
import { TeamNav } from "@/components/TeamNav";
import { teamTypeLabel } from "@/lib/format";

export default async function TeamLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) notFound();

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const membership = await getMembership(teamId, user.id);
  if (!membership) redirect("/?error=not-a-member");

  const canSeeJoinCode = membership.role === "ADMIN" || membership.role === "COACH";

  return (
    <div className="flex flex-col gap-4">
      <div
        className="flex flex-wrap items-center justify-between gap-3 rounded-xl p-4 text-white shadow-sm"
        style={{
          background: `linear-gradient(135deg, ${team.colorPrimary}, ${team.colorSecondary})`,
        }}
      >
        <div>
          <h1 className="text-lg font-bold">{team.name}</h1>
          <p className="text-xs opacity-80">
            {teamTypeLabel(team.teamType)} · {team.sport}
            {team.season ? ` · ${team.season}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canSeeJoinCode && (
            <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold tracking-widest backdrop-blur">
              Join code: {team.joinCode}
            </span>
          )}
          <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold capitalize backdrop-blur">
            {membership.role.toLowerCase()}
          </span>
        </div>
      </div>

      <TeamNav teamId={teamId} />

      {children}
    </div>
  );
}
