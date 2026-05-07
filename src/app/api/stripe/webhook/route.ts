import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { employerOrgs, jobListings, user } from "@/server/db/schema";
import { getStripe } from "@/lib/stripe";
import { jobseekerTierFromPriceId, tierFromPriceId } from "@/lib/billing-tiers";
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
      return "past_due";
    default:
      return "canceled";
  }
}

type Audience = "jobseeker" | "employer";

/**
 * Determine which audience a subscription belongs to. Source of truth is the
 * `metadata.audience` we set at checkout. Falls back to price-ID lookup for
 * subscriptions created before the metadata was added.
 */
function classifyAudience(sub: Stripe.Subscription): Audience {
  const meta = (sub.metadata?.audience ?? "").toLowerCase();
  if (meta === "jobseeker") return "jobseeker";
  if (meta === "employer") return "employer";

  const priceId = sub.items.data[0]?.price?.id ?? null;
  if (priceId && jobseekerTierFromPriceId(priceId)) return "jobseeker";
  return "employer";
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
      const audience = classifyAudience(sub);
      const customerId = sub.customer as string;
      const priceId = sub.items.data[0]?.price?.id ?? null;

      const item = sub.items.data[0];
      const periodStart =
        item?.current_period_start ??
        (sub as unknown as { current_period_start: number })
          .current_period_start;
      const periodEnd =
        item?.current_period_end ??
        (sub as unknown as { current_period_end: number })
          .current_period_end;

      if (audience === "jobseeker") {
        const tier = priceId ? jobseekerTierFromPriceId(priceId) : null;
        const [updated] = await db
          .update(user)
          .set({
            jobseekerPlan: tier ?? "none",
            jobseekerStripeSubscriptionId: sub.id,
            jobseekerSubscriptionStatus: mapStatus(sub.status),
            jobseekerCurrentPeriodStart: asTimestamp(periodStart),
            jobseekerCurrentPeriodEnd: asTimestamp(periodEnd),
            jobseekerCancelAtPeriodEnd: sub.cancel_at_period_end,
          })
          .where(eq(user.jobseekerStripeCustomerId, customerId))
          .returning({ id: user.id });

        if (event.type === "customer.subscription.created" && updated) {
          posthog.capture({
            distinctId: updated.id,
            event: EVENT_BILLING_SUBSCRIPTION_STARTED,
            properties: {
              audience: "jobseeker",
              subscription_id: sub.id,
              tier,
              status: sub.status,
            },
          });
        }
      } else {
        const tier = priceId ? tierFromPriceId(priceId) : null;
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
              audience: "employer",
              subscription_id: sub.id,
              tier,
              status: sub.status,
            },
          });
        }
      }
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const audience = classifyAudience(sub);
      const customerId = sub.customer as string;

      if (audience === "jobseeker") {
        const [u] = await db
          .select({ id: user.id })
          .from(user)
          .where(eq(user.jobseekerStripeCustomerId, customerId))
          .limit(1);

        if (u) {
          await db
            .update(user)
            .set({
              jobseekerPlan: "none",
              jobseekerSubscriptionStatus: "canceled",
              jobseekerStripeSubscriptionId: null,
              jobseekerCancelAtPeriodEnd: false,
              jobseekerCancellationDisposition: null,
            })
            .where(eq(user.id, u.id));

          posthog.capture({
            distinctId: u.id,
            event: EVENT_BILLING_SUBSCRIPTION_CANCELLED,
            properties: {
              audience: "jobseeker",
              subscription_id: sub.id,
            },
          });
        }
      } else {
        const [org] = await db
          .select()
          .from(employerOrgs)
          .where(eq(employerOrgs.stripeCustomerId, customerId))
          .limit(1);

        if (org) {
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
              audience: "employer",
              subscription_id: sub.id,
              disposition: org.cancellationDisposition,
            },
          });
        }
      }
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
