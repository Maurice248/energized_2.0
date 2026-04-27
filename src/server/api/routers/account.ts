import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "@/server/api/trpc";
import { user } from "@/server/db/schema";

export const accountRouter = router({
  me: protectedProcedure.query(({ ctx }) => {
    return {
      id: ctx.session.user.id,
      email: ctx.session.user.email,
      name: ctx.session.user.name,
      role: ctx.session.user.role,
    };
  }),

  deleteMe: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const [deleted] = await ctx.db
      .delete(user)
      .where(eq(user.id, userId))
      .returning({ id: user.id });

    if (!deleted) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Account not found." });
    }
    return { ok: true };
  }),
});
