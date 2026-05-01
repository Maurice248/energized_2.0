import { logger, task } from "@trigger.dev/sdk/v3";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import {
  applications,
  employerOrgs,
  jobListings,
  notifications,
  user,
} from "@/server/db/schema";
import { resend } from "@/lib/resend";
import { env } from "@/env";
import ApplicationStatusChangedEmail, {
  type StatusChangeStatus,
} from "@/emails/application-status-changed";

type Payload = {
  applicationId: string;
  toStatus: StatusChangeStatus;
};

const SUBJECTS: Record<StatusChangeStatus, (job: string, co: string) => string> = {
  reviewed: (job, co) => `${co} is reviewing your application — ${job}`,
  interview: (job, co) => `${co} wants to interview you — ${job}`,
  offer: (job, co) => `You have an offer from ${co} — ${job}`,
  rejected: (job, co) => `Update on your application — ${co}, ${job}`,
};

export const sendApplicationStatusEmailTask = task({
  id: "send-application-status-email",
  maxDuration: 60,
  run: async (payload: Payload) => {
    const [row] = await db
      .select({
        candidateUserId: applications.candidateId,
        candidateName: user.name,
        candidateEmail: user.email,
        jobTitle: jobListings.title,
        orgName: employerOrgs.name,
      })
      .from(applications)
      .innerJoin(jobListings, eq(jobListings.id, applications.jobId))
      .innerJoin(employerOrgs, eq(employerOrgs.id, jobListings.orgId))
      .innerJoin(user, eq(user.id, applications.candidateId))
      .where(eq(applications.id, payload.applicationId))
      .limit(1);

    if (!row) {
      logger.warn("send-application-status-email: application not found", payload);
      return { sent: 0 };
    }

    const appUrl = env.NEXT_PUBLIC_APP_URL;
    const viewUrl =
      payload.toStatus === "rejected" ? `${appUrl}/jobs` : `${appUrl}/applications`;
    const jobTitleLabel = row.jobTitle ?? "a role";

    const result = await resend.emails.send({
      from: env.EMAIL_FROM,
      to: row.candidateEmail,
      subject: SUBJECTS[payload.toStatus](jobTitleLabel, row.orgName),
      react: ApplicationStatusChangedEmail({
        candidateName: row.candidateName ?? "there",
        jobTitle: jobTitleLabel,
        companyName: row.orgName,
        status: payload.toStatus,
        viewUrl,
      }),
    });

    if (result.error) {
      logger.error("application status email send failed", {
        reason: String(result.error),
      });
    }

    const STATUS_TITLES: Record<typeof payload.toStatus, string> = {
      reviewed: `Application under review — ${jobTitleLabel}`,
      interview: `Interview invitation — ${jobTitleLabel}`,
      offer: `You have an offer — ${jobTitleLabel}`,
      rejected: `Update on your application — ${jobTitleLabel}`,
    };

    try {
      await db.insert(notifications).values({
        userId: row.candidateUserId,
        kind: "application_status_changed",
        title: STATUS_TITLES[payload.toStatus],
        body: `${row.orgName} updated your application status.`,
        href:
          payload.toStatus === "rejected"
            ? `${appUrl}/jobs`
            : `${appUrl}/applications`,
      });
    } catch (e) {
      logger.warn("notification insert failed (candidate)", {
        reason: String(e),
      });
    }

    return { sent: result.error ? 0 : 1 };
  },
});
