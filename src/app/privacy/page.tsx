import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Privacy Policy — SportSync" };

const UPDATED = "September 26, 2026";

export default function PrivacyPolicyPage() {
  return (
    <LegalPage title="Privacy Policy" updated={UPDATED}>
      <p>
        This policy explains what information SportSync collects, how it&apos;s used, and who
        can see it. SportSync is a team-management tool for coaches, players, parents, and
        admins — it is not intended for use by children under 13 as account holders (see{" "}
        <strong>Children&apos;s Privacy</strong> below for how younger players are handled
        instead).
      </p>

      <LegalSection heading="1. Information We Collect">
        <p>
          <strong>Account holders</strong> (anyone who signs up with an email and password): name,
          email address, hashed password, and date of birth. Date of birth is used only to verify
          you meet our minimum age requirement and is never shown to other users.
        </p>
        <p>
          <strong>Roster-only players</strong> (added to a team by a coach/admin, with no login of
          their own): name, and optionally photo, email, phone number, jersey number, position, and
          an emergency contact name/phone.
        </p>
        <p>
          <strong>Team content</strong> you or others create: chat messages, announcements,
          highlight video links, playbook plays (including any images, PDFs, or files you attach),
          schedule/event details, RSVPs, attendance records, and game stats/results.
        </p>
        <p>
          <strong>Push notifications</strong>: if you turn on notifications, we store a push
          subscription (a delivery endpoint and encryption keys assigned by your browser) linked to
          your account, so we can deliver announcements and game results. We don&apos;t use any
          third-party push/analytics network — messages are sent directly to your browser.
        </p>
        <p>
          <strong>Technical data</strong>: our hosting provider (Vercel) and database provider
          (Neon) automatically log standard request data (such as IP address and timestamps) as
          part of running the service and keeping it secure.
        </p>
      </LegalSection>

      <LegalSection heading="2. How We Use Information">
        <ul className="list-disc pl-5">
          <li>To operate core features: rosters, scheduling, attendance, chat, and the playbook.</li>
          <li>To let members of a team see each other&apos;s roster and contact info.</li>
          <li>To send push notifications you&apos;ve opted into.</li>
          <li>To secure accounts (e.g., locking an account after repeated failed sign-in attempts).</li>
          <li>To enforce our minimum age requirement for creating an account.</li>
        </ul>
        <p>We do not sell personal data, and we do not share it with advertisers.</p>
      </LegalSection>

      <LegalSection heading="3. Who Can See Your Data">
        <p>
          Information tied to a team (roster entries, contact info, chat, announcements, schedule,
          stats, attendance, and playbook content) is visible to other members of that same team,
          based on their role. Admins and coaches can edit roster entries and manage schedules;
          players and parents can generally view team information and manage their own RSVP and
          contact details. You must have that team&apos;s join code or an invite link to become a
          member.
        </p>
      </LegalSection>

      <LegalSection heading="4. Children's Privacy">
        <p>
          Creating your own SportSync account requires you to be at least 13 years old, in line
          with the U.S. Children&apos;s Online Privacy Protection Act (COPPA). We verify this using
          the date of birth entered at signup.
        </p>
        <p>
          Younger players can still be part of a team: a parent, coach, or admin adds them directly
          to the roster as a roster-only entry. No login, password, or account is created for that
          player, and we do not knowingly collect personal information directly from children under
          13. The adult who added the entry controls what information is included and can edit or
          remove it at any time from the Roster page.
        </p>
        <p>
          If you believe a child under 13 has created their own account, or that we hold
          information about a child under 13 outside of a parent/coach-managed roster entry, please
          contact us using the details below so we can remove it.
        </p>
      </LegalSection>

      <LegalSection heading="5. Data Retention & Deletion">
        <p>
          We keep your information for as long as your account or team membership is active.
          Removing a roster entry deletes that entry&apos;s team-specific data. You can permanently
          delete your own account at any time from Account Settings — this immediately removes
          your login, roster entries, chat messages, announcements, and stats. If you&apos;re the
          only admin on a team, you&apos;ll need to promote someone else first so the team isn&apos;t
          left without one. You can also contact us at the email below for help with deletion.
        </p>
      </LegalSection>

      <LegalSection heading="6. Security">
        <p>
          Passwords are hashed (never stored in plain text). Sessions use random, single-purpose
          tokens rather than predictable identifiers. Access to team data is restricted by your
          role on that team. No method of storage or transmission is 100% secure, but we work to
          protect your information using industry-standard practices.
        </p>
      </LegalSection>

      <LegalSection heading="7. Your Choices">
        <ul className="list-disc pl-5">
          <li>Update or remove your contact info from your Roster profile at any time.</li>
          <li>Turn push notifications off from your device&apos;s notification settings.</li>
          <li>Ask a team admin to remove you from a team, or delete your account yourself from Account Settings.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="8. Third-Party Services">
        <p>
          SportSync runs on Vercel (hosting) and Neon (database). These providers process data on
          our behalf under their own security and privacy commitments; we don&apos;t use any
          third-party advertising or analytics services.
        </p>
      </LegalSection>

      <LegalSection heading="9. Changes to This Policy">
        <p>
          We may update this policy as SportSync changes. We&apos;ll update the date at the top of
          this page when we do.
        </p>
      </LegalSection>

      <LegalSection heading="10. Contact">
        <p>
          Questions about this policy or your data? Contact{" "}
          <a href="mailto:rennewiyoussif@sellabroad.io" className="text-brand-600 hover:underline">
            rennewiyoussif@sellabroad.io
          </a>
          .
        </p>
      </LegalSection>

      <p className="text-xs text-neutral-400">
        This policy is provided as a good-faith description of how SportSync actually handles
        data. It is not a substitute for legal advice — if you plan to publish this app widely,
        especially given that it handles youth sports data, we recommend having it reviewed by a
        lawyer familiar with COPPA and your local privacy laws.
      </p>
    </LegalPage>
  );
}
