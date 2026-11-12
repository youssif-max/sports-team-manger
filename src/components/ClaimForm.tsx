"use client";

import { useActionState } from "react";
import Link from "next/link";
import { claimProfile } from "@/lib/actions/user";
import { authInputClass, authButtonClass } from "@/components/AuthShell";

export function ClaimForm({ token, defaultName }: { token: string; defaultName: string }) {
  const [state, formAction, pending] = useActionState(claimProfile.bind(null, token), undefined);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input name="name" required defaultValue={defaultName} placeholder="Full name" className={authInputClass} />
      <label className="text-sm font-medium text-neutral-500">
        Date of birth
        <input
          name="dateOfBirth"
          type="date"
          required
          max={new Date().toISOString().slice(0, 10)}
          className={`mt-1 w-full ${authInputClass} text-neutral-900 dark:text-neutral-100`}
        />
      </label>
      <input
        name="password"
        type="password"
        required
        autoComplete="new-password"
        placeholder="Password (min. 8 characters)"
        className={authInputClass}
      />
      <input
        name="confirmPassword"
        type="password"
        required
        autoComplete="new-password"
        placeholder="Confirm password"
        className={authInputClass}
      />
      <label className="flex items-start gap-2 text-xs text-neutral-600 dark:text-neutral-300">
        <input type="checkbox" name="terms" required className="mt-0.5" />
        <span>
          I agree to the{" "}
          <Link href="/terms" className="underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline">
            Privacy Policy
          </Link>
          .
        </span>
      </label>
      {state?.error && <p className="text-sm font-medium text-red-600">{state.error}</p>}
      <button type="submit" disabled={pending} className={authButtonClass}>
        {pending ? "Creating account..." : "Claim My Profile"}
      </button>
    </form>
  );
}
