"use client";

import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { dataUrlToObjectUrl } from "@/lib/dataUrl";

export function PlayFileLink({ dataUrl, title }: { dataUrl: string; title: string }) {
  const [href, setHref] = useState<string | null>(null);

  useEffect(() => {
    // Object URLs must only ever be created on the client: creating one
    // during server rendering (Node supports the API too) produces a
    // different value than the client does, causing a hydration mismatch.
    const url = dataUrlToObjectUrl(dataUrl);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser-only resource, cannot be computed during render/SSR
    setHref(url);
    return () => URL.revokeObjectURL(url);
  }, [dataUrl]);

  return (
    <a
      href={href ?? undefined}
      download={title}
      className="flex aspect-[4/3] w-full items-center justify-center gap-1.5 rounded-lg bg-neutral-100 text-sm font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
    >
      <FileText size={16} /> {href ? "Open attached file" : "Loading..."}
    </a>
  );
}
