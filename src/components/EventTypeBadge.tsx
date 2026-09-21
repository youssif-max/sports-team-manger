const STYLES: Record<string, string> = {
  GAME: "bg-brand-600/10 text-brand-700 dark:text-brand-600",
  PRACTICE: "bg-amber-500/10 text-amber-700 dark:text-amber-500",
  OTHER: "bg-neutral-500/10 text-neutral-600 dark:text-neutral-400",
};

const LABELS: Record<string, string> = {
  GAME: "Game",
  PRACTICE: "Practice",
  OTHER: "Other",
};

export function EventTypeBadge({ type }: { type: string }) {
  return (
    <span
      className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
        STYLES[type] ?? STYLES.OTHER
      }`}
    >
      {LABELS[type] ?? type}
    </span>
  );
}
