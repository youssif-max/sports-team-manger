import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { TopBar } from "@/components/TopBar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar user={user} />
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 px-4 py-4">
        {children}
      </div>
    </div>
  );
}
