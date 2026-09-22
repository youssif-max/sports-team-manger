"use client";

import { useRef, useState } from "react";
import { PlayCanvas, type PlayCanvasHandle } from "@/components/PlayCanvas";
import { createPlay } from "@/lib/actions/plays";

export function NewPlayForm({ teamId, sport }: { teamId: string; sport: string }) {
  const canvasRef = useRef<PlayCanvasHandle>(null);
  const diagramInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"draw" | "link">("draw");
  const action = createPlay.bind(null, teamId);

  function handleSubmit() {
    if (mode === "draw" && diagramInputRef.current) {
      diagramInputRef.current.value = canvasRef.current?.getDataUrl() ?? "";
    } else if (diagramInputRef.current) {
      diagramInputRef.current.value = "";
    }
  }

  return (
    <form action={action} onSubmit={handleSubmit} className="flex flex-col gap-4">
      <input type="hidden" name="diagram" ref={diagramInputRef} />

      <input
        name="title"
        required
        placeholder="Play name, e.g. Pick and Roll"
        className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
      />
      <textarea
        name="description"
        rows={2}
        placeholder="Description (optional)"
        className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
      />

      <div className="inline-flex w-fit rounded-lg border border-neutral-200 p-1 dark:border-neutral-800">
        {(["draw", "link"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`rounded-md px-3 py-1 text-sm font-medium transition ${
              mode === m
                ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
            }`}
          >
            {m === "draw" ? "Draw a play" : "Attach a file"}
          </button>
        ))}
      </div>

      {mode === "draw" ? (
        <PlayCanvas ref={canvasRef} sport={sport} />
      ) : (
        <input
          name="fileUrl"
          placeholder="Link to an image, PDF, or video (Google Drive, Hudl, etc.)"
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
      )}

      <button
        type="submit"
        className="self-start rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
      >
        Save Play
      </button>
    </form>
  );
}
