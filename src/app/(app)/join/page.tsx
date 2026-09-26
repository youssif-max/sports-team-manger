import type { Metadata } from "next";
import { JoinTeamForm } from "@/components/JoinTeamForm";

export const metadata: Metadata = { title: "Join a Team — SportSync" };

export default function JoinTeamPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <h1 className="text-xl font-bold">Join a Team</h1>
      <JoinTeamForm />
    </div>
  );
}
