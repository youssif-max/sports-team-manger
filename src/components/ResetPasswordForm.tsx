"use client";

import { useActionState } from "react";
import { resetPassword } from "@/lib/actions/user";
import { authInputClass, authButtonClass } from "@/components/AuthShell";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(resetPassword.bind(null, token), undefined);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input
        name="password"
        type="password"
        required
        autoComplete="new-password"
        placeholder="New password (min. 8 characters)"
        className={authInputClass}
      />
      <input
        name="confirmPassword"
        type="password"
        required
        autoComplete="new-password"
        placeholder="Confirm new password"
        className={authInputClass}
      />
      {state?.error && <p className="text-sm font-medium text-red-600">{state.error}</p>}
      <button type="submit" disabled={pending} className={authButtonClass}>
        {pending ? "Saving..." : "Set New Password"}
      </button>
    </form>
  );
}
