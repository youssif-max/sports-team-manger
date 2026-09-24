"use client";

import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { saveSubscription } from "@/lib/actions/push";

const DISMISS_KEY = "sportsync_notif_dismissed";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

async function resubscribeSilently() {
  try {
    const registration = await navigator.serviceWorker.ready;
    let sub = await registration.pushManager.getSubscription();
    if (!sub) {
      sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      });
    }
    await saveSubscription(
      sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
    );
  } catch {
    // best-effort only
  }
}

export function NotificationPrompt() {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("Notification" in window) ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    ) {
      return;
    }

    if (Notification.permission === "granted") {
      // Already granted at some point — make sure a live subscription still
      // exists (e.g. after clearing the service worker) without bothering
      // the user with any UI.
      void resubscribeSilently();
      return;
    }

    if (Notification.permission === "denied") return;
    if (localStorage.getItem(DISMISS_KEY)) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- depends on Notification.permission / localStorage, unavailable during SSR
    setVisible(true);
  }, []);

  async function handleEnable() {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        await resubscribeSilently();
      }
    } finally {
      setBusy(false);
      setVisible(false);
    }
  }

  function handleDismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-3 text-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-center gap-2">
        <Bell size={18} className="shrink-0 text-brand-600" />
        <p>Get notified about announcements and game results.</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={handleEnable}
          disabled={busy}
          className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {busy ? "Enabling..." : "Enable"}
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss"
          className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
