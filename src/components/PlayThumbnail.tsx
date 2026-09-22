"use client";

import { useState } from "react";
import { PlayFileLink } from "@/components/PlayFileLink";

export function PlayThumbnail({ diagram, title }: { diagram: string; title: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <PlayFileLink dataUrl={diagram} title={title} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- locally-drawn/uploaded data URL, not optimizable by next/image
    <img
      src={diagram}
      alt={title}
      onError={() => setFailed(true)}
      className="w-full rounded-lg border border-neutral-200 dark:border-neutral-800"
    />
  );
}
