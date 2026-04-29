import { and, desc, eq, gte, isNull, lt, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "@/server/api/trpc";
import {
  applications,
  employerOrgs,
  jobListings,
  orgMembers,
  profiles,
  user,
} from "@/server/db/schema";
import { resend } from "@/lib/resend";
import { env } from "@/env";
import { countEmployerOrgViews30d } from "@/server/services/profile-views";
import TeamInviteEmail from "@/emails/team-invite";
import EmployerVerifyDomainEmail from "@/emails/employer-verify-domain";

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

function labelForOrgRole(role: (typeof orgRoleValues)[number]): string {
  switch (role) {
    case "owner":
      return "Owner";
    case "admin":
      return "Admin";
    case "recruiter":
      return "Recruiter";
    case "hiring_manager":
      return "Hiring manager";
    case "viewer":
      return "Viewer";
  }
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

  getKpis: protectedProcedure.query(async ({ ctx }) => {
    const orgId = await findMyOrg(ctx);
    if (!orgId) return null;

    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [openRoles] = await ctx.db
      .select({ count: sql<number>`count(*)::int` })
      .from(jobListings)
      .where(
        and(
          eq(jobListings.orgId, orgId),
          eq(jobListings.status, "published"),
        ),
      );

    const [applicants30d] = await ctx.db
      .select({ count: sql<number>`count(*)::int` })
      .from(applications)
      .innerJoin(jobListings, eq(jobListings.id, applications.jobId))
      .where(
        and(
          eq(jobListings.orgId, orgId),
          gte(applications.createdAt, cutoff),
        ),
      );

    const [applicantsTotal] = await ctx.db
      .select({ count: sql<number>`count(*)::int` })
      .from(applications)
      .innerJoin(jobListings, eq(jobListings.id, applications.jobId))
      .where(eq(jobListings.orgId, orgId));

    const profileViews30d = await countEmployerOrgViews30d(orgId);

    return {
      openRoles: openRoles?.count ?? 0,
      applicants30d: applicants30d?.count ?? 0,
      applicantsTotal: applicantsTotal?.count ?? 0,
      profileViews30d,
    };
  }),

  getInboxQueue: protectedProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(20).default(5),
      }),
    )
    .query(async ({ ctx, input }) => {
      const orgId = await findMyOrg(ctx);
      if (!orgId) return { items: [], totalCount: 0 };

      const items = await ctx.db
        .select({
          applicationId: applications.id,
          jobId: jobListings.id,
          jobTitle: jobListings.title,
          candidateId: user.id,
          candidateName: user.name,
          candidateHeadline: profiles.headline,
          appliedAt: applications.createdAt,
        })
        .from(applications)
        .innerJoin(jobListings, eq(jobListings.id, applications.jobId))
        .innerJoin(user, eq(user.id, applications.candidateId))
        .leftJoin(profiles, eq(profiles.userId, applications.candidateId))
        .where(
          and(
            eq(jobListings.orgId, orgId),
            eq(applications.status, "submitted"),
          ),
        )
        .orderBy(desc(applications.createdAt))
        .limit(input.limit);

      const [total] = await ctx.db
        .select({ count: sql<number>`count(*)::int` })
        .from(applications)
        .innerJoin(jobListings, eq(jobListings.id, applications.jobId))
        .where(
          and(
            eq(jobListings.orgId, orgId),
            eq(applications.status, "submitted"),
          ),
        );

      return { items, totalCount: total?.count ?? 0 };
    }),

  getStaleAlerts: protectedProcedure.query(async ({ ctx }) => {
    const orgId = await findMyOrg(ctx);
    if (!orgId) return { staleApplicants: [], coldJobs: [] };

    const staleCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const coldCutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    const staleApplicantsRaw = await ctx.db
      .select({
        applicationId: applications.id,
        jobId: jobListings.id,
        jobTitle: jobListings.title,
        candidateName: user.name,
        updatedAt: applications.updatedAt,
      })
      .from(applications)
      .innerJoin(jobListings, eq(jobListings.id, applications.jobId))
      .innerJoin(user, eq(user.id, applications.candidateId))
      .where(
        and(
          eq(jobListings.orgId, orgId),
          sql`${applications.status} IN ('submitted','reviewed')`,
          lt(applications.updatedAt, staleCutoff),
        ),
      )
      .orderBy(applications.updatedAt)
      .limit(10);

    const staleApplicants = staleApplicantsRaw.map((r) => ({
      applicationId: r.applicationId,
      jobId: r.jobId,
      jobTitle: r.jobTitle,
      candidateName: r.candidateName,
      daysSinceUpdate: Math.floor(
        (Date.now() - new Date(r.updatedAt).getTime()) / (24 * 60 * 60 * 1000),
      ),
    }));

    const coldJobsRaw = await ctx.db
      .select({
        jobId: jobListings.id,
        jobTitle: jobListings.title,
        publishedAt: jobListings.publishedAt,
      })
      .from(jobListings)
      .leftJoin(applications, eq(applications.jobId, jobListings.id))
      .where(
        and(
          eq(jobListings.orgId, orgId),
          eq(jobListings.status, "published"),
          lt(jobListings.publishedAt, coldCutoff),
          isNull(applications.id),
        ),
      )
      .limit(10);

    const coldJobs = coldJobsRaw.map((r) => ({
      jobId: r.jobId,
      jobTitle: r.jobTitle,
      daysSincePosted: r.publishedAt
        ? Math.floor(
            (Date.now() - new Date(r.publishedAt).getTime()) /
              (24 * 60 * 60 * 1000),
          )
        : 0,
    }));

    return { staleApplicants, coldJobs };
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

      await ctx.db
        .update(user)
        .set({ role: "employer" })
        .where(eq(user.id, ctx.session.user.id));

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

      const [org] = await ctx.db
        .select()
        .from(employerOrgs)
        .where(eq(employerOrgs.id, orgId))
        .limit(1);
      if (!org) throw new TRPCError({ code: "NOT_FOUND" });

      const email = input.email.toLowerCase();
      const inviteToken = crypto.randomUUID().replace(/-/g, "");
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const [existing] = await ctx.db
        .select()
        .from(orgMembers)
        .where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.email, email)))
        .limit(1);

      let row;
      if (existing) {
        if (existing.status === "active") return existing;
        [row] = await ctx.db
          .update(orgMembers)
          .set({
            role: input.role,
            status: "pending",
            inviteToken,
            inviteExpiresAt: expiresAt,
            invitedByUserId: ctx.session.user.id,
            invitedAt: new Date(),
          })
          .where(eq(orgMembers.id, existing.id))
          .returning();
      } else {
        [row] = await ctx.db
          .insert(orgMembers)
          .values({
            orgId,
            email,
            role: input.role,
            status: "pending",
            inviteToken,
            inviteExpiresAt: expiresAt,
            invitedByUserId: ctx.session.user.id,
          })
          .returning();
      }

      const inviterName = ctx.session.user.name ?? ctx.session.user.email;
      const acceptUrl = `${env.NEXT_PUBLIC_APP_URL}/accept-invite?token=${inviteToken}`;
      const roleLabel = labelForOrgRole(input.role);

      const result = await resend.emails.send({
        from: env.EMAIL_FROM,
        to: email,
        subject: `${inviterName} invited you to ${org.name} on Energized`,
        react: TeamInviteEmail({
          inviterName,
          companyName: org.name,
          roleLabel,
          acceptUrl,
        }),
      });
      if (result.error) {
        console.error("[employer.inviteMember] resend rejected", result.error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Couldn't send invite email: ${result.error.message}`,
        });
      }

      return row;
    }),

  acceptInvite: protectedProcedure
    .input(z.object({ token: z.string().min(16).max(64) }))
    .mutation(async ({ ctx, input }) => {
      const [member] = await ctx.db
        .select()
        .from(orgMembers)
        .where(eq(orgMembers.inviteToken, input.token))
        .limit(1);

      if (!member) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invite not found or already used.",
        });
      }
      if (member.inviteExpiresAt && member.inviteExpiresAt < new Date()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invite expired. Ask for a new one.",
        });
      }

      const sessionEmail = ctx.session.user.email.toLowerCase();
      if (member.email.toLowerCase() !== sessionEmail) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `This invite was sent to ${member.email}. Sign in with that address to accept.`,
        });
      }

      await ctx.db
        .update(user)
        .set({ role: "employer" })
        .where(eq(user.id, ctx.session.user.id));

      const [updated] = await ctx.db
        .update(orgMembers)
        .set({
          userId: ctx.session.user.id,
          status: "active",
          acceptedAt: new Date(),
          inviteToken: null,
          inviteExpiresAt: null,
        })
        .where(eq(orgMembers.id, member.id))
        .returning();

      return updated;
    }),

  getInviteSummary: publicProcedure
    .input(z.object({ token: z.string().min(16).max(64) }))
    .query(async ({ ctx, input }) => {
      const [member] = await ctx.db
        .select({
          email: orgMembers.email,
          role: orgMembers.role,
          status: orgMembers.status,
          expiresAt: orgMembers.inviteExpiresAt,
          orgId: orgMembers.orgId,
        })
        .from(orgMembers)
        .where(eq(orgMembers.inviteToken, input.token))
        .limit(1);
      if (!member) return null;

      const [org] = await ctx.db
        .select({ name: employerOrgs.name, logoColor: employerOrgs.logoColor })
        .from(employerOrgs)
        .where(eq(employerOrgs.id, member.orgId))
        .limit(1);

      return {
        email: member.email,
        role: member.role,
        status: member.status,
        expiresAt: member.expiresAt,
        companyName: org?.name ?? "a company",
        companyLogoColor: org?.logoColor ?? "#FF7A59",
      };
    }),

  sendDomainVerifyEmail: protectedProcedure
    .input(z.object({ email: z.string().email().max(240) }))
    .mutation(async ({ ctx, input }) => {
      const orgId = await findMyOrg(ctx);
      if (!orgId) throw new TRPCError({ code: "NOT_FOUND" });

      const [org] = await ctx.db
        .select()
        .from(employerOrgs)
        .where(eq(employerOrgs.id, orgId))
        .limit(1);
      if (!org) throw new TRPCError({ code: "NOT_FOUND" });
      if (org.verified) return { ok: true };

      const toEmail = input.email.toLowerCase();
      if (org.domain) {
        const hostMatch = toEmail.split("@")[1];
        if (!hostMatch || !hostMatch.endsWith(org.domain.toLowerCase())) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Email must be at @${org.domain}.`,
          });
        }
      }

      const token = crypto.randomUUID().replace(/-/g, "");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await ctx.db
        .update(employerOrgs)
        .set({
          domainVerifyEmailToken: token,
          domainVerifyEmailTo: toEmail,
          domainVerifyEmailSentAt: new Date(),
          domainVerifyExpiresAt: expiresAt,
        })
        .where(eq(employerOrgs.id, orgId));

      const verifyUrl = `${env.NEXT_PUBLIC_APP_URL}/employer/verify-domain?token=${token}`;
      const result = await resend.emails.send({
        from: env.EMAIL_FROM,
        to: toEmail,
        subject: `Confirm ${org.name} on Energized`,
        react: EmployerVerifyDomainEmail({
          companyName: org.name,
          verifyUrl,
        }),
      });
      if (result.error) {
        console.error(
          "[employer.sendDomainVerifyEmail] resend rejected",
          result.error,
        );
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Couldn't send verification email: ${result.error.message}`,
        });
      }

      return { ok: true };
    }),

  verifyDomainByToken: publicProcedure
    .input(z.object({ token: z.string().min(16).max(64) }))
    .mutation(async ({ ctx, input }) => {
      const [org] = await ctx.db
        .select()
        .from(employerOrgs)
        .where(eq(employerOrgs.domainVerifyEmailToken, input.token))
        .limit(1);
      if (!org) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "This verification link is invalid or already used.",
        });
      }
      if (
        org.domainVerifyExpiresAt &&
        org.domainVerifyExpiresAt < new Date()
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This verification link has expired.",
        });
      }

      const [updated] = await ctx.db
        .update(employerOrgs)
        .set({
          verified: true,
          verifiedAt: new Date(),
          domainVerifyEmailToken: null,
          domainVerifyExpiresAt: null,
        })
        .where(eq(employerOrgs.id, org.id))
        .returning({ id: employerOrgs.id, name: employerOrgs.name });

      return updated;
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

  updateMemberRole: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        role: z.enum(orgRoleValues),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = await findMyOrg(ctx);
      if (!orgId) throw new TRPCError({ code: "NOT_FOUND" });
      if (input.role === "owner") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Owner transfer not supported here.",
        });
      }

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
          message: "Owner role can't be reassigned.",
        });
      }

      const [updated] = await ctx.db
        .update(orgMembers)
        .set({ role: input.role })
        .where(eq(orgMembers.id, input.id))
        .returning();
      return updated;
    }),

  setCover: protectedProcedure
    .input(z.object({ url: z.string().url().nullable() }))
    .mutation(async ({ ctx, input }) => {
      const orgId = await findMyOrg(ctx);
      if (!orgId) throw new TRPCError({ code: "NOT_FOUND" });
      const [updated] = await ctx.db
        .update(employerOrgs)
        .set({ coverUrl: input.url })
        .where(eq(employerOrgs.id, orgId))
        .returning({ coverUrl: employerOrgs.coverUrl });
      return updated;
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
