import { logger, task } from "@trigger.dev/sdk/v3";
import { resend } from "@/lib/resend";
import { env } from "@/env";
import ContactMessageEmail from "@/emails/contact-message";

type Payload = {
  name: string;
  email: string;
  message: string;
};

function inboxAddress(from: string): string {
  const angled = from.match(/<([^>]+)>/);
  return (angled?.[1] ?? from).trim();
}

export const sendContactEmailTask = task({
  id: "send-contact-email",
  maxDuration: 60,
  run: async (payload: Payload) => {
    const to = inboxAddress(env.EMAIL_FROM);
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
