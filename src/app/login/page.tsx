import { prisma } from "@/lib/prisma";
import { switchToUser, createProfile } from "@/lib/actions/user";
import { initials } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const users = await prisma.user.findMany({ orderBy: { name: "asc" } });

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-4 py-10">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">🏆 SportSync</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Sports team management for every sport.
        </p>
      </div>

      {users.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-neutral-500">
            Who&apos;s this?
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {users.map((u) => (
              <form action={switchToUser} key={u.id}>
                <input type="hidden" name="userId" value={u.id} />
                <button
                  type="submit"
                  className="flex w-full items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3 text-left shadow-sm transition hover:border-blue-400 hover:shadow dark:border-neutral-800 dark:bg-neutral-900"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
                    {initials(u.name)}
                  </span>
                  <span className="truncate text-sm font-medium">{u.name}</span>
                </button>
              </form>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-3 text-sm font-semibold text-neutral-500">
          {users.length > 0 ? "Or create a new profile" : "Create your profile to get started"}
        </h2>
        <form action={createProfile} className="flex flex-col gap-3">
          <input
            name="name"
            required
            placeholder="Full name"
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
          <input
            name="email"
            type="email"
            placeholder="Email (optional)"
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
          <input
            name="phone"
            placeholder="Phone (optional)"
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
          <button
            type="submit"
            className="mt-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Continue
          </button>
        </form>
      </div>

      <p className="text-center text-xs text-neutral-400">
        No password needed — pick your name each time you use a new device.
      </p>
    </main>
  );
}
