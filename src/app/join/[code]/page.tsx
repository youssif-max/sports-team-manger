import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getMembership } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { InviteJoinForm } from "@/components/InviteJoinForm";
import { teamTypeLabel } from "@/lib/format";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code: rawCode } = await params;
  const code = rawCode.trim().toUpperCase();

  const team = await prisma.team.findUnique({ where: { joinCode: code } });

  const user = await getCurrentUser();
  if (user && team) {
    const existing = await getMembership(team.id, user.id);
    if (existing) redirect(`/teams/${team.id}`);
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-4 py-10">
      <div className="text-center">
        <Logo className="text-2xl" />
      </div>

      {!team ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-6 text-center dark:border-neutral-800 dark:bg-neutral-900">
          <p className="font-semibold">That invite link isn&apos;t valid.</p>
          <p className="mt-1 text-sm text-neutral-500">
            Double check the link, or ask for a new one.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
          <p className="text-center text-sm text-neutral-500">You&apos;re invited to join</p>
          <h1 className="mt-1 text-center text-xl font-bold">{team.name}</h1>
          <p className="mb-6 text-center text-sm text-neutral-500">
            {teamTypeLabel(team.teamType)} · {team.sport}
            {team.season ? ` · ${team.season}` : ""}
          </p>

          {user ? (
            <InviteJoinForm code={code} />
          ) : (
            <div className="flex flex-col gap-3">
              <Link
                href={`/signup?redirect=/join/${code}`}
                className="rounded-lg bg-brand-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-brand-700"
              >
                Create an account to join
              </Link>
              <Link
                href={`/login?redirect=/join/${code}`}
                className="rounded-lg border border-neutral-300 px-4 py-2 text-center text-sm font-semibold hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
              >
                Already have an account? Sign in
              </Link>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
