import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/LegalPage";
import { SUPPORT_EMAIL } from "@/lib/contact";

export const metadata: Metadata = { title: "Support — SportSync" };

export default function SupportPage() {
  return (
    <LegalPage title="Support" updated="November 13, 2026">
      <p>Need a hand with SportSync? Here are the quickest fixes, and how to reach us.</p>

      <LegalSection heading="Common questions">
        <ul className="list-disc pl-5">
          <li>
            <strong>Forgot your password?</strong> Use &quot;Forgot password?&quot; on the sign-in
            page and we&apos;ll email you a reset link.
          </li>
          <li>
            <strong>Joined a team but can&apos;t get in?</strong> Some teams require a coach or
            admin to approve new members. Ask them to check the Join requests page.
          </li>
          <li>
            <strong>Lost your authenticator?</strong> Sign in with one of your saved recovery
            codes, then set up two-step verification again from Account Settings.
          </li>
          <li>
            <strong>Delete your account or download your data?</strong> Both are in Account
            Settings.
          </li>
          <li>
            <strong>Billing questions?</strong> A team admin can manage or cancel Premium from the
            team&apos;s Premium page.
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="Report a problem or abuse">
        <p>
          To report a message, highlight or announcement, use the flag button on it — coaches and
          admins review reports for their team. If something is unsafe, involves a minor, or you
          can&apos;t resolve it with your team&apos;s admins, email us.
        </p>
      </LegalSection>

      <LegalSection heading="Contact us">
        <p>
          Email{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-brand-600 hover:underline">
            {SUPPORT_EMAIL}
          </a>
          . To report a security vulnerability, see our{" "}
          <a href="/.well-known/security.txt" className="text-brand-600 hover:underline">
            security contact
          </a>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
