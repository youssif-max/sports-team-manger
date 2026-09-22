"use client";

import { useEffect, useMemo } from "react";
import { FileText } from "lucide-react";

function dataUrlToObjectUrl(dataUrl: string): string {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/data:(.*?);base64/)?.[1] ?? "application/octet-stream";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return URL.createObjectURL(new Blob([bytes], { type: mime }));
}

export function PlayFileLink({ dataUrl, title }: { dataUrl: string; title: string }) {
  const href = useMemo(() => dataUrlToObjectUrl(dataUrl), [dataUrl]);

  useEffect(() => {
    return () => URL.revokeObjectURL(href);
  }, [href]);

  return (
    <a
      href={href}
      download={title}
      className="flex aspect-[4/3] w-full items-center justify-center gap-1.5 rounded-lg bg-neutral-100 text-sm font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
    >
      <FileText size={16} /> Open attached file
    </a>
  );
}
