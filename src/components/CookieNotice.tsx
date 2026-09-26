"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "sportsync-cookie-notice-dismissed";

export function CookieNotice() {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    let alreadyDismissed = true;
    try {
      alreadyDismissed = localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      // localStorage unavailable (private browsing, etc.) — just don't show the notice
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads from localStorage, unavailable during SSR; must run post-mount
    setDismissed(alreadyDismissed);
  }, []);

  if (dismissed) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
    setDismissed(true);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex flex-wrap items-center justify-center gap-3 border-t border-neutral-200 bg-white/95 px-4 py-3 text-xs text-neutral-600 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95 dark:text-neutral-400">
      <p>
        We use one essential cookie to keep you signed in — no ads, no tracking. See our{" "}
        <Link href="/cookies" className="font-medium text-brand-600 hover:underline">
          Cookie Policy
        </Link>
        .
      </p>
      <button
        type="button"
        onClick={dismiss}
        className="rounded-lg bg-neutral-900 px-3 py-1.5 font-semibold text-white dark:bg-neutral-100 dark:text-neutral-900"
      >
        Got it
      </button>
    </div>
  );
}
