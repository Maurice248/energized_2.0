import { and, eq, gte, lt, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "@/server/api/trpc";
import {
  employerOrgs,
  jobListings,
  orgMembers,
} from "@/server/db/schema";
import { env } from "@/env";
import { getStripe, STRIPE_ENABLED } from "@/lib/stripe";
import {
  TIERS,
  TIER_ORDER,
  isPlanTier,
  type PlanTier,
} from "@/lib/billing-tiers";

type OrgRole = "owner" | "admin" | "recruiter" | "hiring_manager" | "viewer";
const BILLING_ROLES: OrgRole[] = ["owner", "admin"];

const tierZ = z.enum(["package_a", "package_b", "package_c"]);

async function findMyOrgRole(
  ctx: {
    db: typeof import("@/server/db").db;
    session: { user: { id: string; email: string } };
  },
): Promise<{ orgId: string; role: OrgRole } | null> {
  const userId = ctx.session.user.id;
  const email = ctx.session.user.email.toLowerCase();
  const [byUser] = await ctx.db
    .select({ orgId: orgMembers.orgId, role: orgMembers.role })
    .from(orgMembers)
    .where(eq(orgMembers.userId, userId))
    .limit(1);
  if (byUser) return { orgId: byUser.orgId, role: byUser.role as OrgRole };
  const [byEmail] = await ctx.db
    .select({ orgId: orgMembers.orgId, role: orgMembers.role })
    .from(orgMembers)
    .where(
      and(eq(orgMembers.email, email), eq(orgMembers.status, "active")),
    )
    .limit(1);
  return byEmail ? { orgId: byEmail.orgId, role: byEmail.role as OrgRole } : null;
}

export const billingRouter = router({
  getCurrent: protectedProcedure.query(async ({ ctx }) => {
    const member = await findMyOrgRole(ctx);
    if (!member) {
      throw new TRPCError({ code: "NOT_FOUND", message: "No org found." });
    }
    const [org] = await ctx.db
      .select()
      .from(employerOrgs)
      .where(eq(employerOrgs.id, member.orgId))
      .limit(1);
    if (!org) throw new TRPCError({ code: "NOT_FOUND" });

    const tier = isPlanTier(org.plan) ? org.plan : null;
    const quota = tier ? TIERS[tier].jobsPerCycle : 0;

    let publishedThisCycle = 0;
    if (tier && org.currentPeriodStart && org.planRenewsAt) {
      const [row] = await ctx.db
        .select({ count: sql<number>`count(*)::int` })
        .from(jobListings)
        .where(
          and(
            eq(jobListings.orgId, org.id),
            eq(jobListings.status, "published"),
            gte(jobListings.publishedAt, org.currentPeriodStart),
            lt(jobListings.publishedAt, org.planRenewsAt),
          ),
        );
      publishedThisCycle = row?.count ?? 0;
    }

    return {
      stripeEnabled: STRIPE_ENABLED,
      role: member.role,
      tier,
      status: org.subscriptionStatus,
      currentPeriodStart: org.currentPeriodStart,
      currentPeriodEnd: org.planRenewsAt,
      cancelAtPeriodEnd: org.cancelAtPeriodEnd,
      cancellationDisposition: org.cancellationDisposition,
      publishedThisCycle,
      quota,
    };
  }),

  createCheckoutSession: protectedProcedure
    .input(z.object({ tier: tierZ }))
    .mutation(async ({ ctx, input }) => {
      const member = await findMyOrgRole(ctx);
      if (!member) throw new TRPCError({ code: "NOT_FOUND" });
      if (!BILLING_ROLES.includes(member.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners and admins can manage billing.",
        });
      }

      if (!STRIPE_ENABLED) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Stripe is not configured on this environment.",
        });
      }

      const tierDef = TIERS[input.tier];
      if (!tierDef.stripePriceId) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `Stripe price id not set for ${tierDef.label}.`,
        });
      }

      const [org] = await ctx.db
        .select()
        .from(employerOrgs)
        .where(eq(employerOrgs.id, member.orgId))
        .limit(1);
      if (!org) throw new TRPCError({ code: "NOT_FOUND" });

      const stripe = getStripe();

      let customerId = org.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: ctx.session.user.email,
          name: org.name,
          metadata: { orgId: org.id },
        });
        customerId = customer.id;
        await ctx.db
          .update(employerOrgs)
          .set({ stripeCustomerId: customerId })
          .where(eq(employerOrgs.id, org.id));
      }

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        line_items: [{ price: tierDef.stripePriceId, quantity: 1 }],
        success_url: `${env.NEXT_PUBLIC_APP_URL}/employer/profile?billing=success`,
        cancel_url: `${env.NEXT_PUBLIC_APP_URL}/employer/profile?billing=cancelled`,
        subscription_data: {
          metadata: { orgId: org.id },
        },
      });

      if (!session.url) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Stripe did not return a checkout URL.",
        });
      }
      return { url: session.url };
    }),

  createPortalSession: protectedProcedure.mutation(async ({ ctx }) => {
    const member = await findMyOrgRole(ctx);
    if (!member) throw new TRPCError({ code: "NOT_FOUND" });
    if (!BILLING_ROLES.includes(member.role)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only owners and admins can manage billing.",
      });
    }

    if (!STRIPE_ENABLED) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Stripe is not configured on this environment.",
      });
    }

    const [org] = await ctx.db
      .select()
      .from(employerOrgs)
      .where(eq(employerOrgs.id, member.orgId))
      .limit(1);
    if (!org?.stripeCustomerId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No Stripe customer on file. Subscribe first.",
      });
    }

    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: org.stripeCustomerId,
      return_url: `${env.NEXT_PUBLIC_APP_URL}/employer/profile`,
    });
    return { url: session.url };
  }),

  cancel: protectedProcedure
    .input(
      z.object({
        disposition: z.enum(["close_immediate", "close_at_period_end"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const member = await findMyOrgRole(ctx);
      if (!member) throw new TRPCError({ code: "NOT_FOUND" });
      if (!BILLING_ROLES.includes(member.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners and admins can cancel.",
        });
      }

      if (!STRIPE_ENABLED) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Stripe is not configured on this environment.",
        });
      }

      const [org] = await ctx.db
        .select()
        .from(employerOrgs)
        .where(eq(employerOrgs.id, member.orgId))
        .limit(1);
      if (!org?.stripeSubscriptionId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active subscription to cancel.",
        });
      }

      const stripe = getStripe();
      // Always set cancel_at_period_end on Stripe — Stripe terms mean the
      // employer pays for the full period regardless. Disposition only
      // changes whether we close their live roles immediately.
      await stripe.subscriptions.update(org.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });

      await ctx.db
        .update(employerOrgs)
        .set({
          cancelAtPeriodEnd: true,
          cancellationDisposition: input.disposition,
        })
        .where(eq(employerOrgs.id, org.id));

      if (input.disposition === "close_immediate") {
        await ctx.db
          .update(jobListings)
          .set({ status: "closed", closedAt: new Date() })
          .where(
            and(
              eq(jobListings.orgId, org.id),
              eq(jobListings.status, "published"),
            ),
          );
      }

      return { ok: true };
    }),

  // List of all tiers for the UI (so the client doesn't import billing-tiers
  // — keeps env import contained server-side).
  listTiers: protectedProcedure.query(() => {
    return TIER_ORDER.map((t) => ({
      id: t,
      label: TIERS[t].label,
      priceCents: TIERS[t].priceCents,
      jobsPerCycle: TIERS[t].jobsPerCycle,
      features: TIERS[t].features,
      configured: Boolean(TIERS[t].stripePriceId),
    }));
  }),
});

export type _PlanTierForExport = PlanTier;
