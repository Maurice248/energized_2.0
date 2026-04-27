import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { employerOrgs, jobListings } from "@/server/db/schema";
import { getStripe } from "@/lib/stripe";
import { tierFromPriceId } from "@/lib/billing-tiers";
import { getPostHogClient } from "@/lib/posthog";
import {
  EVENT_BILLING_SUBSCRIPTION_CANCELLED,
  EVENT_BILLING_SUBSCRIPTION_STARTED,
} from "@/lib/analytics-events";

export const runtime = "nodejs";

function asTimestamp(seconds: number | null | undefined): Date | null {
  return seconds ? new Date(seconds * 1000) : null;
}

type LocalSubscriptionStatus =
  | "none"
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "unpaid";

function mapStatus(stripeStatus: Stripe.Subscription.Status): LocalSubscriptionStatus {
  switch (stripeStatus) {
    case "active":
    case "trialing":
    case "past_due":
    case "canceled":
    case "incomplete":
    case "incomplete_expired":
    case "unpaid":
      return stripeStatus;
    case "paused":
      // Treat as past_due — billing is on hold, employer can still see their
      // org but shouldn't be allowed to publish until resumed.
      return "past_due";
    default:
      return "canceled";
  }
}

export async function POST(req: Request) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return new NextResponse("Stripe not configured.", { status: 503 });
  }

  const body = await req.text();
  const signature = (await headers()).get("stripe-signature");

  if (!signature) {
    return new NextResponse("Missing stripe-signature header", { status: 400 });
  }

  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    return new NextResponse(
      `Invalid signature: ${(err as Error).message}`,
      { status: 400 },
    );
  }

  const posthog = getPostHogClient();

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = sub.customer as string;
      const priceId = sub.items.data[0]?.price?.id ?? null;
      const tier = priceId ? tierFromPriceId(priceId) : null;

      // Stripe v2026-03-25 returns first-item period dates on the item, with
      // a deprecated copy on the subscription. Prefer item-level when present.
      const item = sub.items.data[0];
      const periodStart =
        item?.current_period_start ??
        (sub as unknown as { current_period_start: number })
          .current_period_start;
      const periodEnd =
        item?.current_period_end ??
        (sub as unknown as { current_period_end: number })
          .current_period_end;

      const [updated] = await db
        .update(employerOrgs)
        .set({
          plan: tier ?? "none",
          stripeSubscriptionId: sub.id,
          subscriptionStatus: mapStatus(sub.status),
          currentPeriodStart: asTimestamp(periodStart),
          planRenewsAt: asTimestamp(periodEnd),
          cancelAtPeriodEnd: sub.cancel_at_period_end,
        })
        .where(eq(employerOrgs.stripeCustomerId, customerId))
        .returning({ id: employerOrgs.id });

      if (event.type === "customer.subscription.created" && updated) {
        posthog.capture({
          distinctId: updated.id,
          event: EVENT_BILLING_SUBSCRIPTION_STARTED,
          properties: {
            subscription_id: sub.id,
            tier,
            status: sub.status,
          },
        });
      }
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = sub.customer as string;

      const [org] = await db
        .select()
        .from(employerOrgs)
        .where(eq(employerOrgs.stripeCustomerId, customerId))
        .limit(1);

      if (org) {
        // If they chose close_at_period_end, do it now (this event fires at
        // period end). If they chose close_immediate, jobs are already closed.
        if (org.cancellationDisposition === "close_at_period_end") {
          await db
            .update(jobListings)
            .set({ status: "closed", closedAt: new Date() })
            .where(
              and(
                eq(jobListings.orgId, org.id),
                eq(jobListings.status, "published"),
              ),
            );
        }

        await db
          .update(employerOrgs)
          .set({
            plan: "none",
            subscriptionStatus: "canceled",
            stripeSubscriptionId: null,
            cancelAtPeriodEnd: false,
            cancellationDisposition: null,
          })
          .where(eq(employerOrgs.id, org.id));

        posthog.capture({
          distinctId: org.id,
          event: EVENT_BILLING_SUBSCRIPTION_CANCELLED,
          properties: {
            subscription_id: sub.id,
            disposition: org.cancellationDisposition,
          },
        });
      }
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
