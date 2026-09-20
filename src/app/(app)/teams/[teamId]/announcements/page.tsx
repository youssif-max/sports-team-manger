import { prisma } from "@/lib/prisma";
import { Avatar } from "@/components/Avatar";
import { ConfirmButton } from "@/components/ConfirmButton";
import { postAnnouncement, deleteAnnouncement } from "@/lib/actions/community";
import { formatDateTime } from "@/lib/format";
import { getCurrentUser } from "@/lib/auth";

export default async function AnnouncementsPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const [announcements, user] = await Promise.all([
    prisma.announcement.findMany({
      where: { teamId },
      include: { author: true },
      orderBy: { createdAt: "desc" },
    }),
    getCurrentUser(),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <h1 className="text-xl font-bold">Announcements</h1>

      <form
        action={postAnnouncement.bind(null, teamId)}
        className="flex flex-col gap-2 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
      >
        <input
          name="title"
          required
          placeholder="Title"
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
        <textarea
          name="body"
          required
          rows={3}
          placeholder="Write an announcement for the team..."
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
        <button
          type="submit"
          className="self-start rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Post
        </button>
      </form>

      <div className="flex flex-col gap-3">
        {announcements.length === 0 && (
          <p className="text-sm text-neutral-400">No announcements yet.</p>
        )}
        {announcements.map((a) => (
          <div
            key={a.id}
            className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <Avatar name={a.author.name} photoUrl={a.author.photoUrl} size={28} />
                <div>
                  <p className="text-sm font-semibold">{a.title}</p>
                  <p className="text-xs text-neutral-500">
                    {a.author.name} · {formatDateTime(a.createdAt)}
                  </p>
                </div>
              </div>
              {user?.id === a.authorId && (
                <form action={deleteAnnouncement.bind(null, teamId, a.id)}>
                  <ConfirmButton
                    confirmText="Delete this announcement?"
                    className="text-xs text-red-600 hover:underline"
                  >
                    Delete
                  </ConfirmButton>
                </form>
              )}
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm">{a.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
