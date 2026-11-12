import Link from "next/link";
import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getMembership } from "@/lib/auth";
import { isTeamPremium } from "@/lib/billing";
import { updateTeamSettings, regenerateJoinCode } from "@/lib/actions/team";
import { ConfirmButton } from "@/components/ConfirmButton";
import { isNativeApp } from "@/lib/nativeApp";

export default async function TeamSettingsPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;

  const user = await getCurrentUser();
  const membership = user ? await getMembership(teamId, user.id) : null;
  if (!membership || membership.role !== "ADMIN") {
    redirect(`/teams/${teamId}`);
  }

  const team = await prisma.team.findUniqueOrThrow({ where: { id: teamId } });
  const premium = isTeamPremium(team);
  const native = await isNativeApp();
  const action = updateTeamSettings.bind(null, teamId);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
      <h1 className="text-xl font-bold">Team Settings</h1>

      <section className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="text-sm font-semibold uppercase text-neutral-400">Join code</h2>
        <p className="text-sm">
          Current code: <span className="font-mono font-semibold tracking-widest">{team.joinCode}</span>
        </p>
        <p className="text-xs text-neutral-500">
          If the code was shared with someone it shouldn&apos;t have been, generate a new one. The
          old code and invite links stop working immediately; current members aren&apos;t affected.
        </p>
        <form action={regenerateJoinCode.bind(null, teamId)}>
          <ConfirmButton
            confirmText="Generate a new join code? The old code and any invite links will stop working."
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-semibold hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            Generate new code
          </ConfirmButton>
        </form>
        <Link
          href={`/teams/${teamId}/audit`}
          className="self-start text-xs font-medium text-brand-600 hover:underline"
        >
          View activity log →
        </Link>
      </section>

      <form action={action} className="flex flex-col gap-4">
        <section className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="text-sm font-semibold uppercase text-neutral-400">General</h2>
          <label className="text-sm font-medium">
            Team name
            <input
              name="name"
              required
              defaultValue={team.name}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
          </label>
          <label className="text-sm font-medium">
            Season
            <input
              name="season"
              defaultValue={team.season ?? ""}
              placeholder="e.g. Fall 2026"
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
          </label>
        </section>

        <section className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="text-sm font-semibold uppercase text-neutral-400">Privacy</h2>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              name="requireApproval"
              defaultChecked={team.requireApproval}
              className="mt-0.5 h-4 w-4"
            />
            <span>
              <span className="font-medium">Approve new members</span>
              <span className="block text-xs text-neutral-500">
                Anyone using your join code or invite link waits for an admin or coach to let them
                in. Recommended for youth teams.
              </span>
            </span>
          </label>
        </section>

        <section className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase text-neutral-400">Branding</h2>
            {!premium && (
              <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                <Sparkles size={12} /> Premium
              </span>
            )}
          </div>

          {premium ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm font-medium">
                  Primary color
                  <input
                    type="color"
                    name="colorPrimary"
                    defaultValue={team.colorPrimary ?? "#1d4ed8"}
                    className="mt-1 h-10 w-full rounded-lg border border-neutral-300 dark:border-neutral-700"
                  />
                </label>
                <label className="text-sm font-medium">
                  Secondary color
                  <input
                    type="color"
                    name="colorSecondary"
                    defaultValue={team.colorSecondary ?? "#0f172a"}
                    className="mt-1 h-10 w-full rounded-lg border border-neutral-300 dark:border-neutral-700"
                  />
                </label>
              </div>
              <label className="text-sm font-medium">
                Logo URL
                <input
                  name="logoUrl"
                  placeholder="https://..."
                  defaultValue={team.logoUrl ?? ""}
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                />
              </label>
            </>
          ) : (
            <div className="flex flex-col items-start gap-2 text-sm text-neutral-500">
              <p>Custom colors and a team logo are a Premium feature.</p>
              {!native && (
                <Link
                  href={`/teams/${teamId}/premium`}
                  className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
                >
                  Upgrade to Premium
                </Link>
              )}
            </div>
          )}
        </section>

        <button
          type="submit"
          className="self-start rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Save Changes
        </button>
      </form>
    </div>
  );
}
