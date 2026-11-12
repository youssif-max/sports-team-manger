"use client";

import { useState, useTransition } from "react";
import { resendVerification } from "@/lib/actions/user";

export function VerifyEmailBanner({ email }: { email: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-yellow-50 px-4 py-2.5 text-sm text-yellow-900 dark:bg-yellow-950 dark:text-yellow-200">
      <p>
        {message ?? (
          <>
            Confirm <strong>{email}</strong> so you can reset your password if you ever forget it.
          </>
        )}
      </p>
      {!message && (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await resendVerification();
              setMessage(result?.message ?? result?.error ?? "Done.");
            })
          }
          className="rounded-lg bg-yellow-600 px-3 py-1 text-xs font-semibold text-white hover:bg-yellow-700 disabled:opacity-60"
        >
          {pending ? "Sending..." : "Send confirmation email"}
        </button>
      )}
    </div>
  );
}
