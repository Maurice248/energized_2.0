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
});
