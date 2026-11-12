import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getMembership } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Activity log — SportSync" };

const LABELS: Record<string, string> = {
  "member.joined": "joined the team",
  "member.join_requested": "asked to join the team",
  "member.join_approved": "approved a join request",
  "member.join_declined": "declined a join request",
  "member.added": "added a roster entry",
  "member.removed": "removed a member",
  "member.role_changed": "changed a member's role",
  "parent.linked": "linked a parent to a player",
  "parent.unlinked": "unlinked a parent from a player",
  "team.join_code_regenerated": "regenerated the join code",
  "team.settings_updated": "updated team settings",
  "report.remove": "removed reported content",
  "report.dismiss": "dismissed a report",
  "billing.checkout_started": "started a Premium checkout",
};

export default async function AuditPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;

  const user = await getCurrentUser();
  const membership = user ? await getMembership(teamId, user.id) : null;
  if (membership?.role !== "ADMIN") redirect(`/teams/${teamId}`);

  const logs = await prisma.auditLog.findMany({
    where: { teamId },
    include: { actor: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold">Activity log</h1>
        <p className="text-xs text-neutral-500">
          Who changed roles, members, settings and billing — the latest 100 actions.
        </p>
      </div>

      {logs.length === 0 ? (
        <p className="text-sm text-neutral-400">Nothing recorded yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-900">
          {logs.map((l) => (
            <li key={l.id} className="flex flex-col gap-0.5 px-4 py-3 text-sm">
              <p>
                <span className="font-medium">{l.actor?.name ?? "Someone"}</span>{" "}
                {LABELS[l.action] ?? l.action}
              </p>
              <p className="text-xs text-neutral-500">
                {formatDateTime(l.createdAt)}
                {l.detail ? ` · ${l.detail}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
