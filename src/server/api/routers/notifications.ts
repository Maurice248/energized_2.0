import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure, router } from "@/server/api/trpc";
import { notifications } from "@/server/db/schema/notifications";

export const notificationsRouter = router({
  list: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(50).default(20),
          unreadOnly: z.boolean().default(false),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const conditions = [
        eq(notifications.userId, ctx.session.user.id),
        input?.unreadOnly ? isNull(notifications.readAt) : undefined,
      ].filter(Boolean) as ReturnType<typeof eq>[];

      return ctx.db
        .select()
        .from(notifications)
        .where(and(...conditions))
        .orderBy(desc(notifications.createdAt))
        .limit(input?.limit ?? 20);
    }),

  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    const [row] = await ctx.db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, ctx.session.user.id),
          isNull(notifications.readAt),
        ),
      );
    return row?.count ?? 0;
  }),

  markRead: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(notifications)
        .set({ readAt: new Date() })
        .where(
          and(
            eq(notifications.id, input.id),
            eq(notifications.userId, ctx.session.user.id),
          ),
        );
      return { ok: true };
    }),

  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notifications.userId, ctx.session.user.id),
          isNull(notifications.readAt),
        ),
      );
    return { ok: true };
  }),
});
