"use client";

import { useActionState, useState } from "react";
import { updateProfile } from "@/lib/actions/user";
import type { User } from "@prisma/client";

const inputClass =
  "mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900";

export function ProfileForm({
  user,
}: {
  user: Pick<User, "name" | "email" | "phone" | "photoUrl" | "emailVerifiedAt">;
}) {
  const [state, formAction, pending] = useActionState(updateProfile, undefined);
  const [email, setEmail] = useState(user.email ?? "");
  const emailChanged = email.trim().toLowerCase() !== (user.email ?? "");

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label className="text-sm font-medium">
        Full name
        <input name="name" required defaultValue={user.name} className={inputClass} />
      </label>

      <label className="text-sm font-medium">
        Email
        <input
          name="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
        <span className="mt-1 block text-xs font-normal text-neutral-400">
          {user.emailVerifiedAt ? "Verified." : "Not verified yet."} Password reset links go to this
          address.
        </span>
      </label>

      {emailChanged && (
        <label className="text-sm font-medium">
          Current password (needed to change your email)
          <input
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            className={inputClass}
          />
        </label>
      )}

      <label className="text-sm font-medium">
        Phone
        <input name="phone" defaultValue={user.phone ?? ""} className={inputClass} />
      </label>

      <label className="text-sm font-medium">
        Photo URL
        <input
          name="photoUrl"
          placeholder="https://..."
          defaultValue={user.photoUrl ?? ""}
          className={inputClass}
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
