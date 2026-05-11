import { TRPCError } from "@trpc/server";
import { and, asc, count, desc, eq, inArray, isNotNull, isNull, ne, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { jobseekerProcedure, protectedProcedure, publicProcedure, router } from "@/server/api/trpc";
import {
  skillBadges,
  skillTestAttempts,
  testTopics,
  user,
  type SkillTestQuestion,
} from "@/server/db/schema";
import { generateSkillTest, narrateSkillResult } from "@/lib/ai";
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

      // 6. Insert the attempt.
      //
      // Free-tier TOCTOU guard: two concurrent tabs can both pass the count
      // check above (both read count=0) and both reach this point. To prevent
      // double-insertion we use a conditional INSERT for free users: the SELECT
      // inside the CTE re-verifies "no completed attempt exists" atomically at
      // write time. If a concurrent row was already committed, the INSERT
      // produces 0 rows and we throw FORBIDDEN rather than leaking a second
      // free attempt. Paid users skip this check (they have unlimited attempts).
      let attemptId: string;

      if (isPaid) {
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
        attemptId = created.id;
      } else {
        // Conditional insert: only proceeds if no completed attempt exists for
        // this candidate, preventing the TOCTOU double-insert race on free tier.
        const result = await ctx.db.execute<{ id: string }>(
          sql`
            INSERT INTO skill_test_attempts
              (id, candidate_id, topic_id, status, level, question_count,
               include_scenarios, include_calc, questions_json, generation_model)
            SELECT
              gen_random_uuid(),
              ${ctx.session.user.id},
              ${t.id}::uuid,
              'in_progress',
              ${input.level},
              ${input.questionCount},
              ${input.includeScenarios},
              ${input.includeCalc},
              ${JSON.stringify(questionsWithIds)}::jsonb,
              ${generated.model ?? null}
            WHERE NOT EXISTS (
              SELECT 1 FROM skill_test_attempts
              WHERE candidate_id = ${ctx.session.user.id}
                AND status != 'in_progress'
            )
            RETURNING id
          `,
        );
        if (result.rows.length === 0) {
          throw new TRPCError({ code: "FORBIDDEN", message: "paywall:skill_tests" });
        }
        attemptId = result.rows[0].id;
      }

      return { attemptId };
    }),

  getAttempt: protectedProcedure
    .input(z.object({ attemptId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select()
        .from(skillTestAttempts)
        .where(eq(skillTestAttempts.id, input.attemptId))
        .limit(1);
      const attempt = rows[0];
      if (!attempt) throw new TRPCError({ code: "NOT_FOUND" });
      if (attempt.candidateId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // Forfeit stale in_progress attempts on read
      if (attempt.status === "in_progress" && attempt.startedAt) {
        const minutesElapsed = (Date.now() - attempt.startedAt.getTime()) / 60000;
        if (minutesElapsed > 25) {
          await ctx.db
            .update(skillTestAttempts)
            .set({ status: "forfeited", finishedAt: new Date() })
            .where(eq(skillTestAttempts.id, attempt.id));
          return { ...attempt, status: "forfeited" as const };
        }
      }

      // Strip correctIdx from questions so we don't leak the answer key
      const safeQuestions = attempt.questionsJson.map((q) => ({
        id: q.id,
        prompt: q.prompt,
        context: q.context,
        options: q.options,
        tags: q.tags,
        tagKind: q.tagKind,
      }));

      return { ...attempt, questionsJson: safeQuestions };
    }),

  saveAnswer: protectedProcedure
    .input(
      z.object({
        attemptId: z.string().uuid(),
        questionId: z.string().uuid(),
        selectedIdx: z.number().int().min(0).max(3),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Atomic JSONB merge — answers_json || {questionId: selectedIdx}.
      // This replaces a read-modify-write pattern that lost concurrent
      // saves: two parallel mutations could each read the same baseline
      // and the later write would overwrite the earlier one. The merge
      // happens entirely inside Postgres, so concurrent saves to
      // different keys both land.
      const result = await ctx.db
        .update(skillTestAttempts)
        .set({
          answersJson: sql`COALESCE(${skillTestAttempts.answersJson}, '{}'::jsonb) || jsonb_build_object(${input.questionId}, to_jsonb(${input.selectedIdx}::int))`,
        })
        .where(
          and(
            eq(skillTestAttempts.id, input.attemptId),
            eq(skillTestAttempts.candidateId, ctx.session.user.id),
            eq(skillTestAttempts.status, "in_progress"),
          ),
        )
        .returning({ id: skillTestAttempts.id });

      if (result.length === 0) {
        // Either: attempt doesn't exist, isn't owned by the user, or
        // status moved off `in_progress` (submitted / forfeited). All
        // three are "this answer can't be saved right now."
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Attempt not available for answer save.",
        });
      }

      return { ok: true };
    }),

  submitAttempt: protectedProcedure
    .input(z.object({ attemptId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select()
        .from(skillTestAttempts)
        .where(eq(skillTestAttempts.id, input.attemptId))
        .limit(1);
      const a = rows[0];
      if (!a) throw new TRPCError({ code: "NOT_FOUND" });
      if (a.candidateId !== ctx.session.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      if (a.status !== "in_progress") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Attempt already finished." });
      }

      const answers = a.answersJson ?? {};
      let correct = 0;
      const cats = new Map<string, { right: number; total: number }>();
      for (const q of a.questionsJson) {
        const cat = q.tags[0] ?? "General";
        const entry = cats.get(cat) ?? { right: 0, total: 0 };
        entry.total += 1;
        if (answers[q.id] === q.correctIdx) {
          correct += 1;
          entry.right += 1;
        }
        cats.set(cat, entry);
      }
      const score = Math.round((correct / a.questionsJson.length) * 100);
      const passed = score >= 70;
      const topVerified = score >= 80;
      const status: "passed" | "passed_top" | "failed" = topVerified
        ? "passed_top"
        : passed
          ? "passed"
          : "failed";

      const breakdown = Array.from(cats.entries()).map(([cat, v]) => ({
        cat,
        right: v.right,
        total: v.total,
        pct: Math.round((v.right / v.total) * 100),
      }));

      const topic = await ctx.db
        .select({ name: testTopics.name })
        .from(testTopics)
        .where(eq(testTopics.id, a.topicId))
        .limit(1);
      let narrative = "";
      try {
        narrative = await narrateSkillResult({
          topicName: topic[0]?.name ?? "this topic",
          score,
          passed,
          topVerified,
          breakdown,
        });
      } catch {
        narrative = passed
          ? "You passed. Review the breakdown to see where to push next."
          : "Almost there. Use the breakdown to focus your prep before retaking.";
      }

      await ctx.db
        .update(skillTestAttempts)
        .set({
          status,
          score,
          correctCount: correct,
          categoryBreakdown: breakdown,
          aiFeedback: narrative,
          finishedAt: new Date(),
        })
        .where(eq(skillTestAttempts.id, a.id));

      if (passed) {
        await ctx.db
          .insert(skillBadges)
          .values({
            candidateId: a.candidateId,
            topicId: a.topicId,
            attemptId: a.id,
            isVerifiedTop: topVerified,
            score,
          })
          .onConflictDoUpdate({
            target: [skillBadges.candidateId, skillBadges.topicId],
            set: {
              attemptId: a.id,
              isVerifiedTop: topVerified,
              score,
              earnedAt: new Date(),
            },
          });
      }

      return { ok: true, score, status, breakdown, narrative };
    }),

  // ---------------------------------------------------------------------------
  // Badge reads
  // ---------------------------------------------------------------------------

  // Returns currently-active cooldowns for the signed-in user.
  // Used to grey out role pills and pick a sensible default in the
  // configure form. 30-day window for passes, 7-day for fails.
  myActiveCooldowns: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({
        slug: testTopics.slug,
        status: skillTestAttempts.status,
        finishedAt: skillTestAttempts.finishedAt,
      })
      .from(skillTestAttempts)
      .innerJoin(testTopics, eq(skillTestAttempts.topicId, testTopics.id))
      .where(
        and(
          eq(skillTestAttempts.candidateId, ctx.session.user.id),
          ne(skillTestAttempts.status, "in_progress"),
          ne(skillTestAttempts.status, "forfeited"),
        ),
      );
    const now = Date.now();
    return rows.flatMap((r) => {
      if (!r.finishedAt) return [];
      const window = r.status === "failed" ? 7 : 30;
      const daysSince = (now - r.finishedAt.getTime()) / (1000 * 60 * 60 * 24);
      const daysLeft = Math.ceil(window - daysSince);
      if (daysLeft <= 0) return [];
      return [{ slug: r.slug, status: r.status, daysLeft }];
    });
  }),

  // Full attempt history for the signed-in user, newest first.
  // Used by the /skills/my-tests history page and the catalog
  // "Recent attempts" strip.
  myAttempts: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({
        attemptId: skillTestAttempts.id,
        status: skillTestAttempts.status,
        score: skillTestAttempts.score,
        correctCount: skillTestAttempts.correctCount,
        questionCount: skillTestAttempts.questionCount,
        startedAt: skillTestAttempts.startedAt,
        finishedAt: skillTestAttempts.finishedAt,
        slug: testTopics.slug,
        name: testTopics.name,
        monogram: testTopics.monogram,
        tileColor: testTopics.tileColor,
      })
      .from(skillTestAttempts)
      .innerJoin(testTopics, eq(skillTestAttempts.topicId, testTopics.id))
      .where(eq(skillTestAttempts.candidateId, ctx.session.user.id))
      .orderBy(desc(skillTestAttempts.startedAt))
      .limit(50);
  }),

  myBadges: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({
        topicId: skillBadges.topicId,
        score: skillBadges.score,
        isVerifiedTop: skillBadges.isVerifiedTop,
        earnedAt: skillBadges.earnedAt,
        slug: testTopics.slug,
        name: testTopics.name,
        monogram: testTopics.monogram,
        tileColor: testTopics.tileColor,
        jobSectorMatch: testTopics.jobSectorMatch,
      })
      .from(skillBadges)
      .innerJoin(testTopics, eq(skillBadges.topicId, testTopics.id))
      .where(eq(skillBadges.candidateId, ctx.session.user.id))
      .orderBy(desc(skillBadges.earnedAt));
  }),

  // Public so anonymous viewers of /p/[id] can see badges as part of the
  // candidate's public profile (badges are not PII — they're effectively a
  // public credential the candidate earned).
  badgesForCandidate: publicProcedure
    .input(z.object({ candidateId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select({
          topicId: skillBadges.topicId,
          score: skillBadges.score,
          isVerifiedTop: skillBadges.isVerifiedTop,
          earnedAt: skillBadges.earnedAt,
          slug: testTopics.slug,
          name: testTopics.name,
          monogram: testTopics.monogram,
          tileColor: testTopics.tileColor,
          jobSectorMatch: testTopics.jobSectorMatch,
        })
        .from(skillBadges)
        .innerJoin(testTopics, eq(skillBadges.topicId, testTopics.id))
        .where(eq(skillBadges.candidateId, input.candidateId))
        .orderBy(desc(skillBadges.earnedAt));
    }),

  searchByBadge: protectedProcedure
    .input(z.object({ topicSlugs: z.array(z.string()).min(1) }))
    .query(async ({ ctx, input }) => {
      const matched = await ctx.db
        .select({ candidateId: skillBadges.candidateId })
        .from(skillBadges)
        .innerJoin(testTopics, eq(skillBadges.topicId, testTopics.id))
        .where(inArray(testTopics.slug, input.topicSlugs))
        .groupBy(skillBadges.candidateId);
      return matched.map((m) => m.candidateId);
    }),
});
