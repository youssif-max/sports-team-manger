import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getMembership } from "@/lib/auth";
import { TeamNav } from "@/components/TeamNav";

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
  const membership = user ? await getMembership(teamId, user.id) : null;

  return (
    <div className="flex flex-col gap-4">
      <div
        className="flex items-center justify-between rounded-xl p-4 text-white shadow-sm"
        style={{
          background: `linear-gradient(135deg, ${team.colorPrimary}, ${team.colorSecondary})`,
        }}
      >
        <div>
          <h1 className="text-lg font-bold">{team.name}</h1>
          <p className="text-xs opacity-80">
            {team.sport}
            {team.season ? ` · ${team.season}` : ""}
          </p>
        </div>
        {membership && (
          <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold capitalize backdrop-blur">
            {membership.role.toLowerCase()}
          </span>
        )}
      </div>

      <TeamNav teamId={teamId} />

      {children}
    </div>
  );
}
