import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getStripeClient } from "@/lib/stripe";

// Stripe calls this directly (no user session), so the only thing that
// proves a request is genuinely from Stripe is a valid signature on the
// exact raw request body — never trust this route's payload otherwise.
export async function POST(req: Request) {
  const stripe = getStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const teamId = session.client_reference_id;
        const subscriptionId =
          typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
        if (teamId && subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          await syncSubscriptionToTeam(teamId, subscription);
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const teamId = await resolveTeamId(subscription);
        if (teamId) await syncSubscriptionToTeam(teamId, subscription);
        break;
      }
      default:
        break;
    }
  } catch {
    // Swallow processing errors so Stripe doesn't infinitely retry a
    // permanently-broken payload; the raw event is still visible in the
    // Stripe dashboard for debugging.
  }

  return NextResponse.json({ received: true });
}

async function resolveTeamId(subscription: Stripe.Subscription): Promise<string | null> {
  const fromMetadata = subscription.metadata?.teamId;
  if (fromMetadata) return fromMetadata;

  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const team = await prisma.team.findUnique({ where: { stripeCustomerId: customerId } });
  return team?.id ?? null;
}

async function syncSubscriptionToTeam(teamId: string, subscription: Stripe.Subscription) {
  const item = subscription.items.data[0];
  const periodEndUnix = item?.current_period_end;

  await prisma.team
    .update({
      where: { id: teamId },
      data: {
        stripeSubscriptionId: subscription.id,
        stripePriceId: item?.price.id ?? null,
        subscriptionStatus: subscription.status,
        currentPeriodEnd: periodEndUnix ? new Date(periodEndUnix * 1000) : null,
      },
    })
    .catch(() => undefined);
}
