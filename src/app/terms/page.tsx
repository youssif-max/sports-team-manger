import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Terms of Service — SportSync" };

const UPDATED = "September 26, 2026";

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated={UPDATED}>
      <p>
        These terms govern your use of SportSync. By creating an account or joining a team, you
        agree to them.
      </p>

      <LegalSection heading="1. Eligibility">
        <p>
          You must be at least 13 years old to create your own SportSync account. Younger players
          may still participate in a team through a roster entry added by a parent, coach, or
          admin, without creating an account themselves.
        </p>
      </LegalSection>

      <LegalSection heading="2. Your Account">
        <p>
          You&apos;re responsible for keeping your password confidential and for all activity under
          your account. Provide accurate information when signing up. Let us know right away if
          you suspect unauthorized access to your account.
        </p>
      </LegalSection>

      <LegalSection heading="3. Join Codes & Invite Links">
        <p>
          Team join codes and invite links are meant to be shared only with people the team&apos;s
          coach or admin wants on that team. Admins and coaches are responsible for who they invite
          and what roles they assign.
        </p>
      </LegalSection>

      <LegalSection heading="4. Acceptable Use">
        <p>You agree not to use SportSync to:</p>
        <ul className="list-disc pl-5">
          <li>Upload or share content you don&apos;t have the right to share.</li>
          <li>Harass, threaten, or impersonate another person.</li>
          <li>Attempt to access another team&apos;s data without authorization.</li>
          <li>Upload malicious files or attempt to disrupt the service.</li>
          <li>Use the service for anything illegal.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="5. Your Content">
        <p>
          You retain ownership of the content you upload (photos, files, chat messages,
          announcements, plays, etc.). By posting content to a team, you allow SportSync to store
          and display it to that team&apos;s other members so the feature you used it for (chat,
          playbook, highlights, etc.) can work.
        </p>
      </LegalSection>

      <LegalSection heading="6. Roster Entries for Minors">
        <p>
          If you add a player under 13 to a team roster, you confirm you&apos;re their parent,
          guardian, or coach acting with appropriate authorization, and that you&apos;re
          responsible for the accuracy of the information you enter and for removing it if it&apos;s
          no longer appropriate to keep.
        </p>
      </LegalSection>

      <LegalSection heading="7. Disclaimer of Warranties">
        <p>
          SportSync is provided &quot;as is&quot; without warranties of any kind. We don&apos;t
          guarantee the service will be uninterrupted, error-free, or suitable for every use.
        </p>
      </LegalSection>

      <LegalSection heading="8. Limitation of Liability">
        <p>
          To the fullest extent permitted by law, SportSync and its operator aren&apos;t liable for
          indirect, incidental, or consequential damages arising from your use of the service.
        </p>
      </LegalSection>

      <LegalSection heading="9. Termination">
        <p>
          We may suspend or terminate access for accounts that violate these terms or misuse the
          service.
        </p>
      </LegalSection>

      <LegalSection heading="10. Changes">
        <p>We may update these terms from time to time. Continued use after a change means you accept the updated terms.</p>
      </LegalSection>

      <LegalSection heading="11. Contact">
        <p>
          Questions about these terms? Contact{" "}
          <a href="mailto:rennewiyoussif@sellabroad.io" className="text-brand-600 hover:underline">
            rennewiyoussif@sellabroad.io
          </a>
          .
        </p>
      </LegalSection>

      <p className="text-xs text-neutral-400">
        This is a starting-point set of terms, not a substitute for legal advice from a licensed
        attorney in your jurisdiction.
      </p>
    </LegalPage>
  );
}
