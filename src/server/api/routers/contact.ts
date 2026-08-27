import { z } from "zod";
import { sql } from "drizzle-orm";
import { tasks } from "@trigger.dev/sdk/v3";
import { publicProcedure, router } from "@/server/api/trpc";
import { safeCapture } from "@/lib/posthog";
import { EVENT_CONTACT_SUBMITTED } from "@/lib/analytics-events";
import { supportTickets, user } from "@/server/db/schema";
import type { DB } from "@/server/db";
import type { sendContactEmailTask } from "../../../../code/trigger/send-contact-email";

export const contactSubmitSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254),
  message: z.string().trim().min(1).max(4000),
  website: z.string().max(200).optional(),
});

function newSupportTicketCode(): string {
  return `CS-${crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

async function findUserIdByEmail(db: DB, email: string): Promise<string | null> {
  const normalized = email.toLowerCase();
  const [row] = await db
    .select({ id: user.id })
    .from(user)
    .where(sql`lower(${user.email}) = ${normalized}`)
    .limit(1);
  return row?.id ?? null;
}

export const contactRouter = router({
  submit: publicProcedure
    .input(contactSubmitSchema)
    .mutation(async ({ ctx, input }) => {
      if (input.website && input.website.trim().length > 0) {
        return { ok: true as const };
      }

      const requesterUserId =
        ctx.session?.user.id ?? (await findUserIdByEmail(ctx.db, input.email));

      await ctx.db.insert(supportTickets).values({
        code: newSupportTicketCode(),
        subject: `Contact from ${input.name}`,
        body: `From: ${input.name} <${input.email}>\n\n${input.message}`,
        priority: "p2",
        status: "open",
        requesterUserId,
      });

      try {
        await tasks.trigger<typeof sendContactEmailTask>("send-contact-email", {
          name: input.name,
          email: input.email,
          message: input.message,
        });
      } catch (err) {
        console.error({
          event: "contact.email_queue_failed",
          reason: err instanceof Error ? err.message : String(err),
        });
      }

      await safeCapture({
        distinctId: ctx.session?.user.id ?? input.email,
        event: EVENT_CONTACT_SUBMITTED,
      });

      return { ok: true as const };
    }),
});
