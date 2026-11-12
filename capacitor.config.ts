import type { CapacitorConfig } from "@capacitor/cli";

// The native apps are thin shells around the deployed website (so web fixes
// ship instantly without an App Store review). Set CAPACITOR_SERVER_URL to
// your live https address, e.g. https://sportsync.vercel.app, before running
// any `cap` command.
const serverUrl = process.env.CAPACITOR_SERVER_URL;
if (!serverUrl) {
  throw new Error("Set CAPACITOR_SERVER_URL to your deployed https URL before running Capacitor commands.");
}

const config: CapacitorConfig = {
  // Must be unique and can't be changed after the first store submission.
  appId: "com.sportsync.teams",
  appName: "SportSync",
  webDir: "capacitor-www",
  // The site reads this to hide Premium pricing/checkout in the store builds
  // (Apple requires its own in-app purchase for subscriptions sold in-app).
  appendUserAgent: "SportSyncApp",
  server: {
    url: serverUrl,
    cleartext: false,
    allowNavigation: [new URL(serverUrl).hostname],
  },
  ios: {
    contentInset: "automatic",
    backgroundColor: "#ffffff",
  },
  android: {
    backgroundColor: "#ffffff",
  },
};

export default config;
