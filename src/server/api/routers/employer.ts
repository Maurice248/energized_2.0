import { and, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "@/server/api/trpc";
import { employerOrgs, orgMembers } from "@/server/db/schema";

const sectorValues = [
  "oil_gas",
  "renewables",
  "nuclear",
  "utilities",
  "hydrogen",
  "power",
  "other",
] as const;

const companySizeValues = [
  "1_10",
  "11_50",
  "51_120",
  "120_250",
  "250_500",
  "500_1000",
  "1000_plus",
] as const;

const workSetupValues = [
  "onsite",
  "hybrid_preferred",
  "remote_ok",
  "flexible",
] as const;

const hiringPaceValues = [
  "passive",
  "when_right",
  "actively_hiring",
  "scaling_fast",
] as const;

const orgRoleValues = [
  "owner",
  "admin",
  "recruiter",
  "hiring_manager",
  "viewer",
] as const;

const orgBasicsSchema = z.object({
  name: z.string().min(1).max(160),
  domain: z.string().max(160).nullable().optional(),
  website: z.string().max(240).nullable().optional(),
  hq: z.string().max(160).nullable().optional(),
  founded: z.string().max(10).nullable().optional(),
  tagline: z.string().max(200).nullable().optional(),
  about: z.string().max(2000).nullable().optional(),
  logoUrl: z.string().url().nullable().optional(),
  logoColor: z.string().max(16).optional(),
  size: z.enum(companySizeValues).nullable().optional(),
  primarySector: z.enum(sectorValues).nullable().optional(),
  subSectors: z.array(z.string().min(1).max(60)).max(6).optional(),
});

const orgPrefsSchema = z.object({
  defaultWorkSetup: z.enum(workSetupValues).nullable().optional(),
  hiringPace: z.enum(hiringPaceValues).nullable().optional(),
  focusRoles: z.array(z.string().min(1).max(60)).max(12).optional(),
  autoMatch: z.boolean().optional(),
  prioritizeDiverse: z.boolean().optional(),
});

const inviteSchema = z.object({
  email: z.string().email().max(240),
  role: z.enum(orgRoleValues).default("recruiter"),
});

function makeVerificationToken() {
  return `energized-verify=${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

async function findMyOrg(
  ctx: { db: typeof import("@/server/db").db; session: { user: { id: string; email: string } } },
) {
  const userId = ctx.session.user.id;
  const userEmail = ctx.session.user.email.toLowerCase();

  const [byUserId] = await ctx.db
    .select({ orgId: orgMembers.orgId })
    .from(orgMembers)
    .where(eq(orgMembers.userId, userId))
    .limit(1);

  if (byUserId) return byUserId.orgId;

  const [byEmail] = await ctx.db
    .select({ orgId: orgMembers.orgId })
    .from(orgMembers)
    .where(eq(orgMembers.email, userEmail))
    .limit(1);

  return byEmail?.orgId ?? null;
}

export const employerRouter = router({
  getMyOrg: protectedProcedure.query(async ({ ctx }) => {
    const orgId = await findMyOrg(ctx);
    if (!orgId) return null;

    const [org] = await ctx.db
      .select()
      .from(employerOrgs)
      .where(eq(employerOrgs.id, orgId))
      .limit(1);

    if (!org) return null;

    const members = await ctx.db
      .select()
      .from(orgMembers)
      .where(eq(orgMembers.orgId, org.id));

    return { org, members };
  }),

  ensureOrg: protectedProcedure
    .input(z.object({ name: z.string().min(1).max(160) }))
    .mutation(async ({ ctx, input }) => {
      const existing = await findMyOrg(ctx);
      if (existing) {
        const [org] = await ctx.db
          .select()
          .from(employerOrgs)
          .where(eq(employerOrgs.id, existing))
          .limit(1);
        if (org) return org;
      }

      const [org] = await ctx.db
        .insert(employerOrgs)
        .values({
          name: input.name,
          verificationToken: makeVerificationToken(),
        })
        .returning();

      await ctx.db.insert(orgMembers).values({
        orgId: org.id,
        userId: ctx.session.user.id,
        email: ctx.session.user.email.toLowerCase(),
        role: "owner",
        status: "active",
        acceptedAt: new Date(),
      });

      return org;
    }),

  updateBasics: protectedProcedure
    .input(orgBasicsSchema)
    .mutation(async ({ ctx, input }) => {
      const orgId = await findMyOrg(ctx);
      if (!orgId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No org found. Call ensureOrg first.",
        });
      }

      const [updated] = await ctx.db
        .update(employerOrgs)
        .set({
          ...input,
        })
        .where(eq(employerOrgs.id, orgId))
        .returning();
      return updated;
    }),

  updatePrefs: protectedProcedure
    .input(orgPrefsSchema)
    .mutation(async ({ ctx, input }) => {
      const orgId = await findMyOrg(ctx);
      if (!orgId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No org found. Call ensureOrg first.",
        });
      }

      const [updated] = await ctx.db
        .update(employerOrgs)
        .set(input)
        .where(eq(employerOrgs.id, orgId))
        .returning();
      return updated;
    }),

  inviteMember: protectedProcedure
    .input(inviteSchema)
    .mutation(async ({ ctx, input }) => {
      const orgId = await findMyOrg(ctx);
      if (!orgId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No org to invite to.",
        });
      }

      const email = input.email.toLowerCase();
      const [existing] = await ctx.db
        .select()
        .from(orgMembers)
        .where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.email, email)))
        .limit(1);

      if (existing) return existing;

      const [row] = await ctx.db
        .insert(orgMembers)
        .values({
          orgId,
          email,
          role: input.role,
          status: "pending",
        })
        .returning();
      return row;
    }),

  removeMember: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const orgId = await findMyOrg(ctx);
      if (!orgId) throw new TRPCError({ code: "NOT_FOUND" });

      const [target] = await ctx.db
        .select()
        .from(orgMembers)
        .where(
          and(eq(orgMembers.id, input.id), eq(orgMembers.orgId, orgId)),
        )
        .limit(1);
      if (!target) throw new TRPCError({ code: "NOT_FOUND" });
      if (target.role === "owner") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot remove the org owner.",
        });
      }

      await ctx.db.delete(orgMembers).where(eq(orgMembers.id, input.id));
      return { ok: true };
    }),

  markVerified: protectedProcedure.mutation(async ({ ctx }) => {
    const orgId = await findMyOrg(ctx);
    if (!orgId) throw new TRPCError({ code: "NOT_FOUND" });

    const [updated] = await ctx.db
      .update(employerOrgs)
      .set({ verified: true, verifiedAt: new Date() })
      .where(eq(employerOrgs.id, orgId))
      .returning();
    return updated;
  }),
});
