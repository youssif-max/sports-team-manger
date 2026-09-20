import { createTeam } from "@/lib/actions/team";

const SPORTS = [
  "Soccer",
  "Basketball",
  "Baseball",
  "Softball",
  "Football",
  "Hockey",
  "Volleyball",
  "Lacrosse",
  "Rugby",
  "Track",
  "Other",
];

export default function NewTeamPage() {
  return (
    <div className="mx-auto w-full max-w-md">
      <h1 className="mb-4 text-xl font-bold">Create a Team</h1>
      <form action={createTeam} className="flex flex-col gap-3">
        <label className="text-sm font-medium">
          Team name
          <input
            name="name"
            required
            placeholder="e.g. Riverside Hawks"
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        </label>

        <label className="text-sm font-medium">
          Sport
          <select
            name="sport"
            required
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          >
            {SPORTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-medium">
          Season (optional)
          <input
            name="season"
            placeholder="e.g. Fall 2026"
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        </label>

        <label className="text-sm font-medium">
          Team color
          <input
            type="color"
            name="colorPrimary"
            defaultValue="#1d4ed8"
            className="mt-1 h-10 w-full rounded-lg border border-neutral-300 dark:border-neutral-700"
          />
        </label>

        <button
          type="submit"
          className="mt-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Create Team
        </button>
      </form>
    </div>
  );
}
