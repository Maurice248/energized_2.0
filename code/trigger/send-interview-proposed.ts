import { logger, task } from "@trigger.dev/sdk/v3";
import { eq, asc } from "drizzle-orm";
import { db } from "@/server/db";
import {
  applications,
  employerOrgs,
  interviews,
  interviewSlots,
  jobListings,
  user,
} from "@/server/db/schema";
import { resend } from "@/lib/resend";
import { env } from "@/env";
import InterviewProposedEmail from "@/emails/interview-proposed";

type Payload = {
  interviewId: string;
  wasRescheduled?: boolean;
};

function fmtSlotLabel(d: Date): string {
  // server-side fallback formatting; clients render in their own TZ
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

export const sendInterviewProposedTask = task({
  id: "send-interview-proposed",
  maxDuration: 60,
  run: async (payload: Payload) => {
    const [row] = await db
      .select({
        candidateUserId: applications.candidateId,
        candidateName: user.name,
        candidateEmail: user.email,
        jobTitle: jobListings.title,
        orgName: employerOrgs.name,
        proposerName: interviews.proposedById, // resolved below if set
        notes: interviews.notes,
        durationMin: interviews.durationMin,
        expiresAt: interviews.expiresAt,
        applicationId: interviews.applicationId,
      })
      .from(interviews)
      .innerJoin(applications, eq(applications.id, interviews.applicationId))
      .innerJoin(user, eq(user.id, applications.candidateId))
      .innerJoin(jobListings, eq(jobListings.id, applications.jobId))
      .innerJoin(employerOrgs, eq(employerOrgs.id, jobListings.orgId))
      .where(eq(interviews.id, payload.interviewId))
      .limit(1);

    if (!row) {
      logger.warn("send-interview-proposed: interview not found", payload);
      return { sent: 0 };
    }

    const slots = await db
      .select({ startsAt: interviewSlots.startsAt })
      .from(interviewSlots)
      .where(eq(interviewSlots.interviewId, payload.interviewId))
      .orderBy(asc(interviewSlots.startsAt));

    const proposerName = row.proposerName
      ? (
          await db
            .select({ name: user.name })
            .from(user)
            .where(eq(user.id, row.proposerName))
            .limit(1)
        )[0]?.name ?? "Your interviewer"
      : "Your interviewer";

    const expiresAtLabel = new Date(row.expiresAt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    const result = await resend.emails.send({
      from: env.EMAIL_FROM,
      to: row.candidateEmail,
      subject: payload.wasRescheduled
        ? `${row.orgName} rescheduled your interview — ${row.jobTitle ?? "your role"}`
        : `Pick a time for your interview at ${row.orgName}`,
      react: InterviewProposedEmail({
        candidateName: row.candidateName ?? null,
        companyName: row.orgName,
        jobTitle: row.jobTitle ?? "",
        proposerName,
        notes: row.notes ?? null,
        slots: slots.map((s) => ({
          startsAt: s.startsAt,
          label: fmtSlotLabel(new Date(s.startsAt)),
        })),
        durationMin: row.durationMin,
        applicationUrl: `${env.NEXT_PUBLIC_APP_URL}/applications/${row.applicationId}`,
        expiresAtLabel,
        wasRescheduled: payload.wasRescheduled ?? false,
      }),
    });

    if (result.error) {
      logger.warn("send-interview-proposed: resend error", {
        interviewId: payload.interviewId,
        reason: String(result.error),
      });
      return { sent: 0 };
    }
    return { sent: 1 };
  },
});
