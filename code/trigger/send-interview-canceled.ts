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
import InterviewCanceledEmail, {
  type CancelVariant,
} from "@/emails/interview-canceled";

type Payload = {
  interviewId: string;
  variant: CancelVariant; // "canceled" | "expired" | "rescheduled"
  notifyCandidate: boolean;
  notifyEmployer: boolean;
  cancelReason?: string | null;
};

export const sendInterviewCanceledTask = task({
  id: "send-interview-canceled",
  maxDuration: 60,
  run: async (payload: Payload) => {
    const [iv] = await db
      .select({
        candidateName: user.name,
        candidateEmail: user.email,
        jobTitle: jobListings.title,
        orgId: employerOrgs.id,
        orgName: employerOrgs.name,
      })
      .from(interviews)
      .innerJoin(applications, eq(applications.id, interviews.applicationId))
      .innerJoin(user, eq(user.id, applications.candidateId))
      .innerJoin(jobListings, eq(jobListings.id, applications.jobId))
      .innerJoin(employerOrgs, eq(employerOrgs.id, jobListings.orgId))
      .where(eq(interviews.id, payload.interviewId))
      .limit(1);

    if (!iv) {
      logger.warn("send-interview-canceled: not found", payload);
      return { sent: 0 };
    }

    let sent = 0;

    if (payload.notifyCandidate) {
      const candidateResult = await resend.emails.send({
        from: env.EMAIL_FROM,
        to: iv.candidateEmail,
        subject: payload.variant === "rescheduled"
          ? `Interview rescheduled — ${iv.jobTitle ?? "your role"}`
          : payload.variant === "expired"
            ? `Interview proposal expired — ${iv.jobTitle ?? "your role"}`
            : `Interview canceled — ${iv.jobTitle ?? "your role"}`,
        react: InterviewCanceledEmail({
          variant: payload.variant,
          recipientName: iv.candidateName ?? null,
          companyName: iv.orgName,
          jobTitle: iv.jobTitle ?? "",
          cancelReason: payload.cancelReason ?? null,
          appUrl: env.NEXT_PUBLIC_APP_URL,
        }),
      });
      if (!candidateResult.error) sent++;
    }

    if (payload.notifyEmployer) {
      const [owner] = await db
        .select({ name: user.name, email: user.email })
        .from(orgMembers)
        .innerJoin(user, eq(user.id, orgMembers.userId))
        .where(and(eq(orgMembers.orgId, iv.orgId), eq(orgMembers.role, "owner")))
        .limit(1);
      if (owner?.email) {
        const employerResult = await resend.emails.send({
          from: env.EMAIL_FROM,
          to: owner.email,
          subject: payload.variant === "expired"
            ? `Interview proposal expired — ${iv.candidateName ?? "candidate"} for ${iv.jobTitle ?? "your role"}`
            : `Interview canceled — ${iv.candidateName ?? "candidate"} for ${iv.jobTitle ?? "your role"}`,
          react: InterviewCanceledEmail({
            variant: payload.variant,
            recipientName: owner.name ?? null,
            companyName: iv.orgName,
            jobTitle: iv.jobTitle ?? "",
            cancelReason: payload.cancelReason ?? null,
            appUrl: env.NEXT_PUBLIC_APP_URL,
          }),
        });
        if (!employerResult.error) sent++;
      }
    }

    return { sent };
  },
});
