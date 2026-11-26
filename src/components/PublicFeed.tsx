"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Play, Volume2, VolumeX } from "lucide-react";
import { ReportButton } from "@/components/ReportButton";
import { BlockButton } from "@/components/BlockButton";
import { ConfirmButton } from "@/components/ConfirmButton";
import { deleteHighlight } from "@/lib/actions/community";

export type FeedItem = {
  id: string;
  teamId: string;
  title: string;
  description: string | null;
  posterId: string | null;
  posterFirstName: string;
  sport: string;
  dateLabel: string;
  // Exactly one of these is set.
  fileUrl: string | null;
  embedUrl: string | null;
  canDelete: boolean;
  canReport: boolean;
};

// A vertical, one-video-at-a-time feed (swipe/scroll to the next). Only the
// video on screen plays, and only slides near the screen load their media, so
// scrolling stays light on data.
export function PublicFeed({ items, olderHref }: { items: FeedItem[]; olderHref: string | null }) {
  const [muted, setMuted] = useState(true);

  return (
    <div className="h-[calc(100dvh-8rem)] min-h-[420px] snap-y snap-mandatory overflow-y-auto overscroll-contain rounded-xl bg-neutral-950">
      {items.map((item) => (
        <Slide key={item.id} item={item} muted={muted} onToggleMute={() => setMuted((m) => !m)} />
      ))}
      <section className="flex h-full snap-start flex-col items-center justify-center gap-3 p-6 text-center text-white">
        {olderHref ? (
          <>
            <p className="text-sm text-neutral-300">Want more?</p>
            <Link
              href={olderHref}
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-neutral-900"
            >
              Older highlights
            </Link>
          </>
        ) : (
          <p className="text-sm text-neutral-300">You&apos;re all caught up. Post one of your own!</p>
        )}
      </section>
    </div>
  );
}

function Slide({
  item,
  muted,
  onToggleMute,
}: {
  item: FeedItem;
  muted: boolean;
  onToggleMute: () => void;
}) {
  const rootRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [near, setNear] = useState(false);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const nearObs = new IntersectionObserver(([e]) => setNear(e.isIntersecting), {
      rootMargin: "100% 0px",
    });
    const activeObs = new IntersectionObserver(([e]) => setActive(e.isIntersecting), {
      threshold: 0.6,
    });
    nearObs.observe(el);
    activeObs.observe(el);
    return () => {
      nearObs.disconnect();
      activeObs.disconnect();
    };
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = muted;
    if (active) v.play().catch(() => undefined);
    else v.pause();
  }, [active, muted, near]);

  const youtubeSrc = item.embedUrl
    ? `${item.embedUrl}${item.embedUrl.includes("?") ? "&" : "?"}autoplay=1&mute=${muted ? 1 : 0}&playsinline=1&loop=1`
    : null;

  return (
    <section ref={rootRef} className="flex h-full snap-start flex-col bg-black text-white">
      <div className="relative min-h-0 flex-1 bg-black">
        {item.fileUrl ? (
          near ? (
            <video
              ref={videoRef}
              src={item.fileUrl}
              loop
              muted
              playsInline
              preload={active ? "auto" : "metadata"}
              className="h-full w-full object-contain"
            />
          ) : null
        ) : active && youtubeSrc ? (
          <iframe
            src={youtubeSrc}
            title={item.title}
            referrerPolicy="strict-origin-when-cross-origin"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-neutral-500">
            <Play size={36} />
          </div>
        )}

        {item.fileUrl && (
          <button
            type="button"
            onClick={onToggleMute}
            aria-label={muted ? "Turn sound on" : "Turn sound off"}
            className="absolute right-3 top-3 rounded-full bg-black/60 p-2 text-white backdrop-blur hover:bg-black/80"
          >
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
        )}
      </div>

      <div className="flex flex-col gap-1.5 bg-neutral-900 px-4 py-3">
        <p className="text-base font-semibold leading-tight">{item.title}</p>
        <p className="text-xs text-neutral-400">
          {item.posterFirstName} · {item.sport} · {item.dateLabel}
        </p>
        {item.description && <p className="line-clamp-2 text-sm text-neutral-200">{item.description}</p>}
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
          {item.canReport && (
            <ReportButton teamId={item.teamId} targetType="HIGHLIGHT" targetId={item.id} />
          )}
          {item.canReport && item.posterId && (
            <BlockButton userId={item.posterId} name={item.posterFirstName} />
          )}
          {item.canDelete && (
            <form action={deleteHighlight.bind(null, item.teamId, item.id)}>
              <ConfirmButton
                confirmText="Delete this highlight?"
                className="text-xs text-red-400 hover:underline"
              >
                Delete
              </ConfirmButton>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
