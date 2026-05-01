import { logger, task } from "@trigger.dev/sdk/v3";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import {
  applications,
  employerOrgs,
  jobListings,
  notifications,
  orgMembers,
  profiles,
  user,
} from "@/server/db/schema";
import { resend } from "@/lib/resend";
import { env } from "@/env";
import ApplicationReceivedEmail from "@/emails/application-received";
import EmployerNewApplicantEmail from "@/emails/employer-new-applicant";

type Payload = { applicationId: string };

export const sendApplicationEmailTask = task({
  id: "send-application-email",
  maxDuration: 120,
  run: async (payload: Payload) => {
    const [row] = await db
      .select({
        applicationId: applications.id,
        coverNote: applications.coverNote,
        candidateName: user.name,
        candidateEmail: user.email,
        candidateHeadline: profiles.headline,
        jobId: jobListings.id,
        jobTitle: jobListings.title,
        orgId: employerOrgs.id,
        orgName: employerOrgs.name,
      })
      .from(applications)
      .innerJoin(jobListings, eq(jobListings.id, applications.jobId))
      .innerJoin(employerOrgs, eq(employerOrgs.id, jobListings.orgId))
      .innerJoin(user, eq(user.id, applications.candidateId))
      .leftJoin(profiles, eq(profiles.userId, user.id))
      .where(eq(applications.id, payload.applicationId))
      .limit(1);

    if (!row) {
      logger.warn("send-application-email: application not found", payload);
      return { sent: 0 };
    }

    const [owner] = await db
      .select({ email: orgMembers.email, userId: orgMembers.userId })
      .from(orgMembers)
      .where(
        and(
          eq(orgMembers.orgId, row.orgId),
          eq(orgMembers.role, "owner"),
          eq(orgMembers.status, "active"),
        ),
      )
      .limit(1);

    const ownerUser = owner?.userId
      ? (
          await db
            .select({ name: user.name })
            .from(user)
            .where(eq(user.id, owner.userId))
            .limit(1)
        )[0]
      : null;

    const appUrl = env.NEXT_PUBLIC_APP_URL;
    const candidateViewUrl = `${appUrl}/applications`;
    const applicantsUrl = `${appUrl}/employer/jobs/${row.jobId}/applicants`;
    const jobTitleLabel = row.jobTitle ?? "a role";

    const [candidateResult, employerResult] = await Promise.allSettled([
      resend.emails.send({
        from: env.EMAIL_FROM,
        to: row.candidateEmail,
        subject: `Application received — ${jobTitleLabel}`,
        react: ApplicationReceivedEmail({
          candidateName: row.candidateName ?? "there",
          jobTitle: jobTitleLabel,
          companyName: row.orgName,
          viewUrl: candidateViewUrl,
        }),
      }),
      owner?.email
        ? resend.emails.send({
            from: env.EMAIL_FROM,
            to: owner.email,
            subject: `New applicant — ${jobTitleLabel}`,
            react: EmployerNewApplicantEmail({
              recipientName: ownerUser?.name ?? null,
              candidateName: row.candidateName ?? "Someone",
              candidateHeadline: row.candidateHeadline,
              jobTitle: jobTitleLabel,
              companyName: row.orgName,
              applicantsUrl,
            }),
          })
        : Promise.resolve({ error: null }),
    ]);

    const sent =
      (candidateResult.status === "fulfilled" &&
      !(candidateResult.value as { error: unknown }).error
        ? 1
        : 0) +
      (employerResult.status === "fulfilled" &&
      !(employerResult.value as { error: unknown }).error
        ? 1
        : 0);

    if (candidateResult.status === "rejected") {
      logger.error("candidate email failed", {
        reason: String(candidateResult.reason),
      });
    }
    if (employerResult.status === "rejected") {
      logger.error("employer email failed", {
        reason: String(employerResult.reason),
      });
    }

    // In-app notification for the employer owner. Best-effort — if it fails we
    // still consider the email send successful.
    if (owner?.userId) {
      try {
        await db.insert(notifications).values({
          userId: owner.userId,
          kind: "application_received",
          title: `New applicant — ${jobTitleLabel}`,
          body: `${row.candidateName ?? "Someone"} just applied.`,
          href: applicantsUrl,
        });
      } catch (e) {
        logger.warn("notification insert failed (employer)", {
          reason: String(e),
        });
      }
    }

    return { sent };
  },
});
