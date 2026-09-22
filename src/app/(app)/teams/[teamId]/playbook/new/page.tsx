import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { NewPlayForm } from "@/components/NewPlayForm";

export default async function NewPlayPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) notFound();

  return (
    <div className="mx-auto w-full max-w-2xl">
      <h1 className="mb-4 text-xl font-bold">New Play</h1>
      <NewPlayForm teamId={teamId} sport={team.sport} />
    </div>
  );
}
