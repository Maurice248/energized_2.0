import { TRPCError } from "@trpc/server";
import { and, asc, count, desc, eq, isNotNull, isNull, ne } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { jobseekerProcedure, publicProcedure, router } from "@/server/api/trpc";
import {
  skillTestAttempts,
  testTopics,
  user,
  type SkillTestQuestion,
} from "@/server/db/schema";
import { generateSkillTest } from "@/lib/ai";
import { isEntitledSubscriptionStatus } from "@/lib/billing-tiers";

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

  // ---------------------------------------------------------------------------
  // Attempt lifecycle
  // ---------------------------------------------------------------------------

  startAttempt: jobseekerProcedure
    .input(
      z.object({
        topicSlug: z.string(),
        level: z.enum(["entry", "junior", "mid", "senior"]),
        questionCount: z.union([
          z.literal(10),
          z.literal(15),
          z.literal(20),
          z.literal(25),
          z.literal(30),
        ]),
        includeScenarios: z.boolean(),
        includeCalc: z.boolean(),
        honorPledged: z.literal(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // 1. Resolve topic
      const topic = await ctx.db
        .select()
        .from(testTopics)
        .where(and(eq(testTopics.slug, input.topicSlug), eq(testTopics.isActive, true)))
        .limit(1);
      if (!topic[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Topic not found." });
      const t = topic[0];

      // 2. Reuse existing in-progress attempt if any
      const inProgress = await ctx.db
        .select()
        .from(skillTestAttempts)
        .where(
          and(
            eq(skillTestAttempts.candidateId, ctx.session.user.id),
            eq(skillTestAttempts.status, "in_progress"),
          ),
        )
        .limit(1);
      if (inProgress[0]) return { attemptId: inProgress[0].id };

      // 3. Entitlement: free user gets 1 lifetime attempt
      const [u] = await ctx.db
        .select({ jobseekerSubscriptionStatus: user.jobseekerSubscriptionStatus })
        .from(user)
        .where(eq(user.id, ctx.session.user.id))
        .limit(1);
      const isPaid = isEntitledSubscriptionStatus(u?.jobseekerSubscriptionStatus ?? null);
      if (!isPaid) {
        const [{ n }] = await ctx.db
          .select({ n: count() })
          .from(skillTestAttempts)
          .where(
            and(
              eq(skillTestAttempts.candidateId, ctx.session.user.id),
              ne(skillTestAttempts.status, "in_progress"),
            ),
          );
        if (Number(n) >= 1) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "paywall:skill_tests",
          });
        }
      }

      // 4. Cooldown: prior pass on same topic in last 30 days OR fail in last 7 days
      const lastForTopic = await ctx.db
        .select()
        .from(skillTestAttempts)
        .where(
          and(
            eq(skillTestAttempts.candidateId, ctx.session.user.id),
            eq(skillTestAttempts.topicId, t.id),
            ne(skillTestAttempts.status, "in_progress"),
            ne(skillTestAttempts.status, "forfeited"),
          ),
        )
        .orderBy(desc(skillTestAttempts.finishedAt))
        .limit(1);
      if (lastForTopic[0]?.finishedAt) {
        const last = lastForTopic[0];
        const daysSince =
          (Date.now() - last.finishedAt!.getTime()) / (1000 * 60 * 60 * 24);
        if (
          (last.status === "passed" || last.status === "passed_top") &&
          daysSince < 30
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `cooldown:30d:${Math.ceil(30 - daysSince)}`,
          });
        }
        if (last.status === "failed" && daysSince < 7) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `cooldown:7d:${Math.ceil(7 - daysSince)}`,
          });
        }
      }

      // 5. Generate questions — need topic + role names
      const sectorName = t.parentTopicId
        ? (
            await ctx.db
              .select({ name: testTopics.name })
              .from(testTopics)
              .where(eq(testTopics.id, t.parentTopicId))
              .limit(1)
          )[0]?.name ?? t.name
        : t.name;
      const roleName = t.parentTopicId
        ? t.name
        : (
            await ctx.db
              .select({ name: testTopics.name })
              .from(testTopics)
              .where(eq(testTopics.parentTopicId, t.id))
              .limit(1)
          )[0]?.name ?? t.name;

      const generated = await generateSkillTest({
        topicName: sectorName,
        roleName,
        level: input.level,
        count: input.questionCount,
        includeScenarios: input.includeScenarios,
        includeCalc: input.includeCalc,
      });

      const questionsWithIds: SkillTestQuestion[] = generated.questions.map((q) => ({
        ...q,
        id: randomUUID(),
        options: q.options as [string, string, string, string],
        correctIdx: q.correctIdx as 0 | 1 | 2 | 3,
      }));

      // 6. Insert the attempt
      const [created] = await ctx.db
        .insert(skillTestAttempts)
        .values({
          candidateId: ctx.session.user.id,
          topicId: t.id,
          status: "in_progress",
          level: input.level,
          questionCount: input.questionCount,
          includeScenarios: input.includeScenarios,
          includeCalc: input.includeCalc,
          questionsJson: questionsWithIds,
          generationModel: generated.model,
        })
        .returning({ id: skillTestAttempts.id });

      return { attemptId: created.id };
    }),
});
