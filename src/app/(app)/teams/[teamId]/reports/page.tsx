import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getMembership } from "@/lib/auth";
import { resolveReport } from "@/lib/actions/moderation";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Reports — SportSync" };

export default async function ReportsPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;

  const user = await getCurrentUser();
  const membership = user ? await getMembership(teamId, user.id) : null;
  if (membership?.role !== "ADMIN" && membership?.role !== "COACH") {
    redirect(`/teams/${teamId}`);
  }

  const reports = await prisma.report.findMany({
    where: { teamId },
    include: { reporter: true },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 50,
  });

  const rows = await Promise.all(
    reports.map(async (r) => {
      let preview = "(content no longer exists)";
      let authorName: string | null = null;
      if (r.targetType === "CHAT_MESSAGE") {
        const m = await prisma.chatMessage.findFirst({
          where: { id: r.targetId, teamId },
          include: { author: true },
        });
        if (m) {
          preview = m.body;
          authorName = m.author.name;
        }
      } else if (r.targetType === "HIGHLIGHT") {
        const h = await prisma.highlight.findFirst({
          where: { id: r.targetId, teamId },
          include: { postedBy: true },
        });
        if (h) {
          preview = `${h.title} — ${h.videoUrl}`;
          authorName = h.postedBy?.name ?? null;
        }
      } else {
        const a = await prisma.announcement.findFirst({
          where: { id: r.targetId, teamId },
          include: { author: true },
        });
        if (a) {
          preview = `${a.title}: ${a.body}`;
          authorName = a.author.name;
        }
      }
      return { r, preview, authorName };
    })
  );

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold">Reports</h1>
        <p className="text-xs text-neutral-500">
          Content members have flagged in this team. Remove it, or dismiss the report if it&apos;s
          fine. Unsafe content involving a minor should also be reported to the app owner and,
          where appropriate, to the authorities.
        </p>
      </div>

      {rows.length === 0 && <p className="text-sm text-neutral-400">No reports. All quiet.</p>}

      {rows.map(({ r, preview, authorName }) => (
        <div
          key={r.id}
          className="flex flex-col gap-2 rounded-xl border border-neutral-200 bg-white p-4 text-sm dark:border-neutral-800 dark:bg-neutral-900"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-500">
            <span className="font-semibold uppercase">
              {r.targetType.replace("_", " ").toLowerCase()}
            </span>
            <span>
              {r.status === "OPEN" ? "Open" : r.status === "RESOLVED" ? "Removed" : "Dismissed"} ·{" "}
              {formatDateTime(r.createdAt)}
            </span>
          </div>
          <p className="whitespace-pre-wrap break-words rounded-lg bg-neutral-50 p-3 dark:bg-neutral-800">
            {preview}
          </p>
          <p className="text-xs text-neutral-500">
            {authorName ? `By ${authorName} · ` : ""}Reported by {r.reporter.name}: {r.reason}
          </p>
          {r.status === "OPEN" && (
            <div className="flex gap-2">
              <form action={resolveReport.bind(null, teamId, r.id, "remove")}>
                <button
                  type="submit"
                  className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                >
                  Remove content
                </button>
              </form>
              <form action={resolveReport.bind(null, teamId, r.id, "dismiss")}>
                <button
                  type="submit"
                  className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-semibold hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
                >
                  Dismiss
                </button>
              </form>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
