import Link from "next/link";
import { peekEmailToken } from "@/lib/tokens";
import { AuthShell } from "@/components/AuthShell";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";

export const metadata = { title: "Reset password — SportSync", robots: { index: false } };

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const valid = await peekEmailToken(token, "RESET_PASSWORD");

  if (!valid) {
    return (
      <AuthShell title="Link expired" subtitle="This reset link is invalid or has expired.">
        <Link
          href="/forgot-password"
          className="rounded-lg bg-brand-600 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-brand-700"
        >
          Request a new link
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Choose a new password" subtitle="You'll be signed out on all other devices.">
      <ResetPasswordForm token={token} />
    </AuthShell>
  );
}
