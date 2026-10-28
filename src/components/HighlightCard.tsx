import Link from "next/link";
import { Play } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { ConfirmButton } from "@/components/ConfirmButton";
import { deleteHighlight } from "@/lib/actions/community";
import { toEmbedUrl, formatTimestamp } from "@/lib/video";
import { formatDate } from "@/lib/format";

export type HighlightCardData = {
  id: string;
  teamId: string;
  title: string;
  description: string | null;
  videoUrl: string;
  startSeconds: number | null;
  endSeconds: number | null;
  createdAt: Date;
  player: { id: string; name: string; photoUrl: string | null } | null;
  postedByName: string | null;
  teamName?: string;
};

export function HighlightCard({
  h,
  canDelete,
  showTeam = false,
}: {
  h: HighlightCardData;
  canDelete: boolean;
  showTeam?: boolean;
}) {
  const embed = toEmbedUrl(h.videoUrl, h.startSeconds, h.endSeconds);
  const hasClip = h.startSeconds != null;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      {embed ? (
        <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
          <iframe
            src={embed}
            title={h.title}
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        <a
          href={h.videoUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="flex aspect-video w-full items-center justify-center gap-1.5 rounded-lg bg-neutral-900 text-sm font-medium text-white"
        >
          <Play size={16} fill="currentColor" /> Watch video
          {hasClip ? ` (from ${formatTimestamp(h.startSeconds!)})` : ""}
        </a>
      )}

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold">{h.title}</p>
          <p className="text-xs text-neutral-500">
            {showTeam && h.teamName && (
              <Link href={`/teams/${h.teamId}/highlights`} className="font-medium hover:underline">
                {h.teamName}
              </Link>
            )}
            {showTeam && h.teamName ? " · " : ""}
            {h.postedByName ?? "Team"} · {formatDate(h.createdAt)}
            {hasClip
              ? ` · clip ${formatTimestamp(h.startSeconds!)}${
                  h.endSeconds != null ? `–${formatTimestamp(h.endSeconds)}` : ""
                }`
              : ""}
          </p>
        </div>
        {canDelete && (
          <form action={deleteHighlight.bind(null, h.teamId, h.id)}>
            <ConfirmButton
              confirmText="Delete this highlight?"
              className="text-xs text-red-600 hover:underline"
            >
              Delete
            </ConfirmButton>
          </form>
        )}
      </div>

      {h.description && <p className="text-sm">{h.description}</p>}

      {h.player && (
        <Link
          href={`/teams/${h.teamId}/highlights?player=${h.player.id}`}
          className="flex items-center gap-2 text-xs text-neutral-500 hover:underline"
        >
          <Avatar name={h.player.name} photoUrl={h.player.photoUrl} size={20} />
          {h.player.name}&apos;s reel
        </Link>
      )}
    </div>
  );
}
