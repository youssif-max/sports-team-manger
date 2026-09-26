import type { Team } from "@prisma/client";

export const FREE_HIGHLIGHT_LIMIT = 3;
export const FREE_UPLOAD_MAX_BYTES = 8 * 1024 * 1024;
export const PREMIUM_UPLOAD_MAX_BYTES = 20 * 1024 * 1024;

export const PREMIUM_PLANS = {
  monthly: {
    priceId: process.env.STRIPE_PRICE_MONTHLY_ID,
    label: "Monthly",
    amountLabel: "$14.99/month",
  },
  yearly: {
    priceId: process.env.STRIPE_PRICE_YEARLY_ID,
    label: "Yearly",
    amountLabel: "$149/year",
  },
} as const;

export type PremiumPlan = keyof typeof PREMIUM_PLANS;

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing"]);

export function isTeamPremium(team: Pick<Team, "subscriptionStatus">): boolean {
  return Boolean(team.subscriptionStatus && ACTIVE_SUBSCRIPTION_STATUSES.has(team.subscriptionStatus));
}

export function maxUploadBytesFor(team: Pick<Team, "subscriptionStatus">): number {
  return isTeamPremium(team) ? PREMIUM_UPLOAD_MAX_BYTES : FREE_UPLOAD_MAX_BYTES;
}

// Rough size of a data: URL's decoded payload, without actually decoding it.
export function dataUrlByteLength(dataUrl: string): number {
  const base64 = dataUrl.split(",")[1] ?? "";
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}
