import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ChatRoom } from "@/components/ChatRoom";

export default async function ChatPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">Team Chat</h1>
      <ChatRoom teamId={teamId} currentUserId={user.id} />
    </div>
  );
}
