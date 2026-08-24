import { z } from "zod";
import { tasks } from "@trigger.dev/sdk/v3";
import { publicProcedure, router } from "@/server/api/trpc";
import { safeCapture } from "@/lib/posthog";
import { EVENT_CONTACT_SUBMITTED } from "@/lib/analytics-events";
import type { sendContactEmailTask } from "../../../../code/trigger/send-contact-email";

export const contactSubmitSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254),
  message: z.string().trim().min(1).max(4000),
  website: z.string().max(200).optional(),
});

export const contactRouter = router({
  submit: publicProcedure
    .input(contactSubmitSchema)
    .mutation(async ({ ctx, input }) => {
      if (input.website && input.website.trim().length > 0) {
        return { ok: true as const };
      }

      await tasks.trigger<typeof sendContactEmailTask>("send-contact-email", {
        name: input.name,
        email: input.email,
        message: input.message,
      });

      await safeCapture({
        distinctId: ctx.session?.user.id ?? input.email,
        event: EVENT_CONTACT_SUBMITTED,
      });

      return { ok: true as const };
    }),
});
