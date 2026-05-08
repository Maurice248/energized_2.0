import { TRPCError } from "@trpc/server";
import { and, asc, eq, isNotNull, isNull } from "drizzle-orm";
import { z } from "zod";
import { publicProcedure, router } from "@/server/api/trpc";
import { testTopics } from "@/server/db/schema";

export const skillTestsRouter = router({
  // ---------------------------------------------------------------------------
  // Catalog reads
  // ---------------------------------------------------------------------------

  listTopics: publicProcedure.query(async ({ ctx }) => {
    const sectors = await ctx.db
      .select()
      .from(testTopics)
      .where(and(isNull(testTopics.parentTopicId), eq(testTopics.isActive, true)))
      .orderBy(asc(testTopics.sortOrder));

    const roles = await ctx.db
      .select()
      .from(testTopics)
      .where(and(isNotNull(testTopics.parentTopicId), eq(testTopics.isActive, true)))
      .orderBy(asc(testTopics.sortOrder));

    const rolesBySector = new Map<string, typeof roles>();
    for (const r of roles) {
      if (!r.parentTopicId) continue;
      const arr = rolesBySector.get(r.parentTopicId) ?? [];
      arr.push(r);
      rolesBySector.set(r.parentTopicId, arr);
    }

    return sectors.map((s) => ({
      ...s,
      roles: rolesBySector.get(s.id) ?? [],
    }));
  }),

  getTopic: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const topic = await ctx.db
        .select()
        .from(testTopics)
        .where(eq(testTopics.slug, input.slug))
        .limit(1);
      if (!topic[0]) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Topic not found." });
      }
      const t = topic[0];

      let sector = t;
      if (t.parentTopicId) {
        const parent = await ctx.db
          .select()
          .from(testTopics)
          .where(eq(testTopics.id, t.parentTopicId))
          .limit(1);
        if (parent[0]) sector = parent[0];
      }
      const roles = await ctx.db
        .select()
        .from(testTopics)
        .where(
          and(
            eq(testTopics.parentTopicId, sector.id),
            eq(testTopics.isActive, true),
          ),
        )
        .orderBy(asc(testTopics.sortOrder));

      return { sector, currentRole: t.parentTopicId ? t : null, roles };
    }),
});
