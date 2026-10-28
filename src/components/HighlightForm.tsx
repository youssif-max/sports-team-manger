"use client";

import { useActionState, useEffect, useRef } from "react";
import { postFeedHighlight, postHighlight, type HighlightFormState } from "@/lib/actions/community";

type Props =
  | { mode: "team"; teamId: string; players: { userId: string; name: string }[] }
  | { mode: "feed"; teams: { id: string; name: string }[] };

const inputClass =
  "rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900";

export function HighlightForm(props: Props) {
  const action: (prev: HighlightFormState, fd: FormData) => Promise<HighlightFormState> =
    props.mode === "team" ? postHighlight.bind(null, props.teamId) : postFeedHighlight;
  const [state, formAction, pending] = useActionState(action, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
    >
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

      <input
        name="videoUrl"
        required
        placeholder="Video link (YouTube works best — game film or a clip)"
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

      <textarea
        name="description"
        rows={2}
        maxLength={2000}
        placeholder="Description (optional)"
        className={inputClass}
      />

      {state?.error && <p className="text-sm font-medium text-red-600">{state.error}</p>}
      {state?.success && <p className="text-sm font-medium text-green-600">Posted.</p>}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? "Posting..." : "Post Highlight"}
      </button>
    </form>
  );
}
