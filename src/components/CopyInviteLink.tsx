"use client";

import { useState } from "react";
import { Link2, Check } from "lucide-react";

export function CopyInviteLink({ joinCode }: { joinCode: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const url = `${window.location.origin}/join/${joinCode}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard API unavailable — fall back to a manual prompt.
      window.prompt("Copy this invite link:", url);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold backdrop-blur hover:bg-white/30"
    >
      {copied ? <Check size={13} /> : <Link2 size={13} />}
      {copied ? "Copied!" : "Copy invite link"}
    </button>
  );
}
