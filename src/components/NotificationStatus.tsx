"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { resubscribeSilently } from "@/components/NotificationPrompt";

type PermissionState = "unsupported" | "default" | "granted" | "denied";

export function NotificationStatus() {
  const [permission, setPermission] = useState<PermissionState>("unsupported");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supported =
      typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads Notification.permission, unavailable during SSR
    setPermission(supported ? (Notification.permission as PermissionState) : "unsupported");
  }, []);

  async function handleEnable() {
    setBusy(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result as PermissionState);
      if (result === "granted") await resubscribeSilently();
    } finally {
      setBusy(false);
    }
  }

  if (permission === "unsupported") {
    return (
      <p className="text-sm text-neutral-500">
        Push notifications aren&apos;t supported in this browser. On iPhone, add SportSync to your
        Home Screen first, then open it from there.
      </p>
    );
  }

  if (permission === "granted") {
    return (
      <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-500">
        <Bell size={16} />
        <span>Notifications are on for this device.</span>
      </div>
    );
  }

  if (permission === "denied") {
    return (
      <div className="flex items-center gap-2 text-sm text-neutral-500">
        <BellOff size={16} />
        <span>
          Notifications are blocked. Enable them for this site in your browser&apos;s settings to
          turn them back on.
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <p className="text-sm text-neutral-500">
        Get notified about announcements and game results.
      </p>
      <button
        type="button"
        onClick={handleEnable}
        disabled={busy}
        className="shrink-0 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {busy ? "Enabling..." : "Enable"}
      </button>
    </div>
  );
}
