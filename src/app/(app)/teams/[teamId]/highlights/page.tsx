import Link from "next/link";
import { Play, Sparkles } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Avatar } from "@/components/Avatar";
import { ConfirmButton } from "@/components/ConfirmButton";
import { postHighlight, deleteHighlight } from "@/lib/actions/community";
import { toEmbedUrl } from "@/lib/video";
import { formatDate } from "@/lib/format";
import { isTeamPremium, FREE_HIGHLIGHT_LIMIT } from "@/lib/billing";

export default async function HighlightsPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;

  const [highlights, players, team] = await Promise.all([
    prisma.highlight.findMany({
      where: { teamId },
      include: { user: true, event: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.teamMembership.findMany({
      where: { teamId, role: "PLAYER" },
      include: { user: true },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.team.findUniqueOrThrow({ where: { id: teamId } }),
  ]);

  const premium = isTeamPremium(team);
  const atLimit = !premium && highlights.length >= FREE_HIGHLIGHT_LIMIT;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold">Highlights &amp; Film</h1>

      {atLimit ? (
        <div className="flex flex-col items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-900 dark:bg-amber-950/30">
          <p className="flex items-center gap-1.5 font-semibold text-amber-900 dark:text-amber-200">
            <Sparkles size={16} /> Free plan limit reached
          </p>
          <p className="text-amber-800 dark:text-amber-300">
            This team has posted {highlights.length}/{FREE_HIGHLIGHT_LIMIT} highlights on the free
            plan. Upgrade to Premium for unlimited highlights.
          </p>
          <Link
            href={`/teams/${teamId}/premium`}
            className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
          >
            Upgrade to Premium
          </Link>
        </div>
      ) : (
        <form
          action={postHighlight.bind(null, teamId)}
          className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              name="title"
              required
              placeholder="Title, e.g. Game-winning goal"
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
            <select
              name="playerId"
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            >
              <option value="">Whole team (no specific player)</option>
              {players.map((p) => (
                <option key={p.userId} value={p.userId}>
                  {p.user.name}
                </option>
              ))}
            </select>
          </div>
          <input
            name="videoUrl"
            required
            placeholder="Video link (YouTube, Hudl, Google Drive, etc.)"
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
          <textarea
            name="description"
            rows={2}
            placeholder="Description (optional)"
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
          <button
            type="submit"
            className="self-start rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Add Highlight
          </button>
          {!premium && (
            <p className="text-xs text-neutral-400">
              {highlights.length}/{FREE_HIGHLIGHT_LIMIT} highlights used on the free plan.
            </p>
          )}
        </form>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {highlights.length === 0 && (
          <p className="text-sm text-neutral-400">No highlights posted yet.</p>
        )}
        {highlights.map((h) => {
          const embed = toEmbedUrl(h.videoUrl);
          return (
            <div
              key={h.id}
              className="flex flex-col gap-2 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
            >
              {embed ? (
                <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
                  <iframe
                    src={embed}
                    className="h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : (
                <a
                  href={h.videoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex aspect-video w-full items-center justify-center gap-1.5 rounded-lg bg-neutral-900 text-sm font-medium text-white"
                >
                  <Play size={16} fill="currentColor" /> Watch video
                </a>
              )}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{h.title}</p>
                  <p className="text-xs text-neutral-500">
                    {h.user ? h.user.name : "Team"} · {formatDate(h.createdAt)}
                  </p>
                </div>
                <form action={deleteHighlight.bind(null, teamId, h.id)}>
                  <ConfirmButton
                    confirmText="Delete this highlight?"
                    className="text-xs text-red-600 hover:underline"
                  >
                    Delete
                  </ConfirmButton>
                </form>
              </div>
              {h.description && <p className="text-sm">{h.description}</p>}
              {h.user && (
                <div className="flex items-center gap-2 text-xs text-neutral-500">
                  <Avatar name={h.user.name} photoUrl={h.user.photoUrl} size={20} />
                  {h.user.name}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
