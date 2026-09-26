import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Sparkles, Settings } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getMembership } from "@/lib/auth";
import { TeamNav } from "@/components/TeamNav";
import { CopyInviteLink } from "@/components/CopyInviteLink";
import { teamTypeLabel } from "@/lib/format";
import { isTeamPremium } from "@/lib/billing";

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
        <div className="flex items-center gap-3">
          {team.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- arbitrary team-pasted URL, not optimizable by next/image
            <img
              src={team.logoUrl}
              alt=""
              className="h-10 w-10 shrink-0 rounded-full border border-white/40 object-cover"
            />
          )}
          <div>
            <h1 className="text-lg font-bold">{team.name}</h1>
            <p className="text-xs opacity-80">
              {teamTypeLabel(team.teamType)} · {team.sport}
              {team.season ? ` · ${team.season}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isTeamPremium(team) && (
            <Link
              href={`/teams/${teamId}/premium`}
              className="flex items-center gap-1 rounded-full bg-amber-400/90 px-2.5 py-1 text-xs font-semibold text-amber-950 backdrop-blur"
            >
              <Sparkles size={12} /> Premium
            </Link>
          )}
          {canSeeJoinCode && (
            <>
              <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold tracking-widest backdrop-blur">
                Join code: {team.joinCode}
              </span>
              <CopyInviteLink joinCode={team.joinCode} />
            </>
          )}
          <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold capitalize backdrop-blur">
            {membership.role.toLowerCase()}
          </span>
          {membership.role === "ADMIN" && (
            <Link
              href={`/teams/${teamId}/settings`}
              title="Team settings"
              className="rounded-full bg-white/20 p-1.5 backdrop-blur hover:bg-white/30"
            >
              <Settings size={14} />
            </Link>
          )}
        </div>
      </div>

      <TeamNav teamId={teamId} />

      {children}
    </div>
  );
}
