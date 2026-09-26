import { Check, Sparkles } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getMembership } from "@/lib/auth";
import { isTeamPremium, PREMIUM_PLANS } from "@/lib/billing";
import { isStripeConfigured } from "@/lib/stripe";
import { startCheckout, openBillingPortal } from "@/lib/actions/billing";
import { formatDate } from "@/lib/format";

const FEATURES = [
  "Unlimited highlights & film",
  "Custom team branding (logo + colors)",
  "Advanced stats & analytics",
  "Bigger playbook file uploads (up to 20MB)",
];

export default async function PremiumPage({
  params,
  searchParams,
}: {
  params: Promise<{ teamId: string }>;
  searchParams: Promise<{ success?: string; canceled?: string; error?: string }>;
}) {
  const { teamId } = await params;
  const { success, canceled, error } = await searchParams;

  const [team, user] = await Promise.all([
    prisma.team.findUniqueOrThrow({ where: { id: teamId } }),
    getCurrentUser(),
  ]);

  const membership = user ? await getMembership(teamId, user.id) : null;
  const isAdmin = membership?.role === "ADMIN";
  const premium = isTeamPremium(team);
  const configured = isStripeConfigured() && Boolean(PREMIUM_PLANS.monthly.priceId);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex items-center gap-2">
        <Sparkles className="text-amber-500" size={22} />
        <h1 className="text-xl font-bold">Premium</h1>
      </div>

      {success === "1" && (
        <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800 dark:bg-green-950 dark:text-green-200">
          You&apos;re all set — Premium features are unlocking now.
        </div>
      )}
      {canceled === "1" && (
        <div className="rounded-lg bg-neutral-100 px-4 py-3 text-sm text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
          Checkout was canceled — no charge was made.
        </div>
      )}
      {error === "not-configured" && (
        <div className="rounded-lg bg-yellow-50 px-4 py-3 text-sm text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200">
          Billing isn&apos;t set up yet. Ask the app owner to finish the Stripe configuration.
        </div>
      )}

      <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-neutral-500">Current plan</p>
            <p className="text-lg font-bold">{premium ? "Premium" : "Free"}</p>
          </div>
          {premium && team.currentPeriodEnd && (
            <p className="text-xs text-neutral-500">
              Renews {formatDate(team.currentPeriodEnd)}
            </p>
          )}
        </div>

        <ul className="mt-4 flex flex-col gap-2">
          {FEATURES.map((f) => (
            <li key={f} className="flex items-center gap-2 text-sm">
              <Check
                size={16}
                className={premium ? "text-green-600" : "text-neutral-300 dark:text-neutral-600"}
              />
              <span className={premium ? "" : "text-neutral-400"}>{f}</span>
            </li>
          ))}
        </ul>

        {!isAdmin ? (
          <p className="mt-4 text-sm text-neutral-500">
            Ask a team admin to {premium ? "manage" : "upgrade"} the plan.
          </p>
        ) : premium ? (
          <form action={openBillingPortal.bind(null, teamId)} className="mt-4">
            <button
              type="submit"
              disabled={!configured}
              className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-semibold hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
            >
              Manage Billing
            </button>
          </form>
        ) : (
          <div className="mt-4 flex flex-wrap gap-3">
            <form action={startCheckout.bind(null, teamId, "monthly")}>
              <button
                type="submit"
                disabled={!configured}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
              >
                Upgrade — {PREMIUM_PLANS.monthly.amountLabel}
              </button>
            </form>
            <form action={startCheckout.bind(null, teamId, "yearly")}>
              <button
                type="submit"
                disabled={!configured}
                className="rounded-lg border border-brand-600 px-4 py-2 text-sm font-semibold text-brand-600 hover:bg-brand-50 disabled:opacity-50 dark:hover:bg-brand-950"
              >
                Upgrade — {PREMIUM_PLANS.yearly.amountLabel}
              </button>
            </form>
          </div>
        )}
      </div>

      <p className="text-xs text-neutral-400">
        Subscriptions renew automatically until canceled. Manage or cancel anytime from
        &quot;Manage Billing&quot; above — no need to contact anyone. See our{" "}
        <a href="/terms" className="underline">
          Terms of Service
        </a>{" "}
        for the full billing policy.
      </p>
    </div>
  );
}
