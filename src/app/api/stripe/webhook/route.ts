import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { getPostHogClient } from "@/lib/posthog";
import {
  EVENT_BILLING_SUBSCRIPTION_STARTED,
  EVENT_BILLING_SUBSCRIPTION_CANCELLED,
} from "@/lib/analytics-events";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-03-25.dahlia",
});

export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get("stripe-signature");

  if (!signature) {
    return new NextResponse("Missing stripe-signature header", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    return new NextResponse(
      `Invalid signature: ${(err as Error).message}`,
      { status: 400 },
    );
  }

  const posthog = getPostHogClient();

  switch (event.type) {
    case "customer.subscription.created": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      posthog.capture({
        distinctId: customerId,
        event: EVENT_BILLING_SUBSCRIPTION_STARTED,
        properties: {
          subscription_id: subscription.id,
          plan: subscription.items.data[0]?.price?.lookup_key ?? null,
          status: subscription.status,
        },
      });
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      posthog.capture({
        distinctId: customerId,
        event: EVENT_BILLING_SUBSCRIPTION_CANCELLED,
        properties: {
          subscription_id: subscription.id,
          plan: subscription.items.data[0]?.price?.lookup_key ?? null,
          cancel_at_period_end: subscription.cancel_at_period_end,
        },
      });
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
