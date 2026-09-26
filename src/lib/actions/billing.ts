"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { getStripeClient } from "@/lib/stripe";
import { PREMIUM_PLANS, type PremiumPlan } from "@/lib/billing";

async function originUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function startCheckout(teamId: string, plan: PremiumPlan) {
  const { user } = await requireRole(teamId, ["ADMIN"]);

  const stripe = getStripeClient();
  const priceId = PREMIUM_PLANS[plan]?.priceId;
  if (!stripe || !priceId) {
    redirect(`/teams/${teamId}/premium?error=not-configured`);
  }

  const team = await prisma.team.findUniqueOrThrow({ where: { id: teamId } });
  const origin = await originUrl();

  let customerId = team.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      name: team.name,
      metadata: { teamId },
    });
    customerId = customer.id;
    await prisma.team.update({ where: { id: teamId }, data: { stripeCustomerId: customerId } });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/teams/${teamId}/premium?success=1`,
    cancel_url: `${origin}/teams/${teamId}/premium?canceled=1`,
    client_reference_id: teamId,
    subscription_data: { metadata: { teamId } },
  });

  if (!session.url) redirect(`/teams/${teamId}/premium?error=checkout-failed`);
  redirect(session.url);
}

export async function openBillingPortal(teamId: string) {
  await requireRole(teamId, ["ADMIN"]);

  const stripe = getStripeClient();
  const team = await prisma.team.findUniqueOrThrow({ where: { id: teamId } });
  if (!stripe || !team.stripeCustomerId) {
    redirect(`/teams/${teamId}/premium?error=not-configured`);
  }

  const origin = await originUrl();
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: team.stripeCustomerId,
    return_url: `${origin}/teams/${teamId}/premium`,
  });

  redirect(portalSession.url);
}
