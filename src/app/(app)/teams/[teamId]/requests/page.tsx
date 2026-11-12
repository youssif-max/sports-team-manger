import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getMembership } from "@/lib/auth";
import { approveJoinRequest, declineJoinRequest } from "@/lib/actions/team";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Join requests — SportSync" };

export default async function JoinRequestsPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;

  const user = await getCurrentUser();
  const membership = user ? await getMembership(teamId, user.id) : null;
  if (membership?.role !== "ADMIN" && membership?.role !== "COACH") {
    redirect(`/teams/${teamId}`);
  }

  const [team, requests] = await Promise.all([
    prisma.team.findUniqueOrThrow({ where: { id: teamId }, select: { requireApproval: true } }),
    prisma.joinRequest.findMany({
      where: { teamId },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold">Join requests</h1>
        <p className="text-xs text-neutral-500">
          People who entered your join code or used your invite link. Only approve people you
          recognize — members of the team can see the team&apos;s chat, schedule and highlights.
          {!team.requireApproval &&
            " Approval is currently off, so new people join immediately; an admin can turn it on in Team Settings."}
        </p>
      </div>

      {requests.length === 0 && <p className="text-sm text-neutral-400">No one is waiting.</p>}

      {requests.map((r) => (
        <div
          key={r.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-4 text-sm dark:border-neutral-800 dark:bg-neutral-900"
        >
          <div>
            <p className="font-semibold">{r.user.name}</p>
            <p className="text-xs text-neutral-500">
              {r.user.email} · wants to join as a {r.role.toLowerCase()} · {formatDateTime(r.createdAt)}
            </p>
          </div>
          <div className="flex gap-2">
            <form action={approveJoinRequest.bind(null, teamId, r.id)}>
              <button
                type="submit"
                className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
              >
                Approve
              </button>
            </form>
            <form action={declineJoinRequest.bind(null, teamId, r.id)}>
              <button
                type="submit"
                className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-semibold hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
              >
                Decline
              </button>
            </form>
          </div>
        </div>
      ))}
    </div>
  );
}
