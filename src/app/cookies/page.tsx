import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Cookie Policy — SportSync" };

const UPDATED = "September 26, 2026";

export default function CookiePolicyPage() {
  return (
    <LegalPage title="Cookie Policy" updated={UPDATED}>
      <p>SportSync keeps cookies simple. Here&apos;s everything we use, in full.</p>

      <LegalSection heading="The one cookie we set">
        <p>
          <strong>
            <code>session</code>
          </strong>{" "}
          — an essential cookie that keeps you signed in. It stores a random token (not your
          password or personal data) that we look up against your account on our server. It&apos;s
          marked <code>HttpOnly</code> (so page scripts can&apos;t read it) and{" "}
          <code>Secure</code> in production (so it&apos;s only sent over HTTPS). It expires after 30
          days, or immediately when you sign out.
        </p>
      </LegalSection>

      <LegalSection heading="What we don't use">
        <p>
          No advertising cookies, no third-party tracking or analytics cookies, no cross-site
          tracking. Because our only cookie is strictly necessary to keep you signed in, we
          don&apos;t show a cookie-consent gate — there&apos;s nothing optional to consent to.
        </p>
      </LegalSection>

      <LegalSection heading="Other browser storage">
        <p>
          If you enable push notifications, your browser stores a push subscription locally to
          receive them — this is managed by your browser&apos;s notification permission, not a
          cookie. If you install SportSync to your home screen, your browser may cache some app
          files for offline loading; this doesn&apos;t track you across other sites.
        </p>
      </LegalSection>

      <LegalSection heading="Controlling cookies">
        <p>
          You can block or delete cookies in your browser settings, but doing so will sign you out
          and prevent staying signed in, since our cookie is required for authentication.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
