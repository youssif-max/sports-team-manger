import { createEvent } from "@/lib/actions/schedule";
import { toDatetimeLocalValue, hoursFromNow } from "@/lib/format";

const DAYS = [
  { value: 0, label: "S" },
  { value: 1, label: "M" },
  { value: 2, label: "T" },
  { value: 3, label: "W" },
  { value: 4, label: "T" },
  { value: 5, label: "F" },
  { value: 6, label: "S" },
];

export default async function NewEventPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const action = createEvent.bind(null, teamId);

  const in1Hour = hoursFromNow(1);

  return (
    <div className="mx-auto w-full max-w-md">
      <h1 className="mb-4 text-xl font-bold">Add Event</h1>
      <form action={action} className="flex flex-col gap-3">
        <label className="text-sm font-medium">
          Type
          <select
            name="type"
            defaultValue="PRACTICE"
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          >
            <option value="PRACTICE">Practice</option>
            <option value="GAME">Game</option>
            <option value="OTHER">Other</option>
          </select>
        </label>

        <label className="text-sm font-medium">
          Title
          <input
            name="title"
            required
            placeholder="e.g. Weekly Practice"
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        </label>

        <label className="text-sm font-medium">
          Date &amp; Time
          <input
            type="datetime-local"
            name="startsAt"
            required
            defaultValue={toDatetimeLocalValue(in1Hour)}
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        </label>

        <label className="text-sm font-medium">
          Location
          <input
            name="location"
            placeholder="e.g. Main Field"
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        </label>

        <label className="text-sm font-medium">
          Opponent (for games)
          <input
            name="opponent"
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        </label>

        <label className="text-sm font-medium">
          Notes
          <textarea
            name="notes"
            rows={3}
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        </label>

        <fieldset className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
          <legend className="px-1 text-xs font-semibold text-neutral-500">
            Repeat (optional)
          </legend>
          <label className="text-sm font-medium">
            Repeat
            <select
              name="repeat"
              defaultValue="none"
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            >
              <option value="none">Doesn&apos;t repeat</option>
              <option value="weekly">Weekly, on selected days</option>
            </select>
          </label>

          <div className="mt-3">
            <p className="mb-1 text-sm font-medium">On these days</p>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((d) => (
                <label
                  key={d.value}
                  className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-neutral-300 text-xs font-semibold has-checked:border-brand-600 has-checked:bg-brand-600 has-checked:text-white dark:border-neutral-700"
                >
                  <input
                    type="checkbox"
                    name="repeatDays"
                    value={d.value}
                    className="sr-only"
                  />
                  {d.label}
                </label>
              ))}
            </div>
          </div>

          <label className="mt-3 block text-sm font-medium">
            Repeat until
            <input
              type="date"
              name="repeatUntil"
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
          </label>
        </fieldset>

        <button
          type="submit"
          className="mt-2 rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Add Event
        </button>
      </form>
    </div>
  );
}
