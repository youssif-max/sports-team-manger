"use client";

import { useActionState, useState } from "react";
import { deleteMyAccount } from "@/lib/actions/user";

export function DeleteAccountForm() {
  const [state, formAction, pending] = useActionState(deleteMyAccount, undefined);
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="self-start rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/40"
      >
        Delete My Account
      </button>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <p className="text-sm text-neutral-600 dark:text-neutral-300">
        This permanently deletes your account and everything tied to it — roster entries, chat
        messages, announcements you posted, and stats. This can&apos;t be undone.
      </p>
      <label className="text-sm font-medium">
        Enter your password to confirm
        <input
          name="password"
          type="password"
          required
          className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
      </label>

      {state?.error && <p className="text-sm font-medium text-red-600">{state.error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
        >
          {pending ? "Deleting..." : "Permanently Delete Account"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
