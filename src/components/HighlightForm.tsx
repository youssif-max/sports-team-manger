"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { upload } from "@vercel/blob/client";
import { postFeedHighlight, postHighlight, type HighlightFormState } from "@/lib/actions/community";

type Props = (
  | { mode: "team"; teamId: string; players: { userId: string; name: string }[] }
  | { mode: "feed"; teams: { id: string; name: string }[] }
) & {
  // Needed to build the upload path; the server re-checks it, so it can't be
  // used to write into someone else's folder.
  userId: string;
  uploadEnabled: boolean;
};

const inputClass =
  "rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900";

// Mirrors the limits enforced on the server (src/lib/blob.ts).
const MAX_MB = 60;
const OK_TYPES = ["video/mp4", "video/quicktime", "video/webm"];

export function HighlightForm(props: Props) {
  const action: (prev: HighlightFormState, fd: FormData) => Promise<HighlightFormState> =
    props.mode === "team" ? postHighlight.bind(null, props.teamId) : postFeedHighlight;
  const [state, formAction, pending] = useActionState(action, undefined);
  const [, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  // Submitting through onSubmit (instead of the form's `action` prop) stops
  // React from wiping every field after a failed post — otherwise you'd lose
  // what you typed and the "who can see this" choice would fall out of sync.
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(() => formAction(data));
  }

  const [visibility, setVisibility] = useState<"TEAM" | "PUBLIC">("TEAM");
  const [uploadUrl, setUploadUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState("");

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
      // Resetting after a successful post is a response to the server result.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVisibility("TEAM");
      setUploadUrl("");
      setFileName("");
      setProgress(null);
    }
  }, [state]);

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setUploadError("");
    setUploadUrl("");
    setFileName("");
    if (!file) return;

    if (!OK_TYPES.includes(file.type)) {
      setUploadError("Pick an MP4, MOV or WebM video.");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setUploadError(`That video is over ${MAX_MB} MB. Trim it to a shorter clip and try again.`);
      e.target.value = "";
      return;
    }

    setFileName(file.name);
    setProgress(0);
    try {
      const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, "_").slice(-80) || "video.mp4";
      const blob = await upload(`highlights/${props.userId}/${safeName}`, file, {
        access: "public",
        handleUploadUrl: "/api/highlights/upload",
        contentType: file.type,
        onUploadProgress: (p) => setProgress(Math.round(p.percentage)),
      });
      setUploadUrl(blob.url);
    } catch (err) {
      setUploadError(err instanceof Error && err.message ? err.message : "Upload failed. Try again.");
      setFileName("");
      e.target.value = "";
    } finally {
      setProgress(null);
    }
  }

  const uploading = progress !== null;

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
    >
      <input type="hidden" name="uploadUrl" value={uploadUrl} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input name="title" required maxLength={200} placeholder="Title, e.g. Game-winning goal" className={inputClass} />
        {props.mode === "feed" ? (
          <select name="teamId" required className={inputClass} defaultValue={props.teams[0]?.id}>
            {props.teams.map((t) => (
              <option key={t.id} value={t.id}>
                Post to {t.name}
              </option>
            ))}
          </select>
        ) : props.players.length > 0 ? (
          <select name="playerId" className={inputClass}>
            <option value="">Whole team (no specific player)</option>
            {props.players.map((p) => (
              <option key={p.userId} value={p.userId}>
                {p.name}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      {props.uploadEnabled && (
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500">
            Upload a video from your photos
            <input
              type="file"
              accept="video/*"
              onChange={onPickFile}
              disabled={uploading}
              className="mt-1 block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-100 file:px-3 file:py-2 file:text-sm file:font-semibold dark:file:bg-neutral-800"
            />
          </label>
          {uploading && (
            <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
              <div className="h-full bg-brand-600 transition-all" style={{ width: `${progress}%` }} />
            </div>
          )}
          {uploading && <p className="text-xs text-neutral-500">Uploading… {progress}%</p>}
          {uploadUrl && <p className="text-xs font-medium text-green-600">Ready: {fileName}</p>}
          {uploadError && <p className="text-xs font-medium text-red-600">{uploadError}</p>}
          <p className="text-xs text-neutral-400">
            Up to {MAX_MB} MB (about a minute of video). On iPhone, Settings → Camera → Formats →
            &quot;Most Compatible&quot; makes videos play on every device.
          </p>
        </div>
      )}

      {!uploadUrl && (
        <>
          <input
            name="videoUrl"
            required={!props.uploadEnabled || !fileName}
            placeholder={
              props.uploadEnabled
                ? "…or paste a video link (YouTube works best)"
                : "Video link (YouTube works best — game film or a clip)"
            }
            className={inputClass}
          />

          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-medium text-neutral-500">
              Clip starts at (optional)
              <input name="start" placeholder="e.g. 12:30" className={`mt-1 w-full ${inputClass}`} />
            </label>
            <label className="text-xs font-medium text-neutral-500">
              Clip ends at (optional)
              <input name="end" placeholder="e.g. 12:52" className={`mt-1 w-full ${inputClass}`} />
            </label>
          </div>
          <p className="-mt-1 text-xs text-neutral-400">
            Pasting a full game video? Add start/end times to show only your play.
          </p>
        </>
      )}

      <textarea
        name="description"
        rows={2}
        maxLength={2000}
        placeholder="Description (optional)"
        className={inputClass}
      />

      <fieldset className="flex flex-col gap-2 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
        <legend className="px-1 text-xs font-medium text-neutral-500">Who can see this?</legend>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="radio"
            name="visibility"
            value="TEAM"
            checked={visibility === "TEAM"}
            onChange={() => setVisibility("TEAM")}
            className="mt-1"
          />
          <span>
            <span className="font-medium">My team only</span>
            <span className="block text-xs text-neutral-500">Only members of the team can watch.</span>
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="radio"
            name="visibility"
            value="PUBLIC"
            checked={visibility === "PUBLIC"}
            onChange={() => setVisibility("PUBLIC")}
            className="mt-1"
          />
          <span>
            <span className="font-medium">Everyone on SportSync</span>
            <span className="block text-xs text-neutral-500">
              Shows in the Highlights feed for every signed-in user. Only your first name is shown.
            </span>
          </span>
        </label>

        {visibility === "PUBLIC" && (
          <label className="mt-1 flex items-start gap-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
            <input type="checkbox" name="publicConsent" required className="mt-0.5" />
            <span>
              I understand anyone signed in to SportSync can watch this. Everyone shown in it (or a
              parent/guardian, if they&apos;re under 18) is okay with that, and there&apos;s nothing
              private in it like an address or school name.
            </span>
          </label>
        )}
      </fieldset>

      {state?.error && <p className="text-sm font-medium text-red-600">{state.error}</p>}
      {state?.success && <p className="text-sm font-medium text-green-600">Posted.</p>}

      <button
        type="submit"
        disabled={pending || uploading}
        className="self-start rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {uploading ? "Uploading..." : pending ? "Posting..." : "Post Highlight"}
      </button>
    </form>
  );
}
