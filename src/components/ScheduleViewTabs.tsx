"use client";

import { useState } from "react";

export function ScheduleViewTabs({
  list,
  calendar,
}: {
  list: React.ReactNode;
  calendar: React.ReactNode;
}) {
  const [view, setView] = useState<"list" | "calendar">("list");

  return (
    <div className="flex flex-col gap-4">
      <div className="inline-flex w-fit rounded-lg border border-neutral-200 p-1 dark:border-neutral-800">
        {(["list", "calendar"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={`rounded-md px-3 py-1 text-sm font-medium capitalize transition ${
              view === v
                ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
            }`}
          >
            {v}
          </button>
        ))}
      </div>
      {view === "list" ? list : calendar}
    </div>
  );
}
