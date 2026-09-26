"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { signUp } from "@/lib/actions/user";
import { Logo } from "@/components/Logo";

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signUp, undefined);
  const [redirectTo, setRedirectTo] = useState("/");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads from window.location, unavailable during SSR; must run post-mount
    setRedirectTo(params.get("redirect") || "/");
  }, []);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-4 py-10">
      <div className="text-center">
        <Logo className="text-2xl" />
        <h1 className="sr-only">Create account</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Create your account to join or start a team.
        </p>
      </div>

      <form action={formAction} className="flex flex-col gap-3">
        <input type="hidden" name="redirect" value={redirectTo} />
        <input
          name="name"
          required
          placeholder="Full name"
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
        <input
          name="email"
          type="email"
          required
          placeholder="Email"
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
        <label className="text-sm font-medium text-neutral-500">
          Date of birth
          <input
            name="dateOfBirth"
            type="date"
            required
            max={new Date().toISOString().slice(0, 10)}
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
          />
        </label>
        <input
          name="password"
          type="password"
          required
          placeholder="Password (min. 8 characters)"
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
        <input
          name="confirmPassword"
          type="password"
          required
          placeholder="Confirm password"
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
        {state?.error && (
          <p className="text-sm font-medium text-red-600">{state.error}</p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="mt-1 rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {pending ? "Creating account..." : "Create Account"}
        </button>
      </form>

      <p className="text-center text-sm text-neutral-500">
        Already have an account?{" "}
        <Link
          href={redirectTo === "/" ? "/login" : `/login?redirect=${encodeURIComponent(redirectTo)}`}
          className="font-medium text-brand-600 hover:underline"
        >
          Sign in
        </Link>
      </p>

      <p className="text-center text-xs text-neutral-400">
        By creating an account, you agree to our{" "}
        <Link href="/terms" className="underline hover:text-neutral-600 dark:hover:text-neutral-300">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="underline hover:text-neutral-600 dark:hover:text-neutral-300">
          Privacy Policy
        </Link>
        .
      </p>
    </main>
  );
}
