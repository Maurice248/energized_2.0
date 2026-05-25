import { TRPCError } from "@trpc/server";
import { and, asc, eq, or, sql } from "drizzle-orm";
import { z } from "zod";
import { adminProcedure, router } from "@/server/api/trpc";
import {
  auditLog,
  certifications,
  employerOrgs,
  orgMembers,
  profiles,
  user,
} from "@/server/db/schema";
import { resend } from "@/lib/resend";
import { env } from "@/env";
import EmployerVerifyDomainEmail from "@/emails/employer-verify-domain";

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

const CERT_TYPE_LABELS: Record<string, string> = {
  h2s_alive: "H2S Alive",
  first_aid: "First Aid",
  csts: "CSTS",
  red_seal: "Red Seal",
  p_eng: "P.Eng",
  nace: "NACE",
  fall_protection: "Fall Protection",
  other: "Other",
};

function certTypeLabel(type: string): string {
  return CERT_TYPE_LABELS[type] ?? type;
}

const PLAN_LABELS: Record<string, string> = {
  package_a: "Starter",
  package_b: "Growth",
  package_c: "Enterprise",
  package_gold: "Growth",
  package_platinum: "Enterprise",
  trial: "Trial",
  none: "Trial",
};

function planLabel(plan: string | null): string {
  if (!plan) return "Trial";
  return PLAN_LABELS[plan] ?? "Trial";
}

function domainVerifyState(
  emailTo: string | null,
  expiresAt: Date | null,
): "none" | "pending" | "expired" {
  if (!emailTo) return "none";
  if (!expiresAt) return "pending";
  if (expiresAt < new Date()) return "expired";
  return "pending";
}

/* ------------------------------------------------------------------ */
/*  Router                                                              */
/* ------------------------------------------------------------------ */

export const adminVerificationsRouter = router({
  /* ---- counts ---------------------------------------------------- */
  counts: adminProcedure.query(async ({ ctx }) => {
    const [{ pendingOrgs }] = await ctx.db
      .select({ pendingOrgs: sql<number>`count(*)::int` })
      .from(employerOrgs)
      .where(eq(employerOrgs.verified, false));

    const [{ pendingCreds }] = await ctx.db
      .select({ pendingCreds: sql<number>`count(*)::int` })
      .from(certifications)
      .where(eq(certifications.verificationStatus, "pending"));

    return {
      pendingOrgs: pendingOrgs ?? 0,
      pendingCreds: pendingCreds ?? 0,
    };
  }),

  /* ---- employers -------------------------------------------------- */
  employers: adminProcedure.query(async ({ ctx }) => {
    const orgRows = await ctx.db
      .select({
        id: employerOrgs.id,
        name: employerOrgs.name,
        domain: employerOrgs.domain,
        website: employerOrgs.website,
        hq: employerOrgs.hq,
        logoUrl: employerOrgs.logoUrl,
        logoColor: employerOrgs.logoColor,
        plan: employerOrgs.plan,
        subscriptionStatus: employerOrgs.subscriptionStatus,
        verified: employerOrgs.verified,
        verifiedAt: employerOrgs.verifiedAt,
        domainVerifyEmailTo: employerOrgs.domainVerifyEmailTo,
        domainVerifyExpiresAt: employerOrgs.domainVerifyExpiresAt,
        createdAt: employerOrgs.createdAt,
      })
      .from(employerOrgs)
      .where(eq(employerOrgs.verified, false))
      .orderBy(asc(employerOrgs.createdAt));

    const memberRows = await ctx.db
      .select({
        orgId: orgMembers.orgId,
        role: orgMembers.role,
        inviteEmail: orgMembers.email,
        userName: user.name,
        userEmail: user.email,
      })
      .from(orgMembers)
      .leftJoin(user, eq(user.id, orgMembers.userId))
      .where(
        and(
          or(eq(orgMembers.role, "owner"), eq(orgMembers.role, "admin")),
          eq(orgMembers.status, "active"),
        ),
      );

    const ownerByOrg = new Map<
      string,
      { name: string | null; email: string }
    >();
    for (const m of memberRows) {
      if (ownerByOrg.has(m.orgId)) continue;
      const email =
        typeof m.userEmail === "string" && m.userEmail.length > 0
          ? m.userEmail
          : m.inviteEmail;
      ownerByOrg.set(m.orgId, { name: m.userName ?? null, email });
    }

    return orgRows.map((org) => {
      const owner = ownerByOrg.get(org.id) ?? null;
      const dvState = domainVerifyState(
        org.domainVerifyEmailTo,
        org.domainVerifyExpiresAt,
      );
      return {
        id: org.id,
        name: org.name,
        domain: org.domain,
        website: org.website,
        hq: org.hq,
        logoUrl: org.logoUrl,
        logoColor: org.logoColor ?? "#FF7A59",
        planLabel: planLabel(org.plan),
        subscriptionStatus: org.subscriptionStatus,
        verified: org.verified,
        verifiedAt: org.verifiedAt,
        domainVerifyEmailTo: org.domainVerifyEmailTo,
        domainVerifyExpiresAt: org.domainVerifyExpiresAt,
        domainVerifyState: dvState,
        ownerName: owner?.name ?? null,
        ownerEmail: owner?.email ?? null,
        createdAt: org.createdAt,
      };
    });
  }),

  /* ---- credentials ----------------------------------------------- */
  credentials: adminProcedure
    .input(
      z
        .object({
          status: z
            .enum(["pending", "approved", "rejected", "all"])
            .default("pending"),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const statusFilter = input?.status ?? "pending";

      const rows = await ctx.db
        .select({
          id: certifications.id,
          profileId: certifications.profileId,
          type: certifications.type,
          name: certifications.name,
          issuer: certifications.issuer,
          credentialId: certifications.credentialId,
          issuedAt: certifications.issuedAt,
          expiresAt: certifications.expiresAt,
          documentUrl: certifications.documentUrl,
          verificationStatus: certifications.verificationStatus,
          verificationNote: certifications.verificationNote,
          verifiedAt: certifications.verifiedAt,
          createdAt: certifications.createdAt,
          candidateName: user.name,
          candidateEmail: user.email,
        })
        .from(certifications)
        .innerJoin(profiles, eq(profiles.id, certifications.profileId))
        .innerJoin(user, eq(user.id, profiles.userId))
        .where(
          statusFilter === "all"
            ? undefined
            : eq(certifications.verificationStatus, statusFilter),
        )
        .orderBy(asc(certifications.createdAt));

      return rows.map((r) => ({
        id: r.id,
        profileId: r.profileId,
        typeKey: r.type,
        typeLabel: certTypeLabel(r.type),
        name: r.name,
        issuer: r.issuer,
        credentialId: r.credentialId,
        issuedAt: r.issuedAt,
        expiresAt: r.expiresAt,
        documentUrl: r.documentUrl,
        verificationStatus: r.verificationStatus,
        verificationNote: r.verificationNote,
        verifiedAt: r.verifiedAt,
        createdAt: r.createdAt,
        candidateName: r.candidateName ?? "Unknown",
        candidateEmail: r.candidateEmail ?? "",
      }));
    }),

  /* ---- verifyOrg -------------------------------------------------- */
  verifyOrg: adminProcedure
    .input(z.object({ orgId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [org] = await ctx.db
        .select({ id: employerOrgs.id, name: employerOrgs.name })
        .from(employerOrgs)
        .where(eq(employerOrgs.id, input.orgId))
        .limit(1);
      if (!org) throw new TRPCError({ code: "NOT_FOUND" });

      await ctx.db
        .update(employerOrgs)
        .set({ verified: true, verifiedAt: new Date() })
        .where(eq(employerOrgs.id, input.orgId));

      await ctx.db.insert(auditLog).values({
        actorUserId: ctx.session.user.id,
        actorLabel: ctx.session.user.name ?? ctx.session.user.email,
        action: "admin.org.verify",
        entityType: "employer_org",
        entityId: input.orgId,
        meta: { orgName: org.name },
      });

      return { ok: true };
    }),

  /* ---- unverifyOrg ----------------------------------------------- */
  unverifyOrg: adminProcedure
    .input(z.object({ orgId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [org] = await ctx.db
        .select({ id: employerOrgs.id, name: employerOrgs.name })
        .from(employerOrgs)
        .where(eq(employerOrgs.id, input.orgId))
        .limit(1);
      if (!org) throw new TRPCError({ code: "NOT_FOUND" });

      await ctx.db
        .update(employerOrgs)
        .set({ verified: false, verifiedAt: null })
        .where(eq(employerOrgs.id, input.orgId));

      await ctx.db.insert(auditLog).values({
        actorUserId: ctx.session.user.id,
        actorLabel: ctx.session.user.name ?? ctx.session.user.email,
        action: "admin.org.unverify",
        entityType: "employer_org",
        entityId: input.orgId,
        meta: { orgName: org.name },
      });

      return { ok: true };
    }),

  /* ---- resendDomainEmail ----------------------------------------- */
  resendDomainEmail: adminProcedure
    .input(
      z.object({
        orgId: z.string().uuid(),
        email: z.string().email().max(240),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [org] = await ctx.db
        .select()
        .from(employerOrgs)
        .where(eq(employerOrgs.id, input.orgId))
        .limit(1);
      if (!org) throw new TRPCError({ code: "NOT_FOUND" });
      if (org.verified) return { ok: true };

      const toEmail = input.email.toLowerCase();
      if (org.domain) {
        const host = toEmail.split("@")[1];
        if (!host || !host.endsWith(org.domain.toLowerCase())) {
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
        .where(eq(employerOrgs.id, input.orgId));

      const verifyUrl = `${env.NEXT_PUBLIC_APP_URL}/employer/verify-domain?token=${token}`;
      const result = await resend.emails.send({
        from: env.EMAIL_FROM,
        to: toEmail,
        subject: `Confirm ${org.name} on Energized`,
        react: EmployerVerifyDomainEmail({ companyName: org.name, verifyUrl }),
      });

      if (result.error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Couldn't send email: ${result.error.message}`,
        });
      }

      await ctx.db.insert(auditLog).values({
        actorUserId: ctx.session.user.id,
        actorLabel: ctx.session.user.name ?? ctx.session.user.email,
        action: "admin.org.resend_domain_email",
        entityType: "employer_org",
        entityId: input.orgId,
        meta: { to: toEmail, orgName: org.name },
      });

      return { ok: true };
    }),

  /* ---- reviewCredential ------------------------------------------ */
  reviewCredential: adminProcedure
    .input(
      z.object({
        credentialId: z.string().uuid(),
        action: z.enum(["approved", "rejected"]),
        note: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [cert] = await ctx.db
        .select({
          id: certifications.id,
          name: certifications.name,
          profileId: certifications.profileId,
        })
        .from(certifications)
        .where(eq(certifications.id, input.credentialId))
        .limit(1);
      if (!cert) throw new TRPCError({ code: "NOT_FOUND" });

      await ctx.db
        .update(certifications)
        .set({
          verificationStatus: input.action,
          verifiedBy: ctx.session.user.id,
          verifiedAt: new Date(),
          verificationNote: input.note ?? null,
        })
        .where(eq(certifications.id, input.credentialId));

      await ctx.db.insert(auditLog).values({
        actorUserId: ctx.session.user.id,
        actorLabel: ctx.session.user.name ?? ctx.session.user.email,
        action: `admin.credential.${input.action}`,
        entityType: "certification",
        entityId: input.credentialId,
        meta: {
          certName: cert.name,
          profileId: cert.profileId,
          note: input.note ?? null,
        },
      });

      return { ok: true };
    }),
});
