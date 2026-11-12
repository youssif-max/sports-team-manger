"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/lib/actions/user";
import { AuthShell, authInputClass, authButtonClass } from "@/components/AuthShell";

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, undefined);

  return (
    <AuthShell
      title="Forgot your password?"
      subtitle="Enter your email and we'll send you a link to reset it."
    >
      <form action={formAction} className="flex flex-col gap-3">
        <input
          name="email"
          type="email"
          required
          placeholder="Email"
          autoComplete="email"
          className={authInputClass}
        />
        {state?.error && <p className="text-sm font-medium text-red-600">{state.error}</p>}
        {state?.message && (
          <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800 dark:bg-green-950 dark:text-green-200">
            {state.message}
          </p>
        )}
        <button type="submit" disabled={pending} className={authButtonClass}>
          {pending ? "Sending..." : "Send Reset Link"}
        </button>
      </form>
      <p className="text-center text-sm text-neutral-500">
        <Link href="/login" className="font-medium text-brand-600 hover:underline">
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  );
}
