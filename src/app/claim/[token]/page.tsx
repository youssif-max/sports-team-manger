import Link from "next/link";
import { peekEmailToken } from "@/lib/tokens";
import { AuthShell } from "@/components/AuthShell";
import { ClaimForm } from "@/components/ClaimForm";

export const metadata = { title: "Claim your profile — SportSync", robots: { index: false } };

export default async function ClaimPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const valid = await peekEmailToken(token, "CLAIM_PROFILE");

  if (!valid || valid.user.passwordHash) {
    return (
      <AuthShell title="Link expired" subtitle="This link is invalid or has expired.">
        <Link
          href="/signup"
          className="rounded-lg bg-brand-600 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-brand-700"
        >
          Back to sign up
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Claim your profile"
      subtitle="A coach added you to a team. Set a password to take over your profile."
    >
      <ClaimForm token={token} defaultName={valid.user.name} />
    </AuthShell>
  );
}
