# SportSync launch guide

Things only the account owner can do, in order. Everything in the code is
already built; this is the checklist of accounts, keys and store paperwork.

## 1. Environment variables (Vercel → Settings → Environment Variables)

See `.env.example` for the full list. Minimum for a private beta:

| Variable | Why | How |
|---|---|---|
| `RESEND_API_KEY`, `EMAIL_FROM` | Forgot-password, email confirmation, profile claims | Free account at resend.com; verify your sending domain; `EMAIL_FROM` must use it |
| `TOTP_ENCRYPTION_KEY` | Turns on two-step verification | `openssl rand -base64 32` (or any 32+ char random string). Keep it forever — changing it locks out everyone who enabled 2FA |
| `SUPPORT_EMAIL` | Shown on /support, gets report alerts | Your support address |
| VAPID ×3 | Web push | `npx web-push generate-vapid-keys` |
| Stripe ×4 | Premium | Stripe dashboard (test mode first). Webhook endpoint: `https://<your-domain>/api/webhooks/stripe` |

Without the Resend keys, forgot-password and profile claims honestly report
"unavailable" in production instead of pretending to send.

## 2. Before real users

- [ ] Stripe **test mode** end to end: subscribe, webhook flips the team to Premium, cancel via the portal, webhook flips it back.
- [ ] Neon: enable point-in-time restore / backups; note the retention window.
- [ ] Add error monitoring (Sentry free tier is enough) — the app currently only logs to Vercel.
- [ ] GitHub: turn on secret scanning, Dependabot alerts, and branch protection for `main` (require the CI check).
- [ ] Have a lawyer review Privacy Policy and Terms — youth sports means minors' data (COPPA and state laws).
- [ ] Consider an LLC and general/cyber liability insurance before charging money.
- [ ] Move to Vercel **Pro** once you charge (the Hobby plan forbids commercial use).
- [ ] Recommend teams switch on **Approve new members** (Team Settings) — especially youth teams.
- [ ] Encourage coaches/admins to turn on two-step verification (Account Settings).

## 3. App Store / Google Play

The native apps are thin shells around your live website (Capacitor), so web
updates ship instantly without store review.

**Accounts**
- Apple Developer Program — $99/year (developer.apple.com/programs).
- Google Play Console — $25 one-time. New personal accounts may be required to run a closed test with ~12 testers for 14 days before production access; check current rules.

**Decide first (can't change after the first submission):** the bundle ID.
`com.sportsync.teams` in `capacitor.config.ts` is a placeholder — use one you own, e.g. `com.yourcompany.sportsync`. Change it in `capacitor.config.ts`, then `ios/App/App.xcodeproj` (PRODUCT_BUNDLE_IDENTIFIER) and `android/app/build.gradle` (`applicationId`).

**Build**
```bash
# set your live URL, then sync the native projects
$env:CAPACITOR_SERVER_URL = "https://your-live-domain"   # PowerShell
npm run cap:sync
```
- **iOS** needs a Mac (or a cloud Mac such as Codemagic / GitHub Actions macOS runners): `cd ios/App && pod install`, open `App.xcworkspace` in Xcode, set your Team, Archive, upload to App Store Connect.
- **Android** builds on Windows: open `android/` in Android Studio → Build → Generate Signed Bundle (AAB) → upload to Play Console. Back up the signing keystore — losing it means you can never update the app.

**Assets you still need**
- App icon 1024×1024 PNG, no transparency, no rounded corners (Xcode/Android Studio generate the sizes; `npx @capacitor/assets generate` can do it from one source image).
- Screenshots: iPhone 6.7" and 6.5" (and iPad if you support it), Android phone.
- A demo account for the reviewer (see below).

**Apple review: known risks**
- **Guideline 4.2 (minimum functionality):** Apple rejects apps that are just a website in a wrapper. Native push notifications (APNs via `@capacitor/push-notifications`) and the camera/photo picker are the usual way to add native value. Web push does not work inside the iOS app. This is not built yet and needs your Apple developer account to set up.
- **Guideline 3.1.1 (in-app purchase):** Premium can't be sold through Stripe inside the iOS app. The app already hides all pricing/checkout when it detects the native app (user agent contains `SportSyncApp`); teams subscribe on the website and the Premium status then shows in the app. Don't mention or link to the website for purchasing inside the app.
- **Guideline 1.2 (user-generated content):** requires report, block, and a way to contact you. All present: report/block on chat and highlights, a moderation queue for coaches, and /support.
- **Account deletion:** required if you have sign-up; present in Account Settings.
- **Sign in with Apple** is only required if you offer other third-party social logins — you don't.

---

## App Store Connect listing (copy/paste)

**Name:** SportSync
**Subtitle (≤30):** Team schedules, chat & film
**Promotional text (≤170):** Run your whole season in one place — schedules, RSVPs, rosters, team chat, playbooks and highlight reels for players, parents and coaches.
**Keywords (≤100):** team,sports,coach,roster,schedule,rsvp,playbook,highlights,league,club,practice,game,youth
**Category:** Primary Sports · Secondary Productivity
**Support URL:** `https://<your-domain>/support`
**Privacy Policy URL:** `https://<your-domain>/privacy`
**Marketing URL (optional):** your domain

**Description**
SportSync is the all-in-one app for running a sports team. Coaches and admins manage the roster, schedule games and practices, take attendance, record stats and standings, and post announcements. Players and parents get RSVPs, team chat, the playbook, and a highlight feed where players can share their best clips for coaches to see.

• Schedule & RSVPs — games, practices and events, with one-tap RSVPs (parents can RSVP for their child)
• Roster & privacy — player contact details and emergency info are visible only to the player, linked parents, and coaches/admins
• Team chat & announcements — with push notifications
• Playbook — draw and share plays
• Highlights — post YouTube clips with start/end times for coaches and teammates
• Game days, stats, standings and analytics
• Safety first — report and block, join approval for new members, two-step verification, and a full activity log for admins

Premium (managed on the web) adds unlimited highlights, custom team branding, advanced analytics and larger uploads.

**Age rating questionnaire:** user-generated content = Yes (with moderation); unrestricted web access = No; no gambling, violence, mature themes. Expect **12+** or **13+**. Account creation requires age 13+.

**App Review notes (paste into "Notes")**
> SportSync is a team-management app. Sign in with the demo account below to see a team with a roster, schedule, chat and highlights. Premium subscriptions are purchased on our website, not in the app, and the app hides all pricing. User-generated content is moderated: every chat message and highlight has a Report option, users can block others (Account Settings → Blocked people), and team coaches/admins review reports. Account deletion is in Account Settings → Danger Zone.
> Demo login: `<create a demo account and fill in email / password here>` (this account is on a team so the reviewer can see content; turn off two-step verification on it).

**App Privacy ("nutrition label") answers**
Data **linked to the user**, used for **App Functionality** only (no tracking, no advertising, no third-party analytics):
- Contact Info: name, email address, phone number
- User Content: chat messages, photos/files the user uploads, other user content (highlights, announcements)
- Identifiers: user ID
- Sensitive-ish: date of birth is collected for age verification only; emergency-contact details are entered by coaches/parents
- Health & Fitness: none. Location: none. Browsing/Search history: none.
- Diagnostics: none collected by us (hosting provider keeps standard request logs).

**Google Play Data safety form:** same answers; data is encrypted in transit; users can request deletion (in-app and via support email).
