import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { isPlatformAdmin } from "@/lib/platform";
import { adminRemoveHighlight, adminRestoreHighlight } from "@/lib/actions/moderation";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Moderation — SportSync" };

// App-owner view: every highlight that was auto-hidden or has an open report,
// across all teams. Invisible (404) to everyone who isn't a platform admin.
export default async function AdminModerationPage() {
  const user = await getCurrentUser();
  if (!isPlatformAdmin(user)) notFound();

  const openReports = await prisma.report.findMany({
    where: { targetType: "HIGHLIGHT", status: "OPEN" },
    select: { targetId: true },
  });
  const reportedIds = [...new Set(openReports.map((r) => r.targetId))];

  const highlights = await prisma.highlight.findMany({
    where: { OR: [{ hiddenAt: { not: null } }, { id: { in: reportedIds } }] },
    include: {
      postedBy: { select: { name: true, email: true } },
      team: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const reasons = await prisma.report.findMany({
    where: { targetType: "HIGHLIGHT", targetId: { in: highlights.map((h) => h.id) }, status: "OPEN" },
    select: { targetId: true, reason: true },
  });

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold">Moderation</h1>
        <p className="text-xs text-neutral-500">
          Highlights that were reported or auto-hidden, across all teams. Remove deletes the video
          for good; Restore puts it back and closes its reports. Anything involving a minor&apos;s
          safety should also be reported to the authorities.
        </p>
      </div>

      {highlights.length === 0 && <p className="text-sm text-neutral-400">Nothing needs review.</p>}

      {highlights.map((h) => (
        <div
          key={h.id}
          className="flex flex-col gap-2 rounded-xl border border-neutral-200 bg-white p-4 text-sm dark:border-neutral-800 dark:bg-neutral-900"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-500">
            <span className="font-semibold uppercase">
              {h.visibility === "PUBLIC" ? "Public" : "Team only"} · {h.uploaded ? "Uploaded video" : "Link"}
            </span>
            <span>
              {h.hiddenAt ? "Hidden" : "Visible"} · {formatDateTime(h.createdAt)}
            </span>
          </div>
          <p className="font-semibold">{h.title}</p>
          {h.uploaded ? (
            <video src={h.videoUrl} controls playsInline preload="metadata" className="aspect-video w-full rounded-lg bg-black" />
          ) : (
            <p className="break-all text-xs text-neutral-500">{h.videoUrl}</p>
          )}
          <p className="text-xs text-neutral-500">
            {h.postedBy?.name ?? "Unknown"} ({h.postedBy?.email ?? "no email"}) · {h.team.name}
          </p>
          <ul className="list-disc pl-5 text-xs text-neutral-600 dark:text-neutral-400">
            {reasons.filter((r) => r.targetId === h.id).map((r, i) => (
              <li key={i}>{r.reason}</li>
            ))}
          </ul>
          <div className="flex gap-2">
            <form action={adminRemoveHighlight.bind(null, h.id)}>
              <button type="submit" className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700">
                Remove
              </button>
            </form>
            <form action={adminRestoreHighlight.bind(null, h.id)}>
              <button
                type="submit"
                className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-semibold hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
              >
                Restore
              </button>
            </form>
          </div>
        </div>
      ))}
    </div>
  );
}
