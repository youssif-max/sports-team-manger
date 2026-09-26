"use client";

import { useActionState, useRef, useEffect } from "react";
import { changePassword } from "@/lib/actions/user";

export function PasswordForm() {
  const [state, formAction, pending] = useActionState(changePassword, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      <label className="text-sm font-medium">
        Current password
        <input
          name="currentPassword"
          type="password"
          required
          className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
      </label>
      <label className="text-sm font-medium">
        New password
        <input
          name="newPassword"
          type="password"
          required
          placeholder="Min. 8 characters"
          className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
      </label>
      <label className="text-sm font-medium">
        Confirm new password
        <input
          name="confirmPassword"
          type="password"
          required
          className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
      </label>

      {state?.error && <p className="text-sm font-medium text-red-600">{state.error}</p>}
      {state?.success && (
        <p className="text-sm font-medium text-green-600">
          Password changed. You&apos;ve been signed out everywhere else.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 self-start rounded-lg bg-neutral-800 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-700 disabled:opacity-60 dark:bg-neutral-100 dark:text-neutral-900"
      >
        {pending ? "Updating..." : "Change Password"}
      </button>
    </form>
  );
}
