import { headers } from "next/headers";

// The iOS/Android wrapper app appends "SportSyncApp" to its user agent (see
// capacitor.config.ts). Apple requires in-app purchases for digital
// subscriptions sold inside an iOS app, so inside the wrapper we show Premium
// status but no pricing, upgrade buttons or checkout links.
export async function isNativeApp(): Promise<boolean> {
  const ua = (await headers()).get("user-agent") ?? "";
  return ua.includes("SportSyncApp");
}
