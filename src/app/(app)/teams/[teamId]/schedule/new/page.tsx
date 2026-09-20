import { createEvent } from "@/lib/actions/schedule";
import { toDatetimeLocalValue, hoursFromNow } from "@/lib/format";

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

        <button
          type="submit"
          className="mt-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Add Event
        </button>
      </form>
    </div>
  );
}
