import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { updateMembership } from "@/lib/actions/team";

export default async function EditPlayerPage({
  params,
}: {
  params: Promise<{ teamId: string; userId: string }>;
}) {
  const { teamId, userId } = await params;
  const membership = await prisma.teamMembership.findUnique({
    where: { teamId_userId: { teamId, userId } },
    include: { user: true },
  });
  if (!membership) notFound();

  const action = updateMembership.bind(null, teamId, userId);

  return (
    <div className="mx-auto w-full max-w-md">
      <h1 className="mb-4 text-xl font-bold">Edit {membership.user.name}</h1>
      <form action={action} className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm font-medium">
            Jersey #
            <input
              name="jerseyNumber"
              defaultValue={membership.jerseyNumber ?? ""}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
          </label>
          <label className="text-sm font-medium">
            Position
            <input
              name="position"
              defaultValue={membership.position ?? ""}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
          </label>
        </div>

        <label className="text-sm font-medium">
          Photo URL
          <input
            name="photoUrl"
            defaultValue={membership.user.photoUrl ?? ""}
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm font-medium">
            Email
            <input
              name="email"
              type="email"
              defaultValue={membership.user.email ?? ""}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
          </label>
          <label className="text-sm font-medium">
            Phone
            <input
              name="phone"
              defaultValue={membership.user.phone ?? ""}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
          </label>
        </div>

        <fieldset className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
          <legend className="px-1 text-xs font-semibold text-neutral-500">
            Emergency Contact
          </legend>
          <div className="grid grid-cols-2 gap-3">
            <input
              name="emergencyContactName"
              placeholder="Name"
              defaultValue={membership.emergencyContactName ?? ""}
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
            <input
              name="emergencyContactPhone"
              placeholder="Phone"
              defaultValue={membership.emergencyContactPhone ?? ""}
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
          </div>
        </fieldset>

        <button
          type="submit"
          className="mt-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Save Changes
        </button>
      </form>
    </div>
  );
}
