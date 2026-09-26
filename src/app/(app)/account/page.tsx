import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ProfileForm } from "@/components/ProfileForm";
import { PasswordForm } from "@/components/PasswordForm";
import { NotificationStatus } from "@/components/NotificationStatus";
import { DeleteAccountForm } from "@/components/DeleteAccountForm";

export const metadata: Metadata = { title: "Account Settings — SportSync" };

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <h1 className="text-xl font-bold">Account Settings</h1>

      <section className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="text-sm font-semibold uppercase text-neutral-400">Profile</h2>
        <ProfileForm user={user} />
      </section>

      <section className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="text-sm font-semibold uppercase text-neutral-400">Notifications</h2>
        <NotificationStatus />
      </section>

      <section className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="text-sm font-semibold uppercase text-neutral-400">Password</h2>
        <PasswordForm />
      </section>

      <section className="flex flex-col gap-4 rounded-xl border border-red-200 bg-red-50/50 p-5 dark:border-red-950 dark:bg-red-950/10">
        <h2 className="text-sm font-semibold uppercase text-red-700 dark:text-red-500">
          Danger Zone
        </h2>
        <DeleteAccountForm />
      </section>
    </div>
  );
}
