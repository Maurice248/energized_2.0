import { logger, task } from "@trigger.dev/sdk/v3";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import {
  applications,
  employerOrgs,
  interviews,
  interviewSlots,
  jobListings,
  orgMembers,
  user,
} from "@/server/db/schema";
import { resend } from "@/lib/resend";
import { env } from "@/env";
import InterviewConfirmedEmail from "@/emails/interview-confirmed";
import { buildInterviewIcs } from "@/lib/ics";

type Payload = { interviewId: string };

function fmtLabel(d: Date): string {
  return d.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Edmonton",
    timeZoneName: "short",
  });
}

export const sendInterviewConfirmedTask = task({
  id: "send-interview-confirmed",
  maxDuration: 60,
  run: async (payload: Payload) => {
    const [iv] = await db
      .select({
        applicationId: interviews.applicationId,
        candidateName: user.name,
        candidateEmail: user.email,
        jobTitle: jobListings.title,
        jobId: jobListings.id,
        orgId: employerOrgs.id,
        orgName: employerOrgs.name,
        durationMin: interviews.durationMin,
        medium: interviews.medium,
        details: interviews.details,
        notes: interviews.notes,
        proposedById: interviews.proposedById,
        confirmedSlotId: interviews.confirmedSlotId,
      })
      .from(interviews)
      .innerJoin(applications, eq(applications.id, interviews.applicationId))
      .innerJoin(user, eq(user.id, applications.candidateId))
      .innerJoin(jobListings, eq(jobListings.id, applications.jobId))
      .innerJoin(employerOrgs, eq(employerOrgs.id, jobListings.orgId))
      .where(eq(interviews.id, payload.interviewId))
      .limit(1);

    if (!iv || !iv.confirmedSlotId) {
      logger.warn("send-interview-confirmed: missing interview/slot", payload);
      return { sent: 0 };
    }

    const [slot] = await db
      .select({ startsAt: interviewSlots.startsAt })
      .from(interviewSlots)
      .where(eq(interviewSlots.id, iv.confirmedSlotId))
      .limit(1);

    if (!slot) return { sent: 0 };

    // Resolve proposer + a notification target on the employer side.
    const [proposer] = iv.proposedById
      ? await db
          .select({ id: user.id, name: user.name, email: user.email })
          .from(user)
          .where(eq(user.id, iv.proposedById))
          .limit(1)
      : [null as { id: string; name: string | null; email: string } | null];

    // If no proposer (deleted user), fall back to the org owner.
    let employerEmail = proposer?.email ?? null;
    let employerName = proposer?.name ?? null;
    if (!employerEmail) {
      const [owner] = await db
        .select({ name: user.name, email: user.email })
        .from(orgMembers)
        .innerJoin(user, eq(user.id, orgMembers.userId))
        .where(and(eq(orgMembers.orgId, iv.orgId), eq(orgMembers.role, "owner")))
        .limit(1);
      employerEmail = owner?.email ?? null;
      employerName = owner?.name ?? null;
    }

    const startsAt = new Date(slot.startsAt);
    const startsAtLabel = fmtLabel(startsAt);

    const ics = buildInterviewIcs({
      interviewId: payload.interviewId,
      startsAtUtc: startsAt,
      durationMin: iv.durationMin,
      jobTitle: iv.jobTitle ?? "",
      companyName: iv.orgName,
      proposerName: employerName ?? "Energized",
      proposerEmail: employerEmail ?? env.EMAIL_FROM.replace(/.*<|>.*/g, ""),
      candidateName: iv.candidateName ?? "Candidate",
      candidateEmail: iv.candidateEmail,
      notes: iv.notes ?? undefined,
      details: iv.details,
    });

    const icsAttachment = {
      filename: `interview-${payload.interviewId.slice(0, 8)}.ics`,
      content: Buffer.from(ics, "utf8").toString("base64"),
    };

    const candidateDetailUrl = `${env.NEXT_PUBLIC_APP_URL}/applications/${iv.applicationId}`;
    const employerDetailUrl = `${env.NEXT_PUBLIC_APP_URL}/employer/jobs/${iv.jobId}/applicants?focus=${iv.applicationId}`;

    let sent = 0;

    const candidateResult = await resend.emails.send({
      from: env.EMAIL_FROM,
      to: iv.candidateEmail,
      subject: `Interview confirmed — ${startsAtLabel}`,
      react: InterviewConfirmedEmail({
        recipientName: iv.candidateName ?? null,
        companyName: iv.orgName,
        jobTitle: iv.jobTitle ?? "",
        startsAtLabel,
        durationMin: iv.durationMin,
        medium: iv.medium,
        details: iv.details,
        detailUrl: candidateDetailUrl,
        appUrl: env.NEXT_PUBLIC_APP_URL,
      }),
      attachments: [icsAttachment],
    });
    if (candidateResult.error) {
      logger.warn("send-interview-confirmed: candidate send failed", {
        reason: String(candidateResult.error),
      });
    } else sent++;

    if (employerEmail) {
      const employerResult = await resend.emails.send({
        from: env.EMAIL_FROM,
        to: employerEmail,
        subject: `Interview confirmed — ${iv.candidateName ?? "candidate"} for ${iv.jobTitle}`,
        react: InterviewConfirmedEmail({
          recipientName: employerName ?? null,
          companyName: iv.orgName,
          jobTitle: iv.jobTitle ?? "",
          startsAtLabel,
          durationMin: iv.durationMin,
          medium: iv.medium,
          details: iv.details,
          detailUrl: employerDetailUrl,
          appUrl: env.NEXT_PUBLIC_APP_URL,
        }),
        attachments: [icsAttachment],
      });
      if (employerResult.error) {
        logger.warn("send-interview-confirmed: employer send failed", {
          reason: String(employerResult.error),
        });
      } else sent++;
    }

    return { sent };
  },
});
