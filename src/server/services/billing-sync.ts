import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import { db } from "@/server/db";
import { employerOrgs } from "@/server/db/schema";
import { getStripe, STRIPE_ENABLED } from "@/lib/stripe";
import { tierFromPriceId } from "@/lib/billing-tiers";

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

// Fallback path for when the Stripe webhook hasn't yet reached the app (dev
// without `stripe listen`, slow webhook delivery, or just a race after the
// success-redirect). Pulls the latest subscription for the org's Stripe
// customer and writes the same fields the webhook would.
//
// Idempotent. Safe to call on every page load — but we only call it when we
// know there's a reason to refresh (success redirect or explicit user action)
// to keep the Stripe API quiet.
export async function syncSubscriptionFromStripe(
  orgId: string,
): Promise<{ ok: boolean; reason?: string }> {
  if (!STRIPE_ENABLED) return { ok: false, reason: "stripe-disabled" };

  const [org] = await db
    .select()
    .from(employerOrgs)
    .where(eq(employerOrgs.id, orgId))
    .limit(1);
  if (!org) return { ok: false, reason: "org-not-found" };
  if (!org.stripeCustomerId) return { ok: false, reason: "no-customer-id" };

  const stripe = getStripe();
  const subs = await stripe.subscriptions.list({
    customer: org.stripeCustomerId,
    status: "all",
    limit: 5,
  });

  // Pick the most recently created subscription that isn't canceled.
  const live = subs.data
    .filter(
      (s) =>
        s.status !== "canceled" && s.status !== "incomplete_expired",
    )
    .sort((a, b) => b.created - a.created)[0];

  if (!live) {
    // No live subscription. Reset the org to a no-plan state if Stripe says so.
    await db
      .update(employerOrgs)
      .set({
        plan: "none",
        subscriptionStatus: "canceled",
        stripeSubscriptionId: null,
        cancelAtPeriodEnd: false,
        cancellationDisposition: null,
      })
      .where(eq(employerOrgs.id, orgId));
    return { ok: true, reason: "reset-no-live-sub" };
  }

  const priceId = live.items.data[0]?.price?.id ?? null;
  const tier = priceId ? tierFromPriceId(priceId) : null;

  const item = live.items.data[0];
  const periodStart =
    item?.current_period_start ??
    (live as unknown as { current_period_start: number }).current_period_start;
  const periodEnd =
    item?.current_period_end ??
    (live as unknown as { current_period_end: number }).current_period_end;

  await db
    .update(employerOrgs)
    .set({
      plan: tier ?? "none",
      stripeSubscriptionId: live.id,
      subscriptionStatus: mapStatus(live.status),
      currentPeriodStart: asTimestamp(periodStart),
      planRenewsAt: asTimestamp(periodEnd),
      cancelAtPeriodEnd: live.cancel_at_period_end,
    })
    .where(eq(employerOrgs.id, orgId));

  return { ok: true };
}
