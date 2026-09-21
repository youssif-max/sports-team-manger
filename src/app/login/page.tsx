"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signIn } from "@/lib/actions/user";
import { Logo } from "@/components/Logo";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(signIn, undefined);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-4 py-10">
      <div className="text-center">
        <Logo className="text-2xl" />
        <h1 className="sr-only">Sign in</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Sports team management for every sport.
        </p>
      </div>

      <form action={formAction} className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-neutral-500">Sign in</h2>
        <input
          name="email"
          type="email"
          required
          placeholder="Email"
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
        <input
          name="password"
          type="password"
          required
          placeholder="Password"
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
          {pending ? "Signing in..." : "Sign In"}
        </button>
      </form>

      <p className="text-center text-sm text-neutral-500">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-medium text-brand-600 hover:underline">
          Sign up
        </Link>
      </p>
    </main>
  );
}
