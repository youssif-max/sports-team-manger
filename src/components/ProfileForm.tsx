"use client";

import { useActionState } from "react";
import { updateProfile } from "@/lib/actions/user";
import type { User } from "@prisma/client";

export function ProfileForm({ user }: { user: User }) {
  const [state, formAction, pending] = useActionState(updateProfile, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label className="text-sm font-medium">
        Full name
        <input
          name="name"
          required
          defaultValue={user.name}
          className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
      </label>

      <label className="text-sm font-medium">
        Email
        <input
          name="email"
          type="email"
          required
          defaultValue={user.email ?? ""}
          className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
      </label>

      <label className="text-sm font-medium">
        Phone
        <input
          name="phone"
          defaultValue={user.phone ?? ""}
          className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
      </label>

      <label className="text-sm font-medium">
        Photo URL
        <input
          name="photoUrl"
          placeholder="https://..."
          defaultValue={user.photoUrl ?? ""}
          className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
      </label>

      {state?.error && <p className="text-sm font-medium text-red-600">{state.error}</p>}
      {state?.success && <p className="text-sm font-medium text-green-600">Saved.</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 self-start rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? "Saving..." : "Save Changes"}
      </button>
    </form>
  );
}
