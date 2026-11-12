"use client";

import { useState, useTransition } from "react";
import { Flag } from "lucide-react";
import { reportContent } from "@/lib/actions/moderation";

const REASONS = [
  "Harassment or bullying",
  "Inappropriate or explicit content",
  "Spam",
  "Unsafe or concerning toward a minor",
  "Other",
];

export function ReportButton({
  teamId,
  targetType,
  targetId,
  className = "",
}: {
  teamId: string;
  targetType: "CHAT_MESSAGE" | "HIGHLIGHT" | "ANNOUNCEMENT";
  targetId: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);
  const [result, setResult] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (result) return <span className={`text-xs text-neutral-500 ${className}`}>{result}</span>;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`flex items-center gap-1 text-xs text-neutral-400 hover:text-red-600 ${className}`}
      >
        <Flag size={12} /> Report
      </button>
    );
  }

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      <select
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="rounded border border-neutral-300 bg-white px-1.5 py-1 text-xs text-neutral-800 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
      >
        {REASONS.map((r) => (
          <option key={r}>{r}</option>
        ))}
      </select>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await reportContent(teamId, targetType, targetId, reason);
            setResult(
              res.success ? "Reported. A coach or admin will review it." : res.error ?? "Couldn't send."
            );
          })
        }
        className="rounded bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
      >
        {pending ? "..." : "Send"}
      </button>
      <button type="button" onClick={() => setOpen(false)} className="text-xs text-neutral-400">
        Cancel
      </button>
    </div>
  );
}
