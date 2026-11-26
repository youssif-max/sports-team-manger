"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban } from "lucide-react";
import { blockUser } from "@/lib/actions/moderation";

// Hides everything from one person for the signed-in user (undo in Account Settings).
export function BlockButton({ userId, name, className = "" }: { userId: string; name: string; className?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  return (
    <span className={className}>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!confirm(`Block ${name}? You won't see their highlights or chat messages. You can undo this in Account Settings.`)) return;
          startTransition(async () => {
            const res = await blockUser(userId);
            if (res.error) setError(res.error);
            else router.refresh();
          });
        }}
        className="flex items-center gap-1 text-xs text-neutral-400 hover:text-red-600 disabled:opacity-60"
      >
        <Ban size={12} /> {pending ? "Blocking..." : "Block"}
      </button>
      {error && <span className="ml-2 text-xs text-red-600">{error}</span>}
    </span>
  );
}
