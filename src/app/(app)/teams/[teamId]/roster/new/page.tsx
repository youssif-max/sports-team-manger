import { addNewPlayerToTeam } from "@/lib/actions/team";

export default async function NewPlayerPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const action = addNewPlayerToTeam.bind(null, teamId);

  return (
    <div className="mx-auto w-full max-w-md">
      <h1 className="mb-4 text-xl font-bold">Add to Roster</h1>
      <form action={action} className="flex flex-col gap-3">
        <label className="text-sm font-medium">
          Full name
          <input
            name="name"
            required
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        </label>

        <label className="text-sm font-medium">
          Role
          <select
            name="role"
            defaultValue="PLAYER"
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          >
            <option value="PLAYER">Player</option>
            <option value="COACH">Coach</option>
            <option value="PARENT">Parent</option>
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm font-medium">
            Jersey #
            <input
              name="jerseyNumber"
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
          </label>
          <label className="text-sm font-medium">
            Position
            <input
              name="position"
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
          </label>
        </div>

        <label className="text-sm font-medium">
          Photo URL (optional)
          <input
            name="photoUrl"
            placeholder="https://..."
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm font-medium">
            Email
            <input
              name="email"
              type="email"
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
          </label>
          <label className="text-sm font-medium">
            Phone
            <input
              name="phone"
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
          </label>
        </div>

        <fieldset className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
          <legend className="px-1 text-xs font-semibold text-neutral-500">
            Emergency Contact (optional)
          </legend>
          <div className="grid grid-cols-2 gap-3">
            <input
              name="emergencyContactName"
              placeholder="Name"
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
            <input
              name="emergencyContactPhone"
              placeholder="Phone"
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
          </div>
        </fieldset>

        <button
          type="submit"
          className="mt-2 rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Add to Roster
        </button>
      </form>
    </div>
  );
}
