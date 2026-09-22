"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

type CalEvent = {
  id: string;
  title: string;
  type: string;
  startsAt: string;
};

const TYPE_STYLES: Record<string, string> = {
  GAME: "bg-brand-600/10 text-brand-700 dark:text-brand-600",
  PRACTICE: "bg-amber-500/10 text-amber-700 dark:text-amber-500",
  OTHER: "bg-neutral-500/10 text-neutral-600 dark:text-neutral-400",
};

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

export function ScheduleCalendar({
  teamId,
  events,
}: {
  teamId: string;
  events: CalEvent[];
}) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const eventsByDay = new Map<number, CalEvent[]>();
  for (const e of events) {
    const d = new Date(e.startsAt);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!eventsByDay.has(day)) eventsByDay.set(day, []);
      eventsByDay.get(day)!.push(e);
    }
  }

  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const monthLabel = cursor.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const today = new Date();
  const isToday = (day: number) =>
    today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setCursor(new Date(year, month - 1, 1))}
          className="rounded-lg p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          aria-label="Previous month"
        >
          <ChevronLeft size={16} />
        </button>
        <p className="text-sm font-semibold">{monthLabel}</p>
        <button
          type="button"
          onClick={() => setCursor(new Date(year, month + 1, 1))}
          className="rounded-lg p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          aria-label="Next month"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 pb-1 text-center text-[10px] font-semibold uppercase text-neutral-400">
        {WEEKDAY_LABELS.map((d, i) => (
          <div key={i}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => (
          <div
            key={i}
            className={`min-h-[70px] rounded-lg border p-1 text-left align-top ${
              day
                ? isToday(day)
                  ? "border-brand-600"
                  : "border-neutral-200 dark:border-neutral-800"
                : "border-transparent"
            }`}
          >
            {day && (
              <>
                <p className="mb-0.5 text-xs font-medium text-neutral-400">{day}</p>
                <div className="flex flex-col gap-0.5">
                  {(eventsByDay.get(day) ?? []).slice(0, 3).map((e) => (
                    <Link
                      key={e.id}
                      href={`/teams/${teamId}/schedule/${e.id}`}
                      className={`truncate rounded px-1 py-0.5 text-[10px] font-medium ${
                        TYPE_STYLES[e.type] ?? TYPE_STYLES.OTHER
                      }`}
                    >
                      {e.title}
                    </Link>
                  ))}
                  {(eventsByDay.get(day) ?? []).length > 3 && (
                    <p className="px-1 text-[10px] text-neutral-400">
                      +{(eventsByDay.get(day) ?? []).length - 3} more
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
