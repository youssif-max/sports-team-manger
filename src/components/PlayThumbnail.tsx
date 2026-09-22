"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { PlayFileLink } from "@/components/PlayFileLink";

export function PlayThumbnail({ diagram, title }: { diagram: string; title: string }) {
  const [failed, setFailed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [expanded]);

  if (failed) {
    return <PlayFileLink dataUrl={diagram} title={title} />;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="block w-full cursor-zoom-in"
        aria-label={`View ${title} full size`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- locally-drawn/uploaded data URL, not optimizable by next/image */}
        <img
          src={diagram}
          alt={title}
          onError={() => setFailed(true)}
          className="w-full rounded-lg border border-neutral-200 dark:border-neutral-800"
        />
      </button>

      {expanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setExpanded(false)}
        >
          <button
            type="button"
            onClick={() => setExpanded(false)}
            aria-label="Close"
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
          >
            <X size={20} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element -- locally-drawn/uploaded data URL, not optimizable by next/image */}
          <img
            src={diagram}
            alt={title}
            className="max-h-full max-w-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
