import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { z } from "zod";
import {
  jobseekerProcedure,
  protectedProcedure,
  publicProcedure,
  router,
  type Context,
} from "@/server/api/trpc";
import { isPlatinumEntitled } from "@/lib/billing-tiers";
import { user } from "@/server/db/schema/auth";
import {
  trainingEnrollments,
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

  // ---------------------------------------------------------------------------
  // Enrollment
  // ---------------------------------------------------------------------------

  myEnrollments: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({
        id: trainingEnrollments.id,
        status: trainingEnrollments.status,
        progressJson: trainingEnrollments.progressJson,
        enrolledAt: trainingEnrollments.enrolledAt,
        startedAt: trainingEnrollments.startedAt,
        completedAt: trainingEnrollments.completedAt,
        finalScore: trainingEnrollments.finalScore,
        trainingSlug: trainings.slug,
        trainingTitle: trainings.title,
        trainingMonogram: trainings.monogram,
        trainingTileColor: trainings.tileColor,
        trainingHours: trainings.hours,
        trainingDurationLabel: trainings.durationLabel,
      })
      .from(trainingEnrollments)
      .innerJoin(trainings, eq(trainings.id, trainingEnrollments.trainingId))
      .where(eq(trainingEnrollments.candidateId, ctx.session.user.id))
      .orderBy(desc(trainingEnrollments.enrolledAt));
  }),

  enroll: jobseekerProcedure
    .input(z.object({ slug: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [userRow] = await ctx.db
        .select({
          plan: user.jobseekerPlan,
          status: user.jobseekerSubscriptionStatus,
        })
        .from(user)
        .where(eq(user.id, ctx.session.user.id))
        .limit(1);
      if (
        !userRow ||
        !isPlatinumEntitled({ plan: userRow.plan, status: userRow.status })
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "paywall:trainings",
        });
      }

      const [t] = await ctx.db
        .select({ id: trainings.id })
        .from(trainings)
        .where(and(eq(trainings.slug, input.slug), eq(trainings.isActive, true)))
        .limit(1);
      if (!t) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Training not found." });
      }

      const existing = await ctx.db
        .select({ id: trainingEnrollments.id })
        .from(trainingEnrollments)
        .where(
          and(
            eq(trainingEnrollments.candidateId, ctx.session.user.id),
            eq(trainingEnrollments.trainingId, t.id),
          ),
        )
        .limit(1);
      if (existing[0]) {
        return { enrollmentId: existing[0].id, alreadyEnrolled: true };
      }

      const [created] = await ctx.db
        .insert(trainingEnrollments)
        .values({
          candidateId: ctx.session.user.id,
          trainingId: t.id,
          status: "enrolled",
          progressJson: {},
        })
        .returning({ id: trainingEnrollments.id });

      return { enrollmentId: created.id, alreadyEnrolled: false };
    }),

  markLessonComplete: protectedProcedure
    .input(
      z.object({
        enrollmentId: z.string().uuid(),
        lessonId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return finalizeLessonProgress(ctx, {
        enrollmentId: input.enrollmentId,
        lessonId: input.lessonId,
        score: undefined,
      });
    }),

  // ---------------------------------------------------------------------------
  // Quiz + progress + certificate
  // ---------------------------------------------------------------------------

  submitQuiz: protectedProcedure
    .input(
      z.object({
        enrollmentId: z.string().uuid(),
        lessonId: z.string().uuid(),
        answers: z.record(z.string(), z.number().int().min(0).max(3)),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [lesson] = await ctx.db
        .select()
        .from(trainingLessons)
        .where(eq(trainingLessons.id, input.lessonId))
        .limit(1);
      if (!lesson || lesson.kind !== "quiz" || !lesson.quizQuestionsJson) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Lesson is not a quiz.",
        });
      }

      let correct = 0;
      for (const q of lesson.quizQuestionsJson) {
        if (input.answers[q.id] === q.correctIdx) correct += 1;
      }
      const total = lesson.quizQuestionsJson.length;
      const score = Math.round((correct / total) * 100);
      const passed = score >= (lesson.quizPassThreshold ?? 70);

      if (passed) {
        const result = await finalizeLessonProgress(ctx, {
          enrollmentId: input.enrollmentId,
          lessonId: input.lessonId,
          score,
        });
        return { score, passed, correct, total, ...result };
      }

      return { score, passed, correct, total, completed: false };
    }),

  getEnrollmentProgress: protectedProcedure
    .input(z.object({ enrollmentId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [enr] = await ctx.db
        .select()
        .from(trainingEnrollments)
        .where(eq(trainingEnrollments.id, input.enrollmentId))
        .limit(1);
      if (!enr) throw new TRPCError({ code: "NOT_FOUND" });
      if (enr.candidateId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return enr;
    }),

  // Public so a recruiter can view a shared cert link without signing in.
  // UUIDs are unguessable; cert exposes only the candidate's name + course.
  getCertificate: publicProcedure
    .input(z.object({ enrollmentId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select({
          enrollmentId: trainingEnrollments.id,
          status: trainingEnrollments.status,
          completedAt: trainingEnrollments.completedAt,
          finalScore: trainingEnrollments.finalScore,
          candidateName: user.name,
          trainingTitle: trainings.title,
          trainingCertName: trainings.certName,
          trainingDurationLabel: trainings.durationLabel,
          trainingInstructorName: trainings.instructorName,
        })
        .from(trainingEnrollments)
        .innerJoin(user, eq(user.id, trainingEnrollments.candidateId))
        .innerJoin(trainings, eq(trainings.id, trainingEnrollments.trainingId))
        .where(eq(trainingEnrollments.id, input.enrollmentId))
        .limit(1);
      const cert = rows[0];
      if (!cert) throw new TRPCError({ code: "NOT_FOUND" });
      if (cert.status !== "completed") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Training not yet completed.",
        });
      }
      return cert;
    }),
});

// ---------------------------------------------------------------------------
// Internal helper — shared by markLessonComplete and submitQuiz
// ---------------------------------------------------------------------------

async function finalizeLessonProgress(
  ctx: Context & { session: NonNullable<Context["session"]> },
  args: { enrollmentId: string; lessonId: string; score?: number },
) {
  const [enr] = await ctx.db
    .select()
    .from(trainingEnrollments)
    .where(eq(trainingEnrollments.id, args.enrollmentId))
    .limit(1);
  if (!enr) throw new TRPCError({ code: "NOT_FOUND" });
  if (enr.candidateId !== ctx.session.user.id) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }

  const [training] = await ctx.db
    .select({ id: trainings.id })
    .from(trainings)
    .where(eq(trainings.id, enr.trainingId))
    .limit(1);
  if (!training) throw new TRPCError({ code: "NOT_FOUND" });

  const allModules = await ctx.db
    .select({ id: trainingModules.id })
    .from(trainingModules)
    .where(eq(trainingModules.trainingId, training.id));
  const allLessons = await ctx.db
    .select({ id: trainingLessons.id, kind: trainingLessons.kind })
    .from(trainingLessons)
    .where(inArray(trainingLessons.moduleId, allModules.map((m) => m.id)));

  if (!allLessons.find((l) => l.id === args.lessonId)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Lesson does not belong to this enrollment.",
    });
  }

  const nowIso = new Date().toISOString();
  const nextProgress = {
    ...enr.progressJson,
    [args.lessonId]: {
      completedAt: nowIso,
      ...(args.score !== undefined ? { score: args.score } : {}),
    },
  };

  const completed = allLessons.every((l) => nextProgress[l.id]);
  const quizScores = allLessons
    .filter((l) => l.kind === "quiz")
    .map((l) => nextProgress[l.id]?.score)
    .filter((s): s is number => typeof s === "number");
  const finalScore =
    completed && quizScores.length > 0
      ? Math.round(quizScores.reduce((a, b) => a + b, 0) / quizScores.length)
      : null;

  await ctx.db
    .update(trainingEnrollments)
    .set({
      progressJson: nextProgress,
      status: completed ? "completed" : "in_progress",
      startedAt: enr.startedAt ?? new Date(),
      completedAt: completed ? new Date() : enr.completedAt,
      finalScore: completed ? finalScore : enr.finalScore,
    })
    .where(eq(trainingEnrollments.id, enr.id));

  return { ok: true, completed, finalScore };
}
