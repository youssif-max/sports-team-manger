"use client";

import { useEffect, useState } from "react";
import { X, FileText } from "lucide-react";
import { PlayFileLink } from "@/components/PlayFileLink";
import { dataUrlToObjectUrl } from "@/lib/dataUrl";

export function PlayThumbnail({
  diagram,
  thumbnail,
  title,
}: {
  diagram: string;
  thumbnail: string | null;
  title: string;
}) {
  const [failed, setFailed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const isDiagramImage = diagram.startsWith("data:image/");
  const cover = isDiagramImage ? diagram : thumbnail;

  useEffect(() => {
    if (!expanded) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [expanded]);

  // Neither the full file itself, nor a generated cover, is an image we can
  // show — just offer the full file as a download/open link.
  if (failed || !cover) {
    return <PlayFileLink dataUrl={diagram} title={title} />;
  }

  // The full file IS an image: tapping the cover opens that same image full
  // size in a lightbox, right on the page.
  if (isDiagramImage) {
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
            src={cover}
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
              src={cover}
              alt={title}
              className="max-h-full max-w-full rounded-lg object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </>
    );
  }

  // The full file is something else (a PDF, etc.) with only a cover preview
  // available: show that cover, but tapping opens/downloads the complete
  // original file, never just the cover image.
  return <CoverOpensFullFile diagram={diagram} cover={cover} title={title} onCoverError={() => setFailed(true)} />;
}

function CoverOpensFullFile({
  diagram,
  cover,
  title,
  onCoverError,
}: {
  diagram: string;
  cover: string;
  title: string;
  onCoverError: () => void;
}) {
  const [href, setHref] = useState<string | null>(null);

  useEffect(() => {
    // Must run client-only: creating the object URL during server rendering
    // (Node supports the API too) would produce a different value than the
    // client and cause a hydration mismatch.
    const url = dataUrlToObjectUrl(diagram);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser-only resource, cannot be computed during render/SSR
    setHref(url);
    return () => URL.revokeObjectURL(url);
  }, [diagram]);

  return (
    <a href={href ?? undefined} download={title} className="relative block">
      {/* eslint-disable-next-line @next/next/no-img-element -- locally-generated cover preview, not optimizable by next/image */}
      <img
        src={cover}
        alt={title}
        onError={onCoverError}
        className="w-full rounded-lg border border-neutral-200 dark:border-neutral-800"
      />
      <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-black/70 px-2 py-1 text-xs font-medium text-white">
        <FileText size={12} /> Open full file
      </span>
    </a>
  );
}
