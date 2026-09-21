"use client";

import { useActionState } from "react";
import { joinTeamByCode } from "@/lib/actions/team";

export function JoinTeamForm() {
  const [state, formAction, pending] = useActionState(joinTeamByCode, undefined);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
    >
      <h2 className="text-sm font-semibold text-neutral-500">Join a Team</h2>
      <p className="text-xs text-neutral-500">
        Ask your coach or team admin for the team&apos;s join code.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          name="joinCode"
          required
          placeholder="Join code (e.g. 4F7K2P)"
          maxLength={6}
          className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm uppercase tracking-widest dark:border-neutral-700 dark:bg-neutral-900"
        />
        <select
          name="role"
          defaultValue="PLAYER"
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        >
          <option value="PLAYER">I&apos;m a Player</option>
          <option value="PARENT">I&apos;m a Parent</option>
        </select>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-neutral-800 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-700 disabled:opacity-60 dark:bg-neutral-100 dark:text-neutral-900"
        >
          {pending ? "Joining..." : "Join"}
        </button>
      </div>
      {state?.error && <p className="text-sm font-medium text-red-600">{state.error}</p>}
    </form>
  );
}
