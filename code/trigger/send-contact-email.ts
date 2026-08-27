import { logger, task } from "@trigger.dev/sdk/v3";
import { resend } from "@/lib/resend";
import { env } from "@/env";
import { db } from "@/server/db";
import { platformSettings } from "@/server/db/schema";
import ContactMessageEmail from "@/emails/contact-message";
import { PUBLIC_CONTACT_EMAIL } from "@/lib/public-contact-email";

type Payload = {
  name: string;
  email: string;
  message: string;
};

const FALLBACK_INBOX = PUBLIC_CONTACT_EMAIL;

export const sendContactEmailTask = task({
  id: "send-contact-email",
  maxDuration: 60,
  run: async (payload: Payload) => {
    let to = FALLBACK_INBOX;
    try {
      const [row] = await db
        .select({ email: platformSettings.siteEmail })
        .from(platformSettings)
        .limit(1);
      const site = row?.email?.trim();
      if (site) to = site;
    } catch (err) {
      logger.warn("send-contact-email: could not load siteEmail, using fallback", {
        reason: String(err),
      });
    }

    const result = await resend.emails.send({
      from: env.EMAIL_FROM,
      to,
      replyTo: payload.email,
      subject: `Contact form — ${payload.name}`,
      react: ContactMessageEmail(payload),
    });

    if (result.error) {
      logger.warn("send-contact-email: resend error", {
        reason: String(result.error),
      });
      throw new Error(`Resend: ${result.error.message}`);
    }

    return { sent: 1 };
  },
});
