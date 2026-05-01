import { and, desc, eq, gte, ilike, or, sql } from "drizzle-orm";
import { z } from "zod";
import { router, employerProcedure } from "@/server/api/trpc";
import { profiles } from "@/server/db/schema/profiles";
import { user } from "@/server/db/schema/auth";

const listInput = z.object({
  q: z.string().trim().max(120).optional(),
  sector: z
    .enum([
      "oil_gas",
      "renewables",
      "nuclear",
      "utilities",
      "hydrogen",
      "power",
      "other",
    ])
    .optional(),
  setup: z.enum(["on_site", "hybrid", "remote", "flexible"]).optional(),
  minYears: z.number().int().min(0).max(60).optional(),
  openToWork: z.boolean().default(true),
  page: z.number().int().min(1).max(500).default(1),
});

const PAGE_SIZE = 24;

export const candidatesRouter = router({
  list: employerProcedure.input(listInput).query(async ({ ctx, input }) => {
    const conditions = [
      input.openToWork ? eq(profiles.openToWork, true) : undefined,
      input.sector
        ? sql`${profiles.sectors} && ARRAY[${input.sector}]::energy_sector[]`
        : undefined,
      input.setup ? eq(profiles.remotePreference, input.setup) : undefined,
      input.minYears != null
        ? gte(profiles.yearsExperience, input.minYears)
        : undefined,
      input.q
        ? or(
            ilike(user.name, `%${input.q}%`),
            ilike(profiles.headline, `%${input.q}%`),
            ilike(profiles.summary, `%${input.q}%`),
            ilike(profiles.location, `%${input.q}%`),
          )
        : undefined,
    ].filter(Boolean) as ReturnType<typeof eq>[];

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const offset = (input.page - 1) * PAGE_SIZE;

    const rows = await ctx.db
      .select({
        id: user.id,
        name: user.name,
        image: user.image,
        headline: profiles.headline,
        location: profiles.location,
        sectors: profiles.sectors,
        yearsExperience: profiles.yearsExperience,
        remotePreference: profiles.remotePreference,
        availability: profiles.availability,
        openToWork: profiles.openToWork,
        skills: profiles.skills,
        updatedAt: profiles.updatedAt,
      })
      .from(profiles)
      .innerJoin(user, eq(user.id, profiles.userId))
      .where(where)
      .orderBy(desc(profiles.updatedAt))
      .limit(PAGE_SIZE)
      .offset(offset);

    const [{ count }] = await ctx.db
      .select({ count: sql<number>`count(*)::int` })
      .from(profiles)
      .innerJoin(user, eq(user.id, profiles.userId))
      .where(where);

    return {
      candidates: rows,
      total: count,
      page: input.page,
      pageSize: PAGE_SIZE,
      totalPages: Math.max(1, Math.ceil(count / PAGE_SIZE)),
    };
  }),
});
