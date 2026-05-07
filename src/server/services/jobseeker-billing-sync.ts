import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import { db } from "@/server/db";
import { user } from "@/server/db/schema";
import { getStripe, STRIPE_ENABLED } from "@/lib/stripe";
import { jobseekerTierFromPriceId } from "@/lib/billing-tiers";

type LocalSubscriptionStatus =
  | "none"
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "unpaid";

function mapStatus(s: Stripe.Subscription.Status): LocalSubscriptionStatus {
  switch (s) {
    case "active":
    case "trialing":
    case "past_due":
    case "canceled":
    case "incomplete":
    case "incomplete_expired":
    case "unpaid":
      return s;
    case "paused":
      return "past_due";
    default:
      return "canceled";
  }
}

function asTimestamp(seconds: number | null | undefined): Date | null {
  return seconds ? new Date(seconds * 1000) : null;
}

/**
 * Fallback path for when the Stripe webhook hasn't yet reached the app.
 * Pulls the latest subscription for the user's Stripe customer and writes
 * the same fields the webhook would.
 *
 * Idempotent. Safe to call on every page load — but we only call it when
 * we know there's a reason to refresh.
 */
export async function syncJobseekerSubscriptionFromStripe(
  userId: string,
): Promise<{ ok: boolean; reason?: string }> {
  if (!STRIPE_ENABLED) return { ok: false, reason: "stripe-disabled" };

  const [u] = await db
    .select()
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  if (!u) return { ok: false, reason: "user-not-found" };
  if (!u.jobseekerStripeCustomerId)
    return { ok: false, reason: "no-customer-id" };

  const stripe = getStripe();
  const subs = await stripe.subscriptions.list({
    customer: u.jobseekerStripeCustomerId,
    status: "all",
    limit: 5,
  });

  const live = subs.data
    .filter(
      (s) =>
        s.status !== "canceled" && s.status !== "incomplete_expired",
    )
    .sort((a, b) => b.created - a.created)[0];

  if (!live) {
    await db
      .update(user)
      .set({
        jobseekerPlan: "none",
        jobseekerSubscriptionStatus: "canceled",
        jobseekerStripeSubscriptionId: null,
        jobseekerCancelAtPeriodEnd: false,
        jobseekerCancellationDisposition: null,
      })
      .where(eq(user.id, userId));
    return { ok: true, reason: "reset-no-live-sub" };
  }

  const priceId = live.items.data[0]?.price?.id ?? null;
  const tier = priceId ? jobseekerTierFromPriceId(priceId) : null;

  const item = live.items.data[0];
  const periodStart =
    item?.current_period_start ??
    (live as unknown as { current_period_start: number }).current_period_start;
  const periodEnd =
    item?.current_period_end ??
    (live as unknown as { current_period_end: number }).current_period_end;

  await db
    .update(user)
    .set({
      jobseekerPlan: tier ?? "none",
      jobseekerStripeSubscriptionId: live.id,
      jobseekerSubscriptionStatus: mapStatus(live.status),
      jobseekerCurrentPeriodStart: asTimestamp(periodStart),
      jobseekerCurrentPeriodEnd: asTimestamp(periodEnd),
      jobseekerCancelAtPeriodEnd: live.cancel_at_period_end,
    })
    .where(eq(user.id, userId));

  return { ok: true };
}
