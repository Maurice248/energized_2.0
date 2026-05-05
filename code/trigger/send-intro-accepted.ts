import { logger, task } from "@trigger.dev/sdk/v3";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import {
  introRequests,
  orgMembers,
  user,
} from "@/server/db/schema";
import { resend } from "@/lib/resend";
import { env } from "@/env";
import IntroAcceptedEmail from "@/emails/intro-accepted";

type Payload = {
  introRequestId: string;
};

export const sendIntroAcceptedTask = task({
  id: "send-intro-accepted",
  maxDuration: 60,
  run: async (payload: Payload) => {
    const [row] = await db
      .select({
        candidateName: user.name,
        requesterUserId: introRequests.requestedByUserId,
        orgId: introRequests.orgId,
      })
      .from(introRequests)
      .innerJoin(user, eq(user.id, introRequests.candidateUserId))
      .where(eq(introRequests.id, payload.introRequestId))
      .limit(1);

    if (!row) {
      logger.warn("send-intro-accepted: row not found", payload);
      return { sent: 0 };
    }

    let recipient: { id: string; name: string | null; email: string } | null = null;
    if (row.requesterUserId) {
      const [r] = await db
        .select({ id: user.id, name: user.name, email: user.email })
        .from(user)
        .where(eq(user.id, row.requesterUserId))
        .limit(1);
      recipient = r ?? null;
    }
    if (!recipient) {
      const [owner] = await db
        .select({ id: user.id, name: user.name, email: user.email })
        .from(orgMembers)
        .innerJoin(user, eq(user.id, orgMembers.userId))
        .where(
          and(
            eq(orgMembers.orgId, row.orgId),
            eq(orgMembers.role, "owner"),
            eq(orgMembers.status, "active"),
          ),
        )
        .limit(1);
      recipient = owner ?? null;
    }

    if (!recipient) {
      logger.warn("send-intro-accepted: no recipient resolvable", payload);
      return { sent: 0 };
    }

    const result = await resend.emails.send({
      from: env.EMAIL_FROM,
      to: recipient.email,
      subject: `${row.candidateName ?? "A candidate"} accepted your intro request — contact unlocked`,
      react: IntroAcceptedEmail({
        recipientName: recipient.name ?? null,
        candidateName: row.candidateName ?? "A candidate",
        appUrl: `${env.NEXT_PUBLIC_APP_URL}/employer/intro-requests?focus=${payload.introRequestId}`,
      }),
    });

    if (result.error) {
      logger.warn("send-intro-accepted: resend error", {
        introRequestId: payload.introRequestId,
        reason: String(result.error),
      });
      return { sent: 0 };
    }
    return { sent: 1 };
  },
});
