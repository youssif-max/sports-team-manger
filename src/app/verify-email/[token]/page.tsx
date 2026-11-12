import Link from "next/link";
import { peekEmailToken } from "@/lib/tokens";
import { verifyEmail } from "@/lib/actions/user";
import { AuthShell, authButtonClass } from "@/components/AuthShell";

export const metadata = { title: "Confirm email — SportSync", robots: { index: false } };

// The link only shows a button; confirming happens on click. Email security
// scanners open every link in a message, and a plain GET that confirmed
// automatically would let them use up the one-time token.
export default async function VerifyEmailPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const valid = await peekEmailToken(token, "VERIFY_EMAIL");

  if (!valid) {
    return (
      <AuthShell title="Link expired" subtitle="This confirmation link is invalid or has expired.">
        <Link
          href="/"
          className="rounded-lg bg-brand-600 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-brand-700"
        >
          Go to SportSync
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Confirm your email" subtitle={valid.user.email ?? undefined}>
      <form action={verifyEmail.bind(null, token)} className="flex flex-col">
        <button type="submit" className={authButtonClass}>
          Confirm email
        </button>
      </form>
    </AuthShell>
  );
}
