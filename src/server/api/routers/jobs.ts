import { and, desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "@/server/api/trpc";
import { employerOrgs, jobListings, orgMembers } from "@/server/db/schema";
import type { ScreeningQuestion } from "@/server/db/schema/job-listings";

const sectorValues = [
  "oil_gas",
  "renewables",
  "nuclear",
  "utilities",
  "hydrogen",
  "power",
  "other",
] as const;

const workSetupValues = [
  "onsite",
  "hybrid_preferred",
  "remote_ok",
  "flexible",
] as const;

const experienceLevelValues = [
  "entry",
  "intermediate",
  "senior",
  "lead",
  "executive",
] as const;

const screeningQuestionSchema = z.object({
  q: z.string().min(1).max(280),
  required: z.boolean(),
});

const updateDraftSchema = z
  .object({
    title: z.string().max(160).nullable(),
    sector: z.enum(sectorValues).nullable(),
    subSectors: z.array(z.string().min(1).max(60)).max(4),
    experienceLevel: z.enum(experienceLevelValues).nullable(),
    location: z.string().max(160).nullable(),
    workSetup: z.enum(workSetupValues).nullable(),
    rotationSchedule: z.string().max(32).nullable(),
    hoursPerWeek: z.number().int().min(1).max(80).nullable(),
    salaryMin: z.number().int().min(0).max(10_000_000).nullable(),
    salaryMax: z.number().int().min(0).max(10_000_000).nullable(),
    salaryCurrency: z.string().min(3).max(3),
    salaryPeriod: z.enum(["year", "hour", "day"]),
    requiredCertifications: z.array(z.string().min(1).max(60)).max(20),
    screeningQuestions: z.array(screeningQuestionSchema).max(8),
    summary: z.string().max(200).nullable(),
    description: z.string().max(4000).nullable(),
  })
  .partial();

type OrgRole = "owner" | "admin" | "recruiter" | "hiring_manager" | "viewer";

const EDIT_ROLES: OrgRole[] = ["owner", "admin", "recruiter", "hiring_manager"];
export const CLOSE_ROLES: OrgRole[] = ["owner", "admin"];

async function requireOrgRole(
  ctx: {
    db: typeof import("@/server/db").db;
    session: { user: { id: string; email: string } };
  },
  allowed: OrgRole[],
): Promise<{ orgId: string; role: OrgRole }> {
  const userId = ctx.session.user.id;
  const email = ctx.session.user.email.toLowerCase();
  const [byUser] = await ctx.db
    .select({ orgId: orgMembers.orgId, role: orgMembers.role })
    .from(orgMembers)
    .where(eq(orgMembers.userId, userId))
    .limit(1);

  const member =
    byUser ??
    (
      await ctx.db
        .select({ orgId: orgMembers.orgId, role: orgMembers.role })
        .from(orgMembers)
        .where(
          and(eq(orgMembers.email, email), eq(orgMembers.status, "active")),
        )
        .limit(1)
    )[0];

  if (!member) {
    throw new TRPCError({ code: "NOT_FOUND", message: "No org found." });
  }
  if (!allowed.includes(member.role as OrgRole)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Your role can't perform that action.",
    });
  }
  return { orgId: member.orgId, role: member.role as OrgRole };
}

async function getJobForOrg(
  ctx: { db: typeof import("@/server/db").db },
  id: string,
  orgId: string,
) {
  const [row] = await ctx.db
    .select()
    .from(jobListings)
    .where(and(eq(jobListings.id, id), eq(jobListings.orgId, orgId)))
    .limit(1);
  return row ?? null;
}

function findMissingPublishFields(row: typeof jobListings.$inferSelect): string[] {
  const missing: string[] = [];
  if (!row.title || row.title.trim().length < 3) missing.push("title");
  if (!row.sector) missing.push("sector");
  if (!row.location || row.location.trim().length < 2) missing.push("location");
  if (!row.workSetup) missing.push("workSetup");
  if (!row.experienceLevel) missing.push("experienceLevel");
  if (!row.description || row.description.trim().length < 100)
    missing.push("description");
  if (row.salaryMin == null && row.salaryMax == null) missing.push("salary");
  if (row.salaryMin != null && row.salaryMax != null && row.salaryMin > row.salaryMax)
    missing.push("salaryRange");
  return missing;
}

export const jobsRouter = router({
  listForOrg: protectedProcedure.query(async ({ ctx }) => {
    const { orgId } = await requireOrgRole(ctx, [
      "owner",
      "admin",
      "recruiter",
      "hiring_manager",
      "viewer",
    ]);
    return ctx.db
      .select()
      .from(jobListings)
      .where(eq(jobListings.orgId, orgId))
      .orderBy(desc(jobListings.createdAt));
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { orgId } = await requireOrgRole(ctx, [
        "owner",
        "admin",
        "recruiter",
        "hiring_manager",
        "viewer",
      ]);
      const row = await getJobForOrg(ctx, input.id, orgId);
      if (!row)
        throw new TRPCError({ code: "NOT_FOUND", message: "Job not found." });
      return row;
    }),

  createDraft: protectedProcedure.mutation(async ({ ctx }) => {
    const { orgId } = await requireOrgRole(ctx, EDIT_ROLES);
    const [row] = await ctx.db
      .insert(jobListings)
      .values({ orgId, createdByUserId: ctx.session.user.id })
      .returning({ id: jobListings.id });
    return row;
  }),

  updateDraft: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        patch: updateDraftSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { orgId } = await requireOrgRole(ctx, EDIT_ROLES);
      const existing = await getJobForOrg(ctx, input.id, orgId);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      if (existing.status !== "draft") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only drafts can be edited with updateDraft.",
        });
      }

      const patch: Partial<typeof input.patch> & {
        screeningQuestions?: ScreeningQuestion[];
      } = { ...input.patch };

      const [row] = await ctx.db
        .update(jobListings)
        .set(patch)
        .where(eq(jobListings.id, input.id))
        .returning();
      return row;
    }),

  publish: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { orgId } = await requireOrgRole(ctx, EDIT_ROLES);
      const [org] = await ctx.db
        .select()
        .from(employerOrgs)
        .where(eq(employerOrgs.id, orgId))
        .limit(1);
      if (!org) throw new TRPCError({ code: "NOT_FOUND" });
      if (!org.verified) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Verify your company's domain before publishing a role.",
        });
      }

      const existing = await getJobForOrg(ctx, input.id, orgId);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      if (existing.status === "closed") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Closed roles must be reopened, not re-published.",
        });
      }

      const missing = findMissingPublishFields(existing);
      if (missing.length > 0) {
        // Encoded in message since the global errorFormatter in
        // src/server/api/trpc.ts only propagates zodError. Client parses
        // this prefix to drive field highlighting.
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `MISSING_FIELDS:${missing.join(",")}`,
        });
      }

      const [row] = await ctx.db
        .update(jobListings)
        .set({ status: "published", publishedAt: new Date() })
        .where(eq(jobListings.id, input.id))
        .returning();
      return row;
    }),

  close: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { orgId } = await requireOrgRole(ctx, CLOSE_ROLES);
      const existing = await getJobForOrg(ctx, input.id, orgId);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      if (existing.status !== "published") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only published roles can be closed.",
        });
      }
      const [row] = await ctx.db
        .update(jobListings)
        .set({ status: "closed", closedAt: new Date() })
        .where(eq(jobListings.id, input.id))
        .returning();
      return row;
    }),

  reopen: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { orgId } = await requireOrgRole(ctx, CLOSE_ROLES);
      const existing = await getJobForOrg(ctx, input.id, orgId);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      if (existing.status !== "closed") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only closed roles can be reopened.",
        });
      }
      const [row] = await ctx.db
        .update(jobListings)
        .set({ status: "published", closedAt: null })
        .where(eq(jobListings.id, input.id))
        .returning();
      return row;
    }),
});
