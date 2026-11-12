import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isEmailConfigured } from "@/lib/email";
import { TopBar } from "@/components/TopBar";
import { VerifyEmailBanner } from "@/components/VerifyEmailBanner";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar user={{ name: user.name, photoUrl: user.photoUrl, email: user.email }} />
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 px-4 py-4">
        {user.email && !user.emailVerifiedAt && isEmailConfigured() && (
          <VerifyEmailBanner email={user.email} />
        )}
        {children}
      </div>
    </div>
  );
}
