"use client";

import { useActionState } from "react";
import { joinTeamByCode } from "@/lib/actions/team";

export function InviteJoinForm({ code }: { code: string }) {
  const [state, formAction, pending] = useActionState(joinTeamByCode, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="joinCode" value={code} />
      <label className="text-sm font-medium">
        I&apos;m joining as a
        <select
          name="role"
          defaultValue="PLAYER"
          className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        >
          <option value="PLAYER">Player</option>
          <option value="PARENT">Parent</option>
        </select>
      </label>
      {state?.error && <p className="text-sm font-medium text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? "Joining..." : "Join Team"}
      </button>
    </form>
  );
}
