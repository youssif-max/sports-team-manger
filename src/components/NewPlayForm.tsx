"use client";

import { useRef, useState } from "react";
import { PlayCanvas, type PlayCanvasHandle } from "@/components/PlayCanvas";
import { createPlay } from "@/lib/actions/plays";
import { resizeImageFile } from "@/lib/resizeImage";

type Mode = "draw" | "upload" | "link";

export function NewPlayForm({ teamId, sport }: { teamId: string; sport: string }) {
  const canvasRef = useRef<PlayCanvasHandle>(null);
  const diagramInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<Mode>("draw");
  const [preview, setPreview] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const action = createPlay.bind(null, teamId);

  function switchMode(m: Mode) {
    setMode(m);
    setError(null);
    if (m !== "upload") setPreview(null);
    if (m === "link" && diagramInputRef.current) diagramInputRef.current.value = "";
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setProcessing(true);
    setError(null);
    try {
      const dataUrl = await resizeImageFile(file);
      if (diagramInputRef.current) diagramInputRef.current.value = dataUrl;
      setPreview(dataUrl);
    } catch {
      setError("Couldn't read that photo. Try a different one.");
    } finally {
      setProcessing(false);
    }
  }

  function handleSubmit() {
    if (mode === "draw" && diagramInputRef.current) {
      diagramInputRef.current.value = canvasRef.current?.getDataUrl() ?? "";
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

      <div className="inline-flex w-fit flex-wrap rounded-lg border border-neutral-200 p-1 dark:border-neutral-800">
        {(["draw", "upload", "link"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => switchMode(m)}
            className={`rounded-md px-3 py-1 text-sm font-medium transition ${
              mode === m
                ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
            }`}
          >
            {m === "draw" ? "Draw a play" : m === "upload" ? "Upload a photo" : "Attach a link"}
          </button>
        ))}
      </div>

      {mode === "draw" && <PlayCanvas ref={canvasRef} sport={sport} />}

      {mode === "upload" && (
        <div className="flex flex-col gap-2">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="text-sm text-neutral-500 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-600 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-brand-700"
          />
          {processing && <p className="text-xs text-neutral-500">Processing photo...</p>}
          {error && <p className="text-xs font-medium text-red-600">{error}</p>}
          {preview && (
            // eslint-disable-next-line @next/next/no-img-element -- locally-processed data URL, not optimizable by next/image
            <img
              src={preview}
              alt="Selected play photo"
              className="max-w-full rounded-lg border border-neutral-200 dark:border-neutral-800"
            />
          )}
        </div>
      )}

      {mode === "link" && (
        <input
          name="fileUrl"
          placeholder="Link to an image, PDF, or video (Google Drive, Hudl, etc.)"
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
      )}

      <button
        type="submit"
        disabled={processing}
        className="self-start rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
      >
        Save Play
      </button>
    </form>
  );
}
