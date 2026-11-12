"use client";

import { useActionState } from "react";
import Link from "next/link";
import { verifyLoginChallenge } from "@/lib/actions/twofactor";
import { Logo } from "@/components/Logo";

export default function VerifyLoginPage() {
  const [state, formAction, pending] = useActionState(verifyLoginChallenge, undefined);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-4 py-10">
      <div className="text-center">
        <Logo className="text-2xl" />
        <h1 className="mt-3 text-lg font-bold">Two-step verification</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Enter the 6-digit code from your authenticator app. Lost your phone? Use one of your
          recovery codes instead.
        </p>
      </div>

      <form action={formAction} className="flex flex-col gap-3">
        <input
          name="code"
          required
          autoFocus
          autoComplete="one-time-code"
          inputMode="text"
          placeholder="123456 or recovery code"
          aria-label="Verification code"
          className="rounded-lg border border-neutral-300 px-3 py-2 text-center text-lg tracking-widest dark:border-neutral-700 dark:bg-neutral-900"
        />
        {state?.error && <p className="text-sm font-medium text-red-600">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {pending ? "Verifying..." : "Verify"}
        </button>
      </form>

      <p className="text-center text-sm text-neutral-500">
        <Link href="/login" className="font-medium text-brand-600 hover:underline">
          Back to sign in
        </Link>
      </p>
    </main>
  );
}
