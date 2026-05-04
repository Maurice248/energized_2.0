import { logger, schedules } from "@trigger.dev/sdk/v3";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/server/db";
import {
  applications,
  employerOrgs,
  interviews,
  interviewSlots,
  jobListings,
  notifications,
  orgMembers,
  user,
} from "@/server/db/schema";
import { resend } from "@/lib/resend";
import { env } from "@/env";
import InterviewReminderEmail from "@/emails/interview-reminder";

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

export const sendInterviewReminders = schedules.task({
  id: "send-interview-reminders",
  cron: "0 * * * *",
  maxDuration: 600,
  run: async () => {
    const candidates = await db
      .select({
        interviewId: interviews.id,
        applicationId: interviews.applicationId,
        candidateUserId: applications.candidateId,
        candidateName: user.name,
        candidateEmail: user.email,
        jobTitle: jobListings.title,
        jobId: jobListings.id,
        orgId: employerOrgs.id,
        orgName: employerOrgs.name,
        durationMin: interviews.durationMin,
        medium: interviews.medium,
        details: interviews.details,
        startsAt: interviewSlots.startsAt,
      })
      .from(interviews)
      .innerJoin(interviewSlots, eq(interviewSlots.id, interviews.confirmedSlotId))
      .innerJoin(applications, eq(applications.id, interviews.applicationId))
      .innerJoin(user, eq(user.id, applications.candidateId))
      .innerJoin(jobListings, eq(jobListings.id, applications.jobId))
      .innerJoin(employerOrgs, eq(employerOrgs.id, jobListings.orgId))
      .where(
        and(
          eq(interviews.status, "confirmed"),
          isNull(interviews.remindedAt),
          sql`${interviewSlots.startsAt} BETWEEN now() + interval '23 hours' AND now() + interval '25 hours'`,
        ),
      );

    let sent = 0;
    for (const c of candidates) {
      // Idempotency: set remindedAt FIRST so a second cron tick before send completes won't double-fire.
      await db
        .update(interviews)
        .set({ remindedAt: new Date() })
        .where(eq(interviews.id, c.interviewId));

      const startsAt = new Date(c.startsAt);
      const startsAtLabel = fmtLabel(startsAt);
      const candidateDetailUrl = `${env.NEXT_PUBLIC_APP_URL}/applications/${c.applicationId}`;
      const employerDetailUrl = `${env.NEXT_PUBLIC_APP_URL}/employer/jobs/${c.jobId}/applicants?focus=${c.applicationId}`;

      const candidateRes = await resend.emails.send({
        from: env.EMAIL_FROM,
        to: c.candidateEmail,
        subject: `Reminder: interview tomorrow at ${startsAtLabel}`,
        react: InterviewReminderEmail({
          recipientName: c.candidateName ?? null,
          companyName: c.orgName,
          jobTitle: c.jobTitle ?? "",
          startsAtLabel,
          medium: c.medium,
          details: c.details,
          detailUrl: candidateDetailUrl,
        }),
      });
      if (!candidateRes.error) sent++;

      try {
        await db.insert(notifications).values({
          userId: c.candidateUserId,
          kind: "interview_reminder",
          title: "Interview tomorrow",
          body: `${c.jobTitle ?? "Your role"} at ${c.orgName} · ${startsAtLabel}`,
          href: `/applications/${c.applicationId}`,
        });
      } catch (e) {
        logger.warn("reminder cron candidate notif failed", { e: String(e) });
      }

      const [owner] = await db
        .select({ id: user.id, name: user.name, email: user.email })
        .from(orgMembers)
        .innerJoin(user, eq(user.id, orgMembers.userId))
        .where(and(eq(orgMembers.orgId, c.orgId), eq(orgMembers.role, "owner")))
        .limit(1);

      if (owner?.email) {
        const employerRes = await resend.emails.send({
          from: env.EMAIL_FROM,
          to: owner.email,
          subject: `Reminder: interview tomorrow at ${startsAtLabel} — ${c.candidateName ?? "candidate"}`,
          react: InterviewReminderEmail({
            recipientName: owner.name ?? null,
            companyName: c.orgName,
            jobTitle: c.jobTitle ?? "",
            startsAtLabel,
            medium: c.medium,
            details: c.details,
            detailUrl: employerDetailUrl,
          }),
        });
        if (!employerRes.error) sent++;

        try {
          await db.insert(notifications).values({
            userId: owner.id,
            kind: "interview_reminder",
            title: "Interview tomorrow",
            body: `${c.candidateName ?? "Candidate"} for ${c.jobTitle ?? "your role"} · ${startsAtLabel}`,
            href: `/employer/jobs/${c.jobId}/applicants?focus=${c.applicationId}`,
          });
        } catch (e) {
          logger.warn("reminder cron employer notif failed", { e: String(e) });
        }
      }
    }

    return { sent };
  },
});
