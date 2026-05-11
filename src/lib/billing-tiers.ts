import { env } from "@/env";
import {
  PACKAGE_A_FEATURES,
  PACKAGE_B_FEATURES,
  PACKAGE_C_FEATURES,
  GOLD_FEATURES,
  PLATINUM_FEATURES,
} from "./billing-display";

/* ---------------------------------------------------------------------------
 * Server-only billing data. Imports `env` and exposes Stripe price IDs.
 * Do NOT import this from a "use client" file — use `billing-display.ts`
 * instead, or pass tier data as props from a server component.
 * --------------------------------------------------------------------------- */

/* ---------------------------------------------------------------------------
 * Employer paid tiers
 * --------------------------------------------------------------------------- */

export type PlanTier = "package_a" | "package_b" | "package_c";

export type TierDefinition = {
  id: PlanTier;
  label: string;
  priceCents: number;
  jobsPerCycle: number;
  seats: number;
  stripePriceId: string | undefined;
  features: string[];
};

export const TIERS: Record<PlanTier, TierDefinition> = {
  package_a: {
    id: "package_a",
    label: "Package A",
    priceCents: 29900,
    jobsPerCycle: 1,
    seats: 1,
    stripePriceId: env.STRIPE_PRICE_PACKAGE_A,
    features: PACKAGE_A_FEATURES,
  },
  package_b: {
    id: "package_b",
    label: "Package B",
    priceCents: 54900,
    jobsPerCycle: 2,
    seats: 3,
    stripePriceId: env.STRIPE_PRICE_PACKAGE_B,
    features: PACKAGE_B_FEATURES,
  },
  package_c: {
    id: "package_c",
    label: "Package C",
    priceCents: 74900,
    jobsPerCycle: 3,
    seats: 5,
    stripePriceId: env.STRIPE_PRICE_PACKAGE_C,
    features: PACKAGE_C_FEATURES,
  },
};

export const TIER_ORDER: PlanTier[] = ["package_a", "package_b", "package_c"];

export function tierFromPriceId(priceId: string): PlanTier | null {
  for (const tier of TIER_ORDER) {
    if (TIERS[tier].stripePriceId === priceId) return tier;
  }
  return null;
}

export function isPlanTier(value: string | null | undefined): value is PlanTier {
  return value === "package_a" || value === "package_b" || value === "package_c";
}

export function nextTier(current: PlanTier): PlanTier | null {
  const idx = TIER_ORDER.indexOf(current);
  if (idx < 0 || idx === TIER_ORDER.length - 1) return null;
  return TIER_ORDER[idx + 1];
}

/* ---------------------------------------------------------------------------
 * Jobseeker paid tiers
 * --------------------------------------------------------------------------- */

export type JobseekerPlanTier = "gold" | "platinum";

export type JobseekerTierDefinition = {
  id: JobseekerPlanTier;
  label: string;
  priceCents: number;
  stripePriceId: string | undefined;
  features: string[];
};

export const JOBSEEKER_TIERS: Record<JobseekerPlanTier, JobseekerTierDefinition> = {
  gold: {
    id: "gold",
    label: "Gold",
    priceCents: 5900,
    stripePriceId: env.STRIPE_PRICE_PACKAGE_GOLD,
    features: GOLD_FEATURES,
  },
  platinum: {
    id: "platinum",
    label: "Platinum",
    priceCents: 14900,
    stripePriceId: env.STRIPE_PRICE_PACKAGE_PLATINUM,
    features: PLATINUM_FEATURES,
  },
};

export const JOBSEEKER_TIER_ORDER: JobseekerPlanTier[] = ["gold", "platinum"];

export function jobseekerTierFromPriceId(
  priceId: string,
): JobseekerPlanTier | null {
  for (const tier of JOBSEEKER_TIER_ORDER) {
    if (JOBSEEKER_TIERS[tier].stripePriceId === priceId) return tier;
  }
  return null;
}

export function isJobseekerPlanTier(
  value: string | null | undefined,
): value is JobseekerPlanTier {
  return value === "gold" || value === "platinum";
}

/**
 * Returns true if a Stripe-managed subscription status entitles the user to
 * the paid features of their tier. Both `active` and `trialing` count — a
 * trialing subscriber is paying us in spirit and Stripe is carrying the
 * conversion risk; locking them out of paid features would generate refunds.
 *
 * Use this in any feature gate that reads a subscription_status column.
 */
export function isEntitledSubscriptionStatus(
  status: string | null | undefined,
): boolean {
  return status === "active" || status === "trialing";
}

/**
 * Returns true if the user is a Platinum jobseeker with an active or
 * trialing subscription. Used to gate Platinum-only features like
 * trainings.
 */
export function isPlatinumEntitled(args: {
  plan: string | null | undefined;
  status: string | null | undefined;
}): boolean {
  return args.plan === "platinum" && isEntitledSubscriptionStatus(args.status);
}

/* ---------------------------------------------------------------------------
 * Display data re-exports — server components can pull both server and
 * display data from this file. Client components should import directly
 * from `billing-display.ts`.
 * --------------------------------------------------------------------------- */

export type { DisplayPlan } from "./billing-display";
export {
  JOBSEEKER_DISPLAY_PLANS,
  EMPLOYER_DISPLAY_PLANS,
} from "./billing-display";

/* ---------------------------------------------------------------------------
 * Formatting helpers
 * --------------------------------------------------------------------------- */

export function formatPrice(cents: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}
