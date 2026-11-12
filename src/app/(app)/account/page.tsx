import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getCurrentSessionToken } from "@/lib/auth";
import { revokeSession, revokeOtherSessions } from "@/lib/actions/user";
import { unblockUser } from "@/lib/actions/moderation";
import { describeDevice } from "@/lib/userAgent";
import { formatDateTime } from "@/lib/format";
import { ProfileForm } from "@/components/ProfileForm";
import { PasswordForm } from "@/components/PasswordForm";
import { NotificationStatus } from "@/components/NotificationStatus";
import { DeleteAccountForm } from "@/components/DeleteAccountForm";
import { TwoFactorSection } from "@/components/TwoFactorSection";
import { isTwoFactorAvailable } from "@/lib/totp";

export const metadata: Metadata = { title: "Account Settings — SportSync" };

const card =
  "flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900";
const heading = "text-sm font-semibold uppercase text-neutral-400";

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const currentToken = await getCurrentSessionToken();
  const [sessions, blocks] = await Promise.all([
    prisma.session.findMany({
      where: { userId: user.id, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.block.findMany({
      where: { blockerId: user.id },
      include: { blocked: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <h1 className="text-xl font-bold">Account Settings</h1>

      <section className={card}>
        <h2 className={heading}>Profile</h2>
        <ProfileForm
          user={{
            name: user.name,
            email: user.email,
            phone: user.phone,
            photoUrl: user.photoUrl,
            emailVerifiedAt: user.emailVerifiedAt,
          }}
        />
      </section>

      <section className={card}>
        <h2 className={heading}>Notifications</h2>
        <NotificationStatus />
      </section>

      <section className={card}>
        <h2 className={heading}>Password</h2>
        <PasswordForm />
      </section>

      <section className={card}>
        <h2 className={heading}>Two-step verification</h2>
        <TwoFactorSection enabled={Boolean(user.totpEnabledAt)} available={isTwoFactorAvailable()} />
      </section>

      <section className={card}>
        <div className="flex items-center justify-between">
          <h2 className={heading}>Where you&apos;re signed in</h2>
          {sessions.length > 1 && (
            <form action={revokeOtherSessions}>
              <button type="submit" className="text-xs font-medium text-red-600 hover:underline">
                Sign out all other devices
              </button>
            </form>
          )}
        </div>
        <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
          {sessions.map((s) => {
            const isCurrent = s.token === currentToken;
            return (
              <li key={s.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div>
                  <p className="font-medium">
                    {describeDevice(s.userAgent)}
                    {isCurrent && (
                      <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-950 dark:text-green-300">
                        This device
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-neutral-500">Signed in {formatDateTime(s.createdAt)}</p>
                </div>
                {!isCurrent && (
                  <form action={revokeSession.bind(null, s.id)}>
                    <button type="submit" className="text-xs font-medium text-red-600 hover:underline">
                      Sign out
                    </button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className={card}>
        <h2 className={heading}>Blocked people</h2>
        {blocks.length === 0 ? (
          <p className="text-sm text-neutral-500">
            You haven&apos;t blocked anyone. You can block someone from a chat message; you
            won&apos;t see their chat messages or highlights.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {blocks.map((b) => (
              <li key={b.id} className="flex items-center justify-between text-sm">
                <span>{b.blocked.name}</span>
                <form
                  action={async () => {
                    "use server";
                    await unblockUser(b.blockedId);
                  }}
                >
                  <button type="submit" className="text-xs font-medium text-brand-600 hover:underline">
                    Unblock
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={card}>
        <h2 className={heading}>Your data</h2>
        <p className="text-sm text-neutral-500">
          Download a copy of the personal information we hold about you.
        </p>
        <a
          href="/api/account/export"
          className="self-start rounded-lg border border-neutral-300 px-4 py-2 text-sm font-semibold hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          Download my data
        </a>
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
