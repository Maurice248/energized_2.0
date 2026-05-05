import { TRPCError } from "@trpc/server";
import { and, desc, eq, gt } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { z } from "zod";
import { protectedProcedure, router } from "@/server/api/trpc";
import {
  employerOrgs,
  introRequests,
  notifications,
  orgMembers,
  orgRoleEnum,
  profiles,
  user,
} from "@/server/db/schema";

type OrgRole = (typeof orgRoleEnum.enumValues)[number];

async function requireOrgMembership(
  ctx: { db: typeof import("@/server/db").db; session: { user: { id: string } } },
): Promise<{ orgId: string; role: OrgRole }> {
  const [row] = await ctx.db
    .select({ orgId: orgMembers.orgId, role: orgMembers.role })
    .from(orgMembers)
    .where(
      and(
        eq(orgMembers.userId, ctx.session.user.id),
        eq(orgMembers.status, "active"),
      ),
    )
    .limit(1);
  if (!row) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You must be a member of an employer org.",
    });
  }
  return { orgId: row.orgId, role: row.role };
}

export const introRequestsRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        candidateUserId: z.string().min(1),
        message: z
          .string()
          .trim()
          .max(1000)
          .optional()
          .transform((v) => (v && v.length > 0 ? v : null)),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { orgId } = await requireOrgMembership(ctx);

      if (input.candidateUserId === ctx.session.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You can't request an intro from yourself.",
        });
      }

      const [candidate] = await ctx.db
        .select({ role: user.role })
        .from(user)
        .where(eq(user.id, input.candidateUserId))
        .limit(1);
      if (!candidate) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Candidate not found." });
      }
      if (candidate.role === "employer") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You can't request an intro from an employer account.",
        });
      }

      // Dedup: any existing pending row for (orgId, candidateUserId)?
      // TODO: this SELECT-then-INSERT has a TOCTOU gap; proper fix is a unique
      //       partial index UNIQUE (org_id, candidate_user_id) WHERE status = 'pending',
      //       which requires a schema migration — deferred.
      const [pending] = await ctx.db
        .select({ id: introRequests.id })
        .from(introRequests)
        .where(
          and(
            eq(introRequests.orgId, orgId),
            eq(introRequests.candidateUserId, input.candidateUserId),
            eq(introRequests.status, "pending"),
          ),
        )
        .limit(1);
      if (pending) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "An intro request is already pending.",
        });
      }

      // Cooldown: declined within last 30 days?
      const cooldownThreshold = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const [recentDeclined] = await ctx.db
        .select({ declinedAt: introRequests.declinedAt })
        .from(introRequests)
        .where(
          and(
            eq(introRequests.orgId, orgId),
            eq(introRequests.candidateUserId, input.candidateUserId),
            eq(introRequests.status, "declined"),
            gt(introRequests.declinedAt, cooldownThreshold),
          ),
        )
        .orderBy(desc(introRequests.declinedAt))
        .limit(1);
      if (recentDeclined && recentDeclined.declinedAt) {
        const retryAt = new Date(
          recentDeclined.declinedAt.getTime() + 30 * 24 * 60 * 60 * 1000,
        );
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `This candidate declined a recent request — try again after ${retryAt.toISOString().slice(0, 10)}.`,
        });
      }

      const [inserted] = await ctx.db
        .insert(introRequests)
        .values({
          orgId,
          candidateUserId: input.candidateUserId,
          requestedByUserId: ctx.session.user.id,
          message: input.message,
          expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        })
        .returning({ id: introRequests.id });

      // Notif insert (try/catch — DB blip on notif insert won't poison the email send)
      const [orgRow] = await ctx.db
        .select({ name: employerOrgs.name })
        .from(employerOrgs)
        .where(eq(employerOrgs.id, orgId))
        .limit(1);
      try {
        await ctx.db.insert(notifications).values({
          userId: input.candidateUserId,
          kind: "intro_requested",
          title: `${orgRow?.name ?? "An employer"} would like an intro`,
          body: input.message ?? null,
          href: "/dashboard#intros",
        });
      } catch {}

      return { introRequestId: inserted.id };
    }),

  cancel: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { orgId } = await requireOrgMembership(ctx);
      const [row] = await ctx.db
        .select({ orgId: introRequests.orgId })
        .from(introRequests)
        .where(eq(introRequests.id, input.id))
        .limit(1);
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      if (row.orgId !== orgId) throw new TRPCError({ code: "FORBIDDEN" });
      const updated = await ctx.db
        .update(introRequests)
        .set({ status: "canceled", canceledAt: new Date(), updatedAt: new Date() })
        .where(
          and(
            eq(introRequests.id, input.id),
            eq(introRequests.status, "pending"),
          ),
        )
        .returning({ id: introRequests.id });
      if (updated.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This request is no longer pending.",
        });
      }
      return { ok: true };
    }),

  acceptForMe: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select({
          candidateUserId: introRequests.candidateUserId,
          requestedByUserId: introRequests.requestedByUserId,
          orgId: introRequests.orgId,
        })
        .from(introRequests)
        .where(eq(introRequests.id, input.id))
        .limit(1);
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      if (row.candidateUserId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const updated = await ctx.db
        .update(introRequests)
        .set({ status: "accepted", acceptedAt: new Date(), updatedAt: new Date() })
        .where(
          and(
            eq(introRequests.id, input.id),
            eq(introRequests.status, "pending"),
          ),
        )
        .returning({ id: introRequests.id });
      if (updated.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This request is no longer pending.",
        });
      }

      // Resolve recipient: requester first, org owner fallback
      let recipientUserId: string | null = row.requestedByUserId;
      if (!recipientUserId) {
        const [owner] = await ctx.db
          .select({ id: user.id })
          .from(orgMembers)
          .innerJoin(user, eq(user.id, orgMembers.userId))
          .where(
            and(
              eq(orgMembers.orgId, row.orgId),
              eq(orgMembers.role, "owner"),
            ),
          )
          .limit(1);
        recipientUserId = owner?.id ?? null;
      }

      if (recipientUserId) {
        try {
          await ctx.db.insert(notifications).values({
            userId: recipientUserId,
            kind: "intro_accepted",
            title: `${ctx.session.user.name ?? "A candidate"} accepted your intro request`,
            body: null,
            href: `/employer/intro-requests?focus=${input.id}`,
          });
        } catch {}
      }

      return { ok: true };
    }),

  declineForMe: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select({
          candidateUserId: introRequests.candidateUserId,
          requestedByUserId: introRequests.requestedByUserId,
          orgId: introRequests.orgId,
        })
        .from(introRequests)
        .where(eq(introRequests.id, input.id))
        .limit(1);
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      if (row.candidateUserId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const updated = await ctx.db
        .update(introRequests)
        .set({ status: "declined", declinedAt: new Date(), updatedAt: new Date() })
        .where(
          and(
            eq(introRequests.id, input.id),
            eq(introRequests.status, "pending"),
          ),
        )
        .returning({ id: introRequests.id });
      if (updated.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This request is no longer pending.",
        });
      }

      // Same recipient resolution as accept (requester then owner fallback)
      let recipientUserId: string | null = row.requestedByUserId;
      if (!recipientUserId) {
        const [owner] = await ctx.db
          .select({ id: user.id })
          .from(orgMembers)
          .innerJoin(user, eq(user.id, orgMembers.userId))
          .where(
            and(
              eq(orgMembers.orgId, row.orgId),
              eq(orgMembers.role, "owner"),
            ),
          )
          .limit(1);
        recipientUserId = owner?.id ?? null;
      }

      if (recipientUserId) {
        try {
          await ctx.db.insert(notifications).values({
            userId: recipientUserId,
            kind: "intro_declined",
            title: "Your intro request was declined",
            body: null,
            href: `/employer/intro-requests?focus=${input.id}`,
          });
        } catch {}
      }

      // Intentional: no email on decline (per spec §6 / Q2 design).
      return { ok: true };
    }),

  listForOrg: protectedProcedure
    .input(
      z.object({
        status: z
          .enum(["pending", "accepted", "declined", "canceled", "all"])
          .default("pending"),
        limit: z.number().min(1).max(200).default(50),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { orgId } = await requireOrgMembership(ctx);

      const conditions = [eq(introRequests.orgId, orgId)];
      if (input.status !== "all") {
        conditions.push(eq(introRequests.status, input.status));
      }

      const requesterUser = alias(user, "requested_by_user");

      const rows = await ctx.db
        .select({
          id: introRequests.id,
          status: introRequests.status,
          message: introRequests.message,
          createdAt: introRequests.createdAt,
          acceptedAt: introRequests.acceptedAt,
          declinedAt: introRequests.declinedAt,
          canceledAt: introRequests.canceledAt,
          candidateId: user.id,
          candidateName: user.name,
          candidateImage: user.image,
          candidateHeadline: profiles.headline,
          candidateLocation: profiles.location,
          requestedByName: requesterUser.name,
          requestedByUserId: introRequests.requestedByUserId,
        })
        .from(introRequests)
        .innerJoin(user, eq(user.id, introRequests.candidateUserId))
        .leftJoin(profiles, eq(profiles.userId, introRequests.candidateUserId))
        .leftJoin(
          requesterUser,
          eq(requesterUser.id, introRequests.requestedByUserId),
        )
        .where(and(...conditions))
        .orderBy(desc(introRequests.createdAt))
        .limit(input.limit);

      return rows.map((r) => ({
        id: r.id,
        status: r.status,
        message: r.message,
        candidate: {
          id: r.candidateId,
          name: r.candidateName,
          image: r.candidateImage,
          headline: r.candidateHeadline,
          location: r.candidateLocation,
        },
        requestedBy: r.requestedByUserId
          ? { id: r.requestedByUserId, name: r.requestedByName ?? "" }
          : null,
        createdAt: r.createdAt,
        acceptedAt: r.acceptedAt,
        declinedAt: r.declinedAt,
        canceledAt: r.canceledAt,
      }));
    }),

  inboxForMe: protectedProcedure
    .input(
      z.object({
        status: z.enum(["pending", "accepted", "declined", "all"]).default("pending"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(introRequests.candidateUserId, ctx.session.user.id)];
      if (input.status !== "all") {
        conditions.push(eq(introRequests.status, input.status));
      }

      const rows = await ctx.db
        .select({
          id: introRequests.id,
          status: introRequests.status,
          message: introRequests.message,
          createdAt: introRequests.createdAt,
          acceptedAt: introRequests.acceptedAt,
          declinedAt: introRequests.declinedAt,
          orgId: employerOrgs.id,
          orgName: employerOrgs.name,
          orgLogoUrl: employerOrgs.logoUrl,
          requesterName: user.name,
          requesterRole: orgMembers.role,
        })
        .from(introRequests)
        .innerJoin(employerOrgs, eq(employerOrgs.id, introRequests.orgId))
        .leftJoin(user, eq(user.id, introRequests.requestedByUserId))
        .leftJoin(
          orgMembers,
          and(
            eq(orgMembers.userId, introRequests.requestedByUserId),
            eq(orgMembers.orgId, introRequests.orgId),
            eq(orgMembers.status, "active"),
          ),
        )
        .where(and(...conditions))
        .orderBy(desc(introRequests.createdAt));

      return rows.map((r) => ({
        id: r.id,
        status: r.status,
        message: r.message,
        org: { id: r.orgId, name: r.orgName, logoUrl: r.orgLogoUrl },
        requestedBy: r.requesterName
          ? { name: r.requesterName, role: r.requesterRole ?? "recruiter" }
          : null,
        createdAt: r.createdAt,
        acceptedAt: r.acceptedAt,
        declinedAt: r.declinedAt,
      }));
    }),

  pendingFromMyOrg: protectedProcedure
    .input(z.object({ candidateUserId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      // Soft gate: if caller has no org, return idle (button hidden client-side anyway)
      const [member] = await ctx.db
        .select({ orgId: orgMembers.orgId })
        .from(orgMembers)
        .where(
          and(
            eq(orgMembers.userId, ctx.session.user.id),
            eq(orgMembers.status, "active"),
          ),
        )
        .limit(1);
      if (!member) return { state: "idle" as const };

      const orgId = member.orgId;
      const rows = await ctx.db
        .select({
          id: introRequests.id,
          status: introRequests.status,
          createdAt: introRequests.createdAt,
          acceptedAt: introRequests.acceptedAt,
          declinedAt: introRequests.declinedAt,
        })
        .from(introRequests)
        .where(
          and(
            eq(introRequests.orgId, orgId),
            eq(introRequests.candidateUserId, input.candidateUserId),
          ),
        )
        .orderBy(desc(introRequests.createdAt));

      const pending = rows.find((r) => r.status === "pending");
      if (pending) {
        return {
          state: "pending" as const,
          requestId: pending.id,
          createdAt: pending.createdAt,
        };
      }
      const accepted = rows.find((r) => r.status === "accepted");
      if (accepted && accepted.acceptedAt) {
        return {
          state: "accepted" as const,
          requestId: accepted.id,
          acceptedAt: accepted.acceptedAt,
        };
      }
      const declined = rows.find((r) => r.status === "declined");
      if (declined && declined.declinedAt) {
        const retryAt = new Date(
          declined.declinedAt.getTime() + 30 * 24 * 60 * 60 * 1000,
        );
        if (retryAt > new Date()) {
          const daysRemaining = Math.ceil(
            (retryAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000),
          );
          return {
            state: "declined-cooldown" as const,
            daysRemaining,
            retryAt,
          };
        }
        return { state: "declined-can-retry" as const };
      }
      return { state: "idle" as const };
    }),

  contactForCandidate: protectedProcedure
    .input(z.object({ candidateUserId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const { orgId } = await requireOrgMembership(ctx);

      const [accepted] = await ctx.db
        .select({
          id: introRequests.id,
          acceptedAt: introRequests.acceptedAt,
        })
        .from(introRequests)
        .where(
          and(
            eq(introRequests.orgId, orgId),
            eq(introRequests.candidateUserId, input.candidateUserId),
            eq(introRequests.status, "accepted"),
          ),
        )
        .orderBy(desc(introRequests.acceptedAt))
        .limit(1);

      if (!accepted || !accepted.acceptedAt) {
        return { unlocked: false as const };
      }

      const [contact] = await ctx.db
        .select({
          email: user.email,
          phone: profiles.phone,
          resumeUrl: profiles.resumeUrl,
          resumeFilename: profiles.resumeFilename,
        })
        .from(user)
        .leftJoin(profiles, eq(profiles.userId, user.id))
        .where(eq(user.id, input.candidateUserId))
        .limit(1);

      return {
        unlocked: true as const,
        email: contact?.email ?? "",
        phone: contact?.phone ?? null,
        resumeUrl: contact?.resumeUrl ?? null,
        resumeFilename: contact?.resumeFilename ?? null,
        acceptedAt: accepted.acceptedAt,
      };
    }),
});
