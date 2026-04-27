import { env } from "@/env";

export type PlanTier = "package_a" | "package_b" | "package_c";

export type TierDefinition = {
  id: PlanTier;
  label: string;
  priceCents: number;
  jobsPerCycle: number;
  stripePriceId: string | undefined;
  features: string[];
};

export const TIERS: Record<PlanTier, TierDefinition> = {
  package_a: {
    id: "package_a",
    label: "Package A",
    priceCents: 29900,
    jobsPerCycle: 1,
    stripePriceId: env.STRIPE_PRICE_PACKAGE_A,
    features: [
      "1 published role per billing cycle",
      "Full applicant pipeline + emails",
      "Branded company page",
    ],
  },
  package_b: {
    id: "package_b",
    label: "Package B",
    priceCents: 54900,
    jobsPerCycle: 3,
    stripePriceId: env.STRIPE_PRICE_PACKAGE_B,
    features: [
      "3 published roles per billing cycle",
      "Everything in Package A",
    ],
  },
  package_c: {
    id: "package_c",
    label: "Package C",
    priceCents: 74900,
    jobsPerCycle: 5,
    stripePriceId: env.STRIPE_PRICE_PACKAGE_C,
    features: [
      "5 published roles per billing cycle",
      "Everything in Package B",
    ],
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

export function formatPrice(cents: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}
