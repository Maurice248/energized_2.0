import { logger, task } from "@trigger.dev/sdk/v3";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import {
  applications,
  employerOrgs,
  interviews,
  jobListings,
  orgMembers,
  user,
} from "@/server/db/schema";
import { resend } from "@/lib/resend";
import { env } from "@/env";
import InterviewTimeRequestedEmail from "@/emails/interview-time-requested";

type Payload = {
  interviewId: string;
  message?: string | null;
};

export const sendInterviewTimeRequestedTask = task({
  id: "send-interview-time-requested",
  maxDuration: 60,
  run: async (payload: Payload) => {
    const [iv] = await db
      .select({
        candidateName: user.name,
        jobTitle: jobListings.title,
        jobId: jobListings.id,
        applicationId: interviews.applicationId,
        orgId: employerOrgs.id,
        proposedById: interviews.proposedById,
      })
      .from(interviews)
      .innerJoin(applications, eq(applications.id, interviews.applicationId))
      .innerJoin(user, eq(user.id, applications.candidateId))
      .innerJoin(jobListings, eq(jobListings.id, applications.jobId))
      .innerJoin(employerOrgs, eq(employerOrgs.id, jobListings.orgId))
      .where(eq(interviews.id, payload.interviewId))
      .limit(1);

    if (!iv) {
      logger.warn("send-interview-time-requested: not found", payload);
      return { sent: 0 };
    }

    // Send to the proposer if they still exist; else org owner.
    let recipientName: string | null = null;
    let recipientEmail: string | null = null;
    if (iv.proposedById) {
      const [u] = await db
        .select({ name: user.name, email: user.email })
        .from(user)
        .where(eq(user.id, iv.proposedById))
        .limit(1);
      if (u) {
        recipientName = u.name ?? null;
        recipientEmail = u.email;
      }
    }
    if (!recipientEmail) {
      const [owner] = await db
        .select({ name: user.name, email: user.email })
        .from(orgMembers)
        .innerJoin(user, eq(user.id, orgMembers.userId))
        .where(and(eq(orgMembers.orgId, iv.orgId), eq(orgMembers.role, "owner")))
        .limit(1);
      recipientName = owner?.name ?? null;
      recipientEmail = owner?.email ?? null;
    }

    if (!recipientEmail) return { sent: 0 };

    const applicantUrl = `${env.NEXT_PUBLIC_APP_URL}/employer/jobs/${iv.jobId}/applicants?focus=${iv.applicationId}`;

    const result = await resend.emails.send({
      from: env.EMAIL_FROM,
      to: recipientEmail,
      subject: `${iv.candidateName ?? "A candidate"} asked for a different interview time`,
      react: InterviewTimeRequestedEmail({
        recipientName,
        candidateName: iv.candidateName ?? "A candidate",
        jobTitle: iv.jobTitle ?? "",
        message: payload.message ?? null,
        applicantUrl,
      }),
    });
    return result.error ? { sent: 0 } : { sent: 1 };
  },
});
