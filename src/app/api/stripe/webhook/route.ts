import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, priceIdToTier } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/env";

// Stripe needs the raw, unparsed body to verify the signature.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stripe webhook. The signature is verified against STRIPE_WEBHOOK_SECRET so
 * forged requests are rejected. Entitlement writes use the service-role client
 * (the only path allowed to mutate user_billing).
 */
export async function POST(request: Request) {
  const secret = serverEnv.stripeWebhookSecret;
  if (!secret) {
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 500 },
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const body = await request.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    await handleEvent(stripe, event);
  } catch (err) {
    console.error("Stripe webhook handler error:", err);
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleEvent(stripe: Stripe, event: Stripe.Event) {
  const admin = createAdminClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      if (session.mode !== "subscription" || !session.subscription) break;
      const subscription = await stripe.subscriptions.retrieve(
        session.subscription as string,
      );
      await syncSubscription(admin, stripe, subscription);
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      await syncSubscription(admin, stripe, event.data.object);
      break;
    }
    default:
      break;
  }
}

async function syncSubscription(
  admin: ReturnType<typeof createAdminClient>,
  stripe: Stripe,
  subscription: Stripe.Subscription,
) {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  // Resolve the user: prefer subscription metadata, fall back to the customer.
  let userId = subscription.metadata?.supabase_user_id ?? null;
  if (!userId) {
    const customer = await stripe.customers.retrieve(customerId);
    if (!customer.deleted) {
      userId = customer.metadata?.supabase_user_id ?? null;
    }
  }

  const priceId = subscription.items.data[0]?.price.id;
  const isActive =
    subscription.status === "active" || subscription.status === "trialing";
  const tier = isActive ? (priceIdToTier(priceId) ?? "free") : "free";
  const periodEnd = subscription.items.data[0]?.current_period_end ?? null;

  const payload = {
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    tier,
    status: subscription.status,
    current_period_end: periodEnd
      ? new Date(periodEnd * 1000).toISOString()
      : null,
  };

  if (userId) {
    await admin
      .from("user_billing")
      .upsert({ user_id: userId, ...payload }, { onConflict: "user_id" });
  } else {
    // No user id in metadata — match on the customer id instead.
    await admin
      .from("user_billing")
      .update(payload)
      .eq("stripe_customer_id", customerId);
  }
}
