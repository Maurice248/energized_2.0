import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { z } from "zod";
import { publicProcedure, router } from "@/server/api/trpc";
import {
  trainingLessons,
  trainingModules,
  trainings,
} from "@/server/db/schema";

const SORT_VALUES = ["popular", "rating", "shortest", "newest"] as const;

export const trainingsRouter = router({
  // ---------------------------------------------------------------------------
  // Catalog reads
  // ---------------------------------------------------------------------------

  list: publicProcedure
    .input(
      z.object({
        sectors: z.array(z.string()).optional(),
        durationIds: z.array(z.string()).optional(),
        certNames: z.array(z.string()).optional(),
        query: z.string().optional(),
        sort: z.enum(SORT_VALUES).default("popular"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(trainings.isActive, true)];

      if (input.sectors && input.sectors.length > 0) {
        const validSectors = input.sectors.filter((s) =>
          ["safety", "tech", "prof", "soft", "trans"].includes(s),
        ) as Array<"safety" | "tech" | "prof" | "soft" | "trans">;
        if (validSectors.length > 0) {
          conditions.push(inArray(trainings.sector, validSectors));
        }
      }

      if (input.durationIds && input.durationIds.length > 0) {
        const ranges: Array<[number, number]> = [];
        if (input.durationIds.includes("short")) ranges.push([0, 3]);
        if (input.durationIds.includes("half")) ranges.push([4, 8]);
        if (input.durationIds.includes("day")) ranges.push([8, 16]);
        if (input.durationIds.includes("week")) ranges.push([16, 80]);
        if (input.durationIds.includes("long")) ranges.push([80, 9999]);
        if (ranges.length > 0) {
          const rangeConds = ranges.map(
            ([lo, hi]) =>
              sql`${trainings.hours} >= ${lo} AND ${trainings.hours} <= ${hi}`,
          );
          const combined = or(...rangeConds);
          if (combined) conditions.push(combined);
        }
      }

      if (input.certNames && input.certNames.length > 0) {
        conditions.push(inArray(trainings.certName, input.certNames));
      }

      if (input.query && input.query.trim()) {
        const needle = `%${input.query.trim()}%`;
        const queryClause = or(
          ilike(trainings.title, needle),
          ilike(trainings.shortBlurb, needle),
          ilike(trainings.certName, needle),
          ilike(trainings.instructorName, needle),
        );
        if (queryClause) conditions.push(queryClause);
      }

      const orderBy =
        input.sort === "shortest"
          ? asc(trainings.hours)
          : input.sort === "newest"
            ? desc(trainings.isNew)
            : asc(trainings.sortOrder);

      return ctx.db
        .select()
        .from(trainings)
        .where(and(...conditions))
        .orderBy(orderBy);
    }),

  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const trainingRows = await ctx.db
        .select()
        .from(trainings)
        .where(eq(trainings.slug, input.slug))
        .limit(1);
      const t = trainingRows[0];
      if (!t) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Training not found." });
      }

      const modules = await ctx.db
        .select()
        .from(trainingModules)
        .where(eq(trainingModules.trainingId, t.id))
        .orderBy(asc(trainingModules.sortOrder));

      const lessons =
        modules.length > 0
          ? await ctx.db
              .select()
              .from(trainingLessons)
              .where(
                inArray(
                  trainingLessons.moduleId,
                  modules.map((m) => m.id),
                ),
              )
              .orderBy(asc(trainingLessons.sortOrder))
          : [];

      // Strip quiz answer keys from public payload
      const safeLessons = lessons.map((l) => ({
        ...l,
        quizQuestionsJson: l.quizQuestionsJson
          ? l.quizQuestionsJson.map((q) => ({
              id: q.id,
              prompt: q.prompt,
              options: q.options,
            }))
          : null,
      }));

      return {
        training: t,
        modules: modules.map((m) => ({
          ...m,
          lessons: safeLessons.filter((l) => l.moduleId === m.id),
        })),
      };
    }),
});
