import Link from "next/link";
import { FileText } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import { ConfirmButton } from "@/components/ConfirmButton";
import { deletePlay } from "@/lib/actions/plays";

export default async function PlaybookPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;

  const plays = await prisma.play.findMany({
    where: { teamId },
    include: { createdBy: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Playbook</h1>
        <Link
          href={`/teams/${teamId}/playbook/new`}
          className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          + New Play
        </Link>
      </div>

      {plays.length === 0 ? (
        <p className="text-sm text-neutral-400">
          No plays yet. Draw one on a court/field, or attach a file.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plays.map((p) => (
            <div
              key={p.id}
              className="flex flex-col gap-2 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
            >
              {p.diagram?.startsWith("data:image/") ? (
                // eslint-disable-next-line @next/next/no-img-element -- locally-drawn/uploaded data URL, not optimizable by next/image
                <img
                  src={p.diagram}
                  alt={p.title}
                  className="w-full rounded-lg border border-neutral-200 dark:border-neutral-800"
                />
              ) : p.diagram ? (
                <a
                  href={p.diagram}
                  target="_blank"
                  rel="noreferrer"
                  download
                  className="flex aspect-[4/3] w-full items-center justify-center gap-1.5 rounded-lg bg-neutral-100 text-sm font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
                >
                  <FileText size={16} /> Open attached file
                </a>
              ) : p.fileUrl ? (
                <a
                  href={p.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex aspect-[4/3] w-full items-center justify-center gap-1.5 rounded-lg bg-neutral-100 text-sm font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
                >
                  <FileText size={16} /> Open attached file
                </a>
              ) : null}

              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{p.title}</p>
                  <p className="text-xs text-neutral-500">
                    {p.createdBy?.name ?? "Team"} · {formatDate(p.createdAt)}
                  </p>
                </div>
                <form action={deletePlay.bind(null, teamId, p.id)}>
                  <ConfirmButton
                    confirmText="Delete this play?"
                    className="text-xs text-red-600 hover:underline"
                  >
                    Delete
                  </ConfirmButton>
                </form>
              </div>
              {p.description && <p className="text-sm">{p.description}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
