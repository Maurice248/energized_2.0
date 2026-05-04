import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, gt, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { tasks } from "@trigger.dev/sdk/v3";
import { protectedProcedure, router } from "@/server/api/trpc";
import {
  applications,
  employerOrgs,
  interviewSlots,
  interviews,
  jobListings,
  notifications,
  orgMembers,
  user,
} from "@/server/db/schema";
import type { sendInterviewProposedTask } from "../../../../code/trigger/send-interview-proposed";
import type { sendInterviewConfirmedTask } from "../../../../code/trigger/send-interview-confirmed";
import type { sendInterviewCanceledTask } from "../../../../code/trigger/send-interview-canceled";
import type { sendInterviewTimeRequestedTask } from "../../../../code/trigger/send-interview-time-requested";

const MEDIUM = z.enum(["video", "phone", "in_person"]);
const PRIVILEGED_ROLES = ["owner", "admin", "recruiter"] as const;
type PrivilegedRole = (typeof PRIVILEGED_ROLES)[number];

async function assertAccess(
  ctx: { db: typeof import("@/server/db").db; session: { user: { id: string } } },
  applicationId: string,
  requirePrivileged = false,
): Promise<{ orgId: string; jobId: string; candidateId: string }> {
  const [app] = await ctx.db
    .select({
      candidateId: applications.candidateId,
      orgId: jobListings.orgId,
      jobId: jobListings.id,
    })
    .from(applications)
    .innerJoin(jobListings, eq(jobListings.id, applications.jobId))
    .where(eq(applications.id, applicationId))
    .limit(1);

  if (!app) throw new TRPCError({ code: "NOT_FOUND", message: "Application not found" });

  const userId = ctx.session.user.id;
  const isCandidate = app.candidateId === userId;

  if (requirePrivileged) {
    const [member] = await ctx.db
      .select({ role: orgMembers.role })
      .from(orgMembers)
      .where(and(eq(orgMembers.orgId, app.orgId), eq(orgMembers.userId, userId)))
      .limit(1);
    if (!member || !(PRIVILEGED_ROLES as readonly string[]).includes(member.role)) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
  } else if (!isCandidate) {
    const [member] = await ctx.db
      .select({ role: orgMembers.role })
      .from(orgMembers)
      .where(and(eq(orgMembers.orgId, app.orgId), eq(orgMembers.userId, userId)))
      .limit(1);
    if (!member) throw new TRPCError({ code: "FORBIDDEN" });
  }

  return { orgId: app.orgId, jobId: app.jobId, candidateId: app.candidateId };
}

export const interviewsRouter = router({
  list: protectedProcedure
    .input(z.object({ applicationId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await assertAccess(ctx, input.applicationId, false);

      const rows = await ctx.db
        .select({
          id: interviews.id,
          status: interviews.status,
          medium: interviews.medium,
          details: interviews.details,
          durationMin: interviews.durationMin,
          notes: interviews.notes,
          cancelReason: interviews.cancelReason,
          confirmedSlotId: interviews.confirmedSlotId,
          createdAt: interviews.createdAt,
          expiresAt: interviews.expiresAt,
          proposedByName: user.name,
        })
        .from(interviews)
        .leftJoin(user, eq(user.id, interviews.proposedById))
        .where(eq(interviews.applicationId, input.applicationId))
        .orderBy(desc(interviews.createdAt));

      if (rows.length === 0) return [];

      const ids = rows.map((r) => r.id);
      const slots = await ctx.db
        .select({
          id: interviewSlots.id,
          interviewId: interviewSlots.interviewId,
          startsAt: interviewSlots.startsAt,
        })
        .from(interviewSlots)
        .where(inArray(interviewSlots.interviewId, ids))
        .orderBy(asc(interviewSlots.startsAt));

      const byInterview = new Map<string, typeof slots>();
      for (const s of slots) {
        const arr = byInterview.get(s.interviewId) ?? [];
        arr.push(s);
        byInterview.set(s.interviewId, arr);
      }

      return rows.map((r) => ({
        ...r,
        slots: (byInterview.get(r.id) ?? []).map((s) => ({
          id: s.id,
          startsAt: s.startsAt,
          isConfirmed: s.id === r.confirmedSlotId,
        })),
      }));
    }),

  proposeSlots: protectedProcedure
    .input(
      z.object({
        applicationId: z.string().uuid(),
        medium: MEDIUM,
        details: z.string().min(1).max(2000),
        durationMin: z.number().int().min(15).max(480).default(60),
        notes: z.string().max(1000).optional(),
        slots: z
          .array(z.coerce.date())
          .min(2)
          .max(5),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertAccess(ctx, input.applicationId, true);

      const now = Date.now();
      if (input.slots.some((s) => s.getTime() <= now)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "All proposed slots must be in the future.",
        });
      }

      const [active] = await ctx.db
        .select({ id: interviews.id })
        .from(interviews)
        .where(
          and(
            eq(interviews.applicationId, input.applicationId),
            inArray(interviews.status, ["proposed", "confirmed"]),
          ),
        )
        .limit(1);
      if (active) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cancel the existing interview before proposing a new one.",
        });
      }

      const expiresAt = new Date(now + 7 * 24 * 60 * 60 * 1000);

      const [iv] = await ctx.db
        .insert(interviews)
        .values({
          applicationId: input.applicationId,
          proposedById: ctx.session.user.id,
          medium: input.medium,
          details: input.details,
          durationMin: input.durationMin,
          notes: input.notes,
          expiresAt,
        })
        .returning({ id: interviews.id });

      await ctx.db.insert(interviewSlots).values(
        input.slots.map((startsAt) => ({
          interviewId: iv.id,
          startsAt,
        })),
      );

      // In-app notif for candidate.
      const [candidate] = await ctx.db
        .select({ candidateId: applications.candidateId })
        .from(applications)
        .where(eq(applications.id, input.applicationId))
        .limit(1);
      if (candidate) {
        try {
          await ctx.db.insert(notifications).values({
            userId: candidate.candidateId,
            kind: "interview_proposed",
            title: "Pick a time for your interview",
            body: "An employer has proposed times for your interview.",
            href: `/applications/${input.applicationId}`,
          });
        } catch {
          // Don't poison the email send on a notif insert blip.
        }
      }

      await tasks.trigger<typeof sendInterviewProposedTask>(
        "send-interview-proposed",
        { interviewId: iv.id },
      );

      return { interviewId: iv.id };
    }),

  confirmSlot: protectedProcedure
    .input(z.object({ interviewId: z.string().uuid(), slotId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [iv] = await ctx.db
        .select({
          id: interviews.id,
          status: interviews.status,
          applicationId: interviews.applicationId,
          candidateId: applications.candidateId,
        })
        .from(interviews)
        .innerJoin(applications, eq(applications.id, interviews.applicationId))
        .where(eq(interviews.id, input.interviewId))
        .limit(1);

      if (!iv) throw new TRPCError({ code: "NOT_FOUND" });
      if (iv.candidateId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      if (iv.status !== "proposed") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This proposal is no longer active.",
        });
      }

      const [slot] = await ctx.db
        .select({ id: interviewSlots.id, startsAt: interviewSlots.startsAt })
        .from(interviewSlots)
        .where(
          and(
            eq(interviewSlots.id, input.slotId),
            eq(interviewSlots.interviewId, input.interviewId),
          ),
        )
        .limit(1);

      if (!slot) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Slot does not belong to this interview." });
      }
      if (new Date(slot.startsAt).getTime() <= Date.now()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "That time has already passed." });
      }

      await ctx.db
        .update(interviews)
        .set({
          status: "confirmed",
          confirmedSlotId: slot.id,
          updatedAt: new Date(),
        })
        .where(eq(interviews.id, input.interviewId));

      // Notify both sides in-app.
      try {
        await ctx.db.insert(notifications).values({
          userId: iv.candidateId,
          kind: "interview_confirmed",
          title: "Interview confirmed",
          body: "Your interview is confirmed. Calendar invite is on its way.",
          href: `/applications/${iv.applicationId}`,
        });
      } catch {}

      // Resolve org owner for employer-side notif.
      const [meta] = await ctx.db
        .select({ jobId: jobListings.id, orgId: jobListings.orgId, candidateName: user.name })
        .from(applications)
        .innerJoin(jobListings, eq(jobListings.id, applications.jobId))
        .innerJoin(user, eq(user.id, applications.candidateId))
        .where(eq(applications.id, iv.applicationId))
        .limit(1);

      if (meta) {
        const [owner] = await ctx.db
          .select({ id: user.id })
          .from(orgMembers)
          .innerJoin(user, eq(user.id, orgMembers.userId))
          .where(and(eq(orgMembers.orgId, meta.orgId), eq(orgMembers.role, "owner")))
          .limit(1);
        if (owner) {
          try {
            await ctx.db.insert(notifications).values({
              userId: owner.id,
              kind: "interview_confirmed",
              title: "Interview confirmed",
              body: `${meta.candidateName ?? "A candidate"} confirmed an interview slot.`,
              href: `/employer/jobs/${meta.jobId}/applicants?focus=${iv.applicationId}`,
            });
          } catch {}
        }
      }

      await tasks.trigger<typeof sendInterviewConfirmedTask>(
        "send-interview-confirmed",
        { interviewId: input.interviewId },
      );

      return { ok: true };
    }),

  requestDifferentTime: protectedProcedure
    .input(z.object({ interviewId: z.string().uuid(), message: z.string().max(1000).optional() }))
    .mutation(async ({ ctx, input }) => {
      const [iv] = await ctx.db
        .select({
          status: interviews.status,
          applicationId: interviews.applicationId,
          candidateId: applications.candidateId,
          proposedById: interviews.proposedById,
          orgId: jobListings.orgId,
          jobId: jobListings.id,
        })
        .from(interviews)
        .innerJoin(applications, eq(applications.id, interviews.applicationId))
        .innerJoin(jobListings, eq(jobListings.id, applications.jobId))
        .where(eq(interviews.id, input.interviewId))
        .limit(1);

      if (!iv) throw new TRPCError({ code: "NOT_FOUND" });
      if (iv.candidateId !== ctx.session.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      if (iv.status !== "proposed") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This proposal is no longer active." });
      }

      // Notify proposer (or org owner fallback).
      let targetUserId = iv.proposedById ?? null;
      if (!targetUserId) {
        const [owner] = await ctx.db
          .select({ id: user.id })
          .from(orgMembers)
          .innerJoin(user, eq(user.id, orgMembers.userId))
          .where(and(eq(orgMembers.orgId, iv.orgId), eq(orgMembers.role, "owner")))
          .limit(1);
        targetUserId = owner?.id ?? null;
      }
      if (targetUserId) {
        try {
          await ctx.db.insert(notifications).values({
            userId: targetUserId,
            kind: "interview_time_requested",
            title: "Candidate asked for a different time",
            body: input.message ?? "No further details provided.",
            href: `/employer/jobs/${iv.jobId}/applicants?focus=${iv.applicationId}`,
          });
        } catch {}
      }

      await tasks.trigger<typeof sendInterviewTimeRequestedTask>(
        "send-interview-time-requested",
        { interviewId: input.interviewId, message: input.message ?? null },
      );

      return { ok: true };
    }),

  cancel: protectedProcedure
    .input(z.object({ interviewId: z.string().uuid(), reason: z.string().max(1000).optional() }))
    .mutation(async ({ ctx, input }) => {
      const [iv] = await ctx.db
        .select({
          status: interviews.status,
          applicationId: interviews.applicationId,
          candidateId: applications.candidateId,
          orgId: jobListings.orgId,
        })
        .from(interviews)
        .innerJoin(applications, eq(applications.id, interviews.applicationId))
        .innerJoin(jobListings, eq(jobListings.id, applications.jobId))
        .where(eq(interviews.id, input.interviewId))
        .limit(1);

      if (!iv) throw new TRPCError({ code: "NOT_FOUND" });
      if (iv.status !== "proposed" && iv.status !== "confirmed") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Already finalized." });
      }

      const isCandidate = iv.candidateId === ctx.session.user.id;
      if (!isCandidate) {
        const [member] = await ctx.db
          .select({ role: orgMembers.role })
          .from(orgMembers)
          .where(and(eq(orgMembers.orgId, iv.orgId), eq(orgMembers.userId, ctx.session.user.id)))
          .limit(1);
        if (!member || !(["owner", "admin", "recruiter"] as readonly string[]).includes(member.role)) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
      }

      await ctx.db
        .update(interviews)
        .set({
          status: "canceled",
          canceledById: ctx.session.user.id,
          cancelReason: input.reason ?? null,
          updatedAt: new Date(),
        })
        .where(eq(interviews.id, input.interviewId));

      await tasks.trigger<typeof sendInterviewCanceledTask>(
        "send-interview-canceled",
        {
          interviewId: input.interviewId,
          variant: "canceled",
          notifyCandidate: !isCandidate, // notify the OTHER side
          notifyEmployer: isCandidate,
          cancelReason: input.reason ?? null,
        },
      );

      return { ok: true };
    }),

  reschedule: protectedProcedure
    .input(
      z.object({
        interviewId: z.string().uuid(),
        medium: MEDIUM,
        details: z.string().min(1).max(2000),
        durationMin: z.number().int().min(15).max(480).default(60),
        notes: z.string().max(1000).optional(),
        slots: z.array(z.coerce.date()).min(2).max(5),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const now = Date.now();
      if (input.slots.some((s) => s.getTime() <= now)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "All proposed slots must be in the future." });
      }

      const [iv] = await ctx.db
        .select({
          applicationId: interviews.applicationId,
          status: interviews.status,
        })
        .from(interviews)
        .where(eq(interviews.id, input.interviewId))
        .limit(1);
      if (!iv) throw new TRPCError({ code: "NOT_FOUND" });
      if (iv.status !== "proposed" && iv.status !== "confirmed") {
        throw new TRPCError({ code: "BAD_REQUEST" });
      }

      await assertAccess(ctx, iv.applicationId, true);

      // Neon's HTTP driver doesn't support transactions, so do the
      // cancel → insert → insert sequence as separate statements.
      // Order: cancel old FIRST so the active-interview invariant
      // (at most one proposed/confirmed per application) is never
      // briefly violated. If a later step fails, recovery is to retry
      // — the now-canceled old row no longer blocks a fresh propose.
      await ctx.db
        .update(interviews)
        .set({
          status: "canceled",
          cancelReason: "rescheduled",
          canceledById: ctx.session.user.id,
          updatedAt: new Date(),
        })
        .where(eq(interviews.id, input.interviewId));

      const expiresAt = new Date(now + 7 * 24 * 60 * 60 * 1000);
      const [created] = await ctx.db
        .insert(interviews)
        .values({
          applicationId: iv.applicationId,
          proposedById: ctx.session.user.id,
          medium: input.medium,
          details: input.details,
          durationMin: input.durationMin,
          notes: input.notes,
          expiresAt,
        })
        .returning({ id: interviews.id });

      await ctx.db.insert(interviewSlots).values(
        input.slots.map((startsAt) => ({ interviewId: created.id, startsAt })),
      );

      const newId = created.id;

      // Notify candidate in-app for the new proposal.
      const [candidate] = await ctx.db
        .select({ candidateId: applications.candidateId })
        .from(applications)
        .where(eq(applications.id, iv.applicationId))
        .limit(1);
      if (candidate) {
        try {
          await ctx.db.insert(notifications).values({
            userId: candidate.candidateId,
            kind: "interview_proposed",
            title: "Your interview was rescheduled",
            body: "New times have been proposed.",
            href: `/applications/${iv.applicationId}`,
          });
        } catch {}
      }

      // Two tasks: cancel (audit trail, no emails) + new proposal (rescheduled variant).
      await tasks.trigger<typeof sendInterviewCanceledTask>(
        "send-interview-canceled",
        {
          interviewId: input.interviewId,
          variant: "rescheduled",
          notifyCandidate: false, // suppressed — proposal email below covers the candidate
          notifyEmployer: false,
        },
      );
      await tasks.trigger<typeof sendInterviewProposedTask>(
        "send-interview-proposed",
        { interviewId: newId, wasRescheduled: true },
      );

      return { interviewId: newId };
    }),

  upcomingForOrg: protectedProcedure
    .input(z.object({ orgId: z.string() }))
    .query(async ({ ctx, input }) => {
      const [member] = await ctx.db
        .select({ role: orgMembers.role })
        .from(orgMembers)
        .where(and(eq(orgMembers.orgId, input.orgId), eq(orgMembers.userId, ctx.session.user.id)))
        .limit(1);
      if (!member) throw new TRPCError({ code: "FORBIDDEN" });

      const now = new Date();
      const windowEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const rows = await ctx.db
        .select({
          interviewId: interviews.id,
          applicationId: interviews.applicationId,
          jobId: jobListings.id,
          jobTitle: jobListings.title,
          candidateUserId: applications.candidateId,
          candidateName: user.name,
          candidateAvatarUrl: user.image,
          startsAt: interviewSlots.startsAt,
          durationMin: interviews.durationMin,
          medium: interviews.medium,
          details: interviews.details,
          status: interviews.status,
          cancelReason: interviews.cancelReason,
        })
        .from(interviews)
        .innerJoin(interviewSlots, eq(interviewSlots.id, interviews.confirmedSlotId))
        .innerJoin(applications, eq(applications.id, interviews.applicationId))
        .innerJoin(user, eq(user.id, applications.candidateId))
        .innerJoin(jobListings, eq(jobListings.id, applications.jobId))
        .where(
          and(
            eq(jobListings.orgId, input.orgId),
            eq(interviews.status, "confirmed"),
            gt(interviewSlots.startsAt, now),
            sql`${interviewSlots.startsAt} < ${windowEnd}`,
          ),
        )
        .orderBy(asc(interviewSlots.startsAt));

      return rows;
    }),
});
