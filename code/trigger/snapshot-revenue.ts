import { logger, schedules } from "@trigger.dev/sdk/v3";
import { desc, eq, sql } from "drizzle-orm";
import type Stripe from "stripe";
import { db } from "@/server/db";
import {
  auditLog,
  employerOrgs,
  revenueSnapshots,
} from "@/server/db/schema";
import { getStripe, STRIPE_ENABLED } from "@/lib/stripe";

type PlanBucket = "enterprise" | "growth" | "starter" | "addon";

const PLAN_PRICE_PRESETS: Record<PlanBucket, number> = {
  // Fallback monthly cents per plan when Stripe price metadata is missing.
  enterprise: 8_400_00, // $8,400/mo
  growth: 2_490_00, // $2,490/mo
  starter: 490_00, // $490/mo
  addon: 0,
};

function planFromMetadata(
  sub: Stripe.Subscription,
): PlanBucket {
  const raw = (sub.metadata?.plan ?? "").toLowerCase();
  if (raw === "enterprise" || raw === "growth" || raw === "starter" || raw === "addon") {
    return raw;
  }
  // Derive from price nickname / id when metadata isn't set.
  const item = sub.items.data[0];
  const nickname = (
    (item?.price?.nickname ?? "") +
    " " +
    (item?.price?.id ?? "")
  ).toLowerCase();
  if (nickname.includes("enterprise") || nickname.includes("platinum")) {
    return "enterprise";
  }
  if (nickname.includes("growth") || nickname.includes("gold")) {
    return "growth";
  }
  if (nickname.includes("starter") || nickname.includes("package_a")) {
    return "starter";
  }
  return "growth";
}

function monthlyCentsFor(sub: Stripe.Subscription, bucket: PlanBucket): number {
  // Sum all items, normalizing yearly → monthly.
  let cents = 0;
  for (const item of sub.items.data) {
    const price = item.price;
    if (!price) continue;
    const qty = item.quantity ?? 1;
    let unit = price.unit_amount ?? 0;
    if (price.recurring?.interval === "year") {
      unit = Math.round(unit / 12);
    }
    cents += unit * qty;
  }
  if (cents === 0) {
    cents = PLAN_PRICE_PRESETS[bucket];
  }
  return cents;
}

export const snapshotRevenue = schedules.task({
  id: "snapshot-revenue",
  cron: "5 0 * * *",
  maxDuration: 600,
  run: async () => {
    if (!STRIPE_ENABLED) {
      logger.warn("Stripe disabled, writing zero-value snapshot");
    }

    const today = new Date().toISOString().slice(0, 10);
    let mrrCents = 0;
    const byBucket: Record<PlanBucket, number> = {
      enterprise: 0,
      growth: 0,
      starter: 0,
      addon: 0,
    };
    let activeSubs = 0;

    if (STRIPE_ENABLED) {
      const stripe = getStripe();
      // Paginate active subscriptions.
      let starting_after: string | undefined;
      while (true) {
        const page = await stripe.subscriptions.list({
          status: "active",
          limit: 100,
          starting_after,
          expand: ["data.items.data.price"],
        });
        for (const sub of page.data) {
          const bucket = planFromMetadata(sub);
          const cents = monthlyCentsFor(sub, bucket);
          byBucket[bucket] += cents;
          mrrCents += cents;
          activeSubs += 1;
        }
        if (!page.has_more) break;
        starting_after = page.data.at(-1)?.id;
      }
    }

    const [prev] = await db
      .select()
      .from(revenueSnapshots)
      .orderBy(desc(revenueSnapshots.snapshotDate))
      .limit(1);

    // Lacking real diffing data, infer net new = max(0, activeSubs - prev.activeOrgCount)
    // and churn = max(0, prev.activeOrgCount - activeSubs).
    const prevActive = prev?.activeOrgCount ?? activeSubs;
    const newSubs = Math.max(0, activeSubs - prevActive);
    const churned = Math.max(0, prevActive - activeSubs);

    // Active org count from DB for the KPI fallback.
    const [{ count: dbActiveOrgs }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(employerOrgs)
      .where(eq(employerOrgs.subscriptionStatus, "active"));

    const activeOrgCount = STRIPE_ENABLED ? activeSubs : dbActiveOrgs;
    const arrCents = mrrCents * 12;

    await db
      .insert(revenueSnapshots)
      .values({
        snapshotDate: today,
        mrrCents,
        arrCents,
        newSubsCount: newSubs,
        churnedCount: churned,
        enterpriseCents: byBucket.enterprise,
        growthCents: byBucket.growth,
        starterCents: byBucket.starter,
        addonsCents: byBucket.addon,
        paymentsLastDayCents: 0,
        activeOrgCount,
      })
      .onConflictDoUpdate({
        target: revenueSnapshots.snapshotDate,
        set: {
          mrrCents,
          arrCents,
          newSubsCount: newSubs,
          churnedCount: churned,
          enterpriseCents: byBucket.enterprise,
          growthCents: byBucket.growth,
          starterCents: byBucket.starter,
          addonsCents: byBucket.addon,
          activeOrgCount,
        },
      });

    await db.insert(auditLog).values({
      actorLabel: "trigger.snapshot-revenue",
      action: "revenue.snapshot",
      entityType: "revenue_snapshot",
      entityId: today,
      meta: {
        mrrCents,
        arrCents,
        newSubs,
        churned,
        activeOrgCount,
        stripe: STRIPE_ENABLED,
      },
    });

    return {
      date: today,
      mrrCents,
      activeSubs: activeOrgCount,
      newSubs,
      churned,
    };
  },
});
