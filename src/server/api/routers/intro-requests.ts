import { TRPCError } from "@trpc/server";
import { and, desc, eq, gt } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { z } from "zod";
import { tasks } from "@trigger.dev/sdk/v3";
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
    .where(eq(orgMembers.userId, ctx.session.user.id))
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
        .select({ orgId: introRequests.orgId, status: introRequests.status })
        .from(introRequests)
        .where(eq(introRequests.id, input.id))
        .limit(1);
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      if (row.orgId !== orgId) throw new TRPCError({ code: "FORBIDDEN" });
      if (row.status !== "pending") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This request is no longer pending.",
        });
      }
      await ctx.db
        .update(introRequests)
        .set({ status: "canceled", canceledAt: new Date(), updatedAt: new Date() })
        .where(eq(introRequests.id, input.id));
      return { ok: true };
    }),
});
