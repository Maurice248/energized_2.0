import { and, desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "@/server/api/trpc";
import { savedSearches } from "@/server/db/schema/saved-searches";

const SURFACES = ["jobs", "candidates"] as const;

export const savedSearchesRouter = router({
  list: protectedProcedure
    .input(z.object({ surface: z.enum(SURFACES) }))
    .query(({ ctx, input }) =>
      ctx.db
        .select()
        .from(savedSearches)
        .where(
          and(
            eq(savedSearches.userId, ctx.session.user.id),
            eq(savedSearches.surface, input.surface),
          ),
        )
        .orderBy(desc(savedSearches.createdAt))
        .limit(20),
    ),

  save: protectedProcedure
    .input(
      z.object({
        surface: z.enum(SURFACES),
        name: z.string().trim().min(1).max(60),
        queryString: z.string().max(2000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Employer-side candidate search is gated behind employer role.
      if (
        input.surface === "candidates" &&
        ctx.session.user.role !== "employer"
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only employers can save candidate searches.",
        });
      }
      const [row] = await ctx.db
        .insert(savedSearches)
        .values({
          userId: ctx.session.user.id,
          surface: input.surface,
          name: input.name,
          queryString: input.queryString.replace(/^\?/, ""),
        })
        .returning();
      return row;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(savedSearches)
        .where(
          and(
            eq(savedSearches.id, input.id),
            eq(savedSearches.userId, ctx.session.user.id),
          ),
        );
      return { ok: true };
    }),
});
