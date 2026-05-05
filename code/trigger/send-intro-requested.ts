import { logger, task } from "@trigger.dev/sdk/v3";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import {
  employerOrgs,
  introRequests,
  user,
} from "@/server/db/schema";
import { resend } from "@/lib/resend";
import { env } from "@/env";
import IntroRequestedEmail from "@/emails/intro-requested";

type Payload = {
  introRequestId: string;
};

export const sendIntroRequestedTask = task({
  id: "send-intro-requested",
  maxDuration: 60,
  run: async (payload: Payload) => {
    const [row] = await db
      .select({
        message: introRequests.message,
        candidateName: user.name,
        candidateEmail: user.email,
        orgName: employerOrgs.name,
        requesterUserId: introRequests.requestedByUserId,
      })
      .from(introRequests)
      .innerJoin(user, eq(user.id, introRequests.candidateUserId))
      .innerJoin(employerOrgs, eq(employerOrgs.id, introRequests.orgId))
      .where(eq(introRequests.id, payload.introRequestId))
      .limit(1);

    if (!row) {
      logger.warn("send-intro-requested: row not found", payload);
      return { sent: 0 };
    }

    const requesterName = row.requesterUserId
      ? (
          await db
            .select({ name: user.name })
            .from(user)
            .where(eq(user.id, row.requesterUserId))
            .limit(1)
        )[0]?.name ?? "A team member"
      : "A team member";

    const result = await resend.emails.send({
      from: env.EMAIL_FROM,
      to: row.candidateEmail,
      subject: `${row.orgName} would like an intro on Energized`,
      react: IntroRequestedEmail({
        candidateName: row.candidateName ?? null,
        orgName: row.orgName,
        requesterName,
        message: row.message ?? null,
        appUrl: `${env.NEXT_PUBLIC_APP_URL}/dashboard#intros`,
      }),
    });

    if (result.error) {
      logger.warn("send-intro-requested: resend error", {
        introRequestId: payload.introRequestId,
        reason: String(result.error),
      });
      return { sent: 0 };
    }
    return { sent: 1 };
  },
});
