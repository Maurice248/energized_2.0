import { logger, schedules, tasks } from "@trigger.dev/sdk/v3";
import { and, eq, lt } from "drizzle-orm";
import { db } from "@/server/db";
import {
  applications,
  employerOrgs,
  interviews,
  jobListings,
  notifications,
  orgMembers,
  user,
} from "@/server/db/schema";
import type { sendInterviewCanceledTask } from "./send-interview-canceled";

export const expireStaleInterviewProposals = schedules.task({
  id: "expire-stale-interview-proposals",
  cron: "0 */6 * * *",
  maxDuration: 300,
  run: async () => {
    const now = new Date();
    const updated = await db
      .update(interviews)
      .set({ status: "expired", updatedAt: now })
      .where(and(eq(interviews.status, "proposed"), lt(interviews.expiresAt, now)))
      .returning({
        id: interviews.id,
        applicationId: interviews.applicationId,
      });

    let notifs = 0;
    for (const row of updated) {
      // Resolve org owner + jobId for the notification target.
      const [meta] = await db
        .select({
          ownerId: user.id,
          jobId: jobListings.id,
        })
        .from(applications)
        .innerJoin(jobListings, eq(jobListings.id, applications.jobId))
        .innerJoin(employerOrgs, eq(employerOrgs.id, jobListings.orgId))
        .innerJoin(orgMembers, and(eq(orgMembers.orgId, employerOrgs.id), eq(orgMembers.role, "owner")))
        .innerJoin(user, eq(user.id, orgMembers.userId))
        .where(eq(applications.id, row.applicationId))
        .limit(1);

      if (meta) {
        try {
          await db.insert(notifications).values({
            userId: meta.ownerId,
            kind: "interview_canceled",
            title: "Interview proposal expired",
            body: "The candidate didn't respond in 7 days.",
            href: `/employer/jobs/${meta.jobId}/applicants?focus=${row.applicationId}`,
          });
          notifs++;
        } catch (e) {
          logger.warn("expire cron notif insert failed", { id: row.id, e: String(e) });
        }
      }

      await tasks.trigger<typeof sendInterviewCanceledTask>("send-interview-canceled", {
        interviewId: row.id,
        variant: "expired",
        notifyCandidate: false,
        notifyEmployer: true,
      });
    }

    return { expired: updated.length, notifs };
  },
});
