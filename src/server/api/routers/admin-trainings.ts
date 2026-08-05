import { TRPCError } from "@trpc/server";
import { and, asc, eq, getTableColumns, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { adminProcedure, router } from "@/server/api/trpc";
import {
  auditLog,
  trainingLessons,
  trainingModules,
  trainings,
} from "@/server/db/schema";
import type { QuizQuestion, TrainingLesson } from "@/server/db/schema";

const sectorSchema = z.enum(["safety", "tech", "prof", "soft", "trans"]);
const levelSchema = z.enum(["beginner", "intermediate", "advanced", "all"]);

const slugSchema = z
  .string()
  .trim()
  .min(1, "Slug is required.")
  .max(80)
  .regex(
    /^[a-z0-9]+(-[a-z0-9]+)*$/,
    "Slug must be lowercase letters/numbers separated by hyphens.",
  );

const hexColorSchema = z
  .string()
  .trim()
  .regex(
    /^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/,
    "Tile color must be a hex like #1CAAE2 or #ABC.",
  );

const unlockSchema = z.object({
  role: z.string().trim().max(80).default(""),
  co: z.string().trim().max(80).default(""),
  band: z.string().trim().max(80).default(""),
});

const baseTrainingSchema = z.object({
  slug: slugSchema,
  title: z.string().trim().min(2, "Title is required.").max(160),
  shortBlurb: z.string().trim().min(1, "Short blurb is required.").max(600),
  longBlurb: z.string().trim().min(1, "Long blurb is required.").max(8_000),
  sector: sectorSchema,
  certName: z
    .string()
    .trim()
    .max(160)
    .transform((v) => (v.length === 0 ? null : v))
    .nullable()
    .default(null),
  hours: z.coerce.number().int().min(0).max(10_000),
  durationLabel: z.string().trim().min(1, "Duration label is required.").max(80),
  level: levelSchema,
  monogram: z.string().trim().min(1, "Monogram is required.").max(4),
  tileColor: hexColorSchema,
  instructorName: z
    .string()
    .trim()
    .min(1, "Instructor name is required.")
    .max(120),
  instructorRole: z
    .string()
    .trim()
    .min(1, "Instructor role is required.")
    .max(160),
  outcomesJson: z
    .array(z.string().trim().min(1).max(300))
    .default([])
    .transform((arr) => arr.filter((s) => s.length > 0)),
  unlocksJson: z
    .array(unlockSchema)
    .default([])
    .transform((arr) =>
      arr.filter((u) => u.role || u.co || u.band),
    ),
  isFeatured: z.boolean().default(false),
  isNew: z.boolean().default(false),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(10_000).default(0),
});

const createSchema = baseTrainingSchema;
const updateSchema = baseTrainingSchema.extend({ id: z.string().uuid() });

/* ------------------------ Modules ------------------------ */

const moduleBaseShape = {
  slug: slugSchema,
  number: z.string().trim().min(1, "Module number is required.").max(20),
  title: z.string().trim().min(1, "Title is required.").max(160),
  durationLabel: z
    .string()
    .trim()
    .min(1, "Duration label is required.")
    .max(80),
} as const;

const moduleCreateSchema = z.object({
  ...moduleBaseShape,
  trainingId: z.string().uuid(),
  sortOrder: z.coerce.number().int().min(0).max(10_000).optional(),
});

const moduleUpdateSchema = z.object({
  ...moduleBaseShape,
  id: z.string().uuid(),
  sortOrder: z.coerce.number().int().min(0).max(10_000),
});

/* ------------------------ Lessons ------------------------ */

const lessonKindSchema = z.enum(["video", "practice", "quiz"]);

const quizQuestionSchema = z.object({
  id: z.string().min(1),
  prompt: z.string().trim().min(1, "Prompt is required.").max(1_000),
  options: z.tuple([
    z.string().trim().min(1),
    z.string().trim().min(1),
    z.string().trim().min(1),
    z.string().trim().min(1),
  ]),
  correctIdx: z.union([
    z.literal(0),
    z.literal(1),
    z.literal(2),
    z.literal(3),
  ]),
  explanation: z
    .string()
    .trim()
    .max(1_000)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
});

const nullableTrimmedString = (max: number) =>
  z
    .string()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => {
      if (v === undefined || v === null) return null;
      const t = v.trim();
      return t.length === 0 ? null : t;
    });

const optionalUrlOrNull = z
  .union([z.literal(""), z.string().url("Must be a valid URL.")])
  .optional()
  .nullable()
  .transform((v) => (!v ? null : v));

const lessonBaseShape = {
  slug: slugSchema,
  title: z.string().trim().min(1, "Title is required.").max(160),
  kind: lessonKindSchema,
  durationLabel: z
    .string()
    .trim()
    .min(1, "Duration label is required.")
    .max(80),
  videoUrl: optionalUrlOrNull,
  videoProvider: nullableTrimmedString(40),
  practiceMarkdown: nullableTrimmedString(50_000),
  quizQuestionsJson: z
    .array(quizQuestionSchema)
    .optional()
    .nullable()
    .transform((v) => (v && v.length > 0 ? v : null)),
  quizPassThreshold: z.coerce
    .number()
    .int()
    .min(0)
    .max(100)
    .optional()
    .nullable(),
} as const;

type LessonPayload = {
  kind: "video" | "practice" | "quiz";
  videoUrl: string | null;
  videoProvider: string | null;
  practiceMarkdown: string | null;
  quizQuestionsJson: QuizQuestion[] | null;
  quizPassThreshold?: number | null;
};

function validateLessonKind(
  val: LessonPayload,
  ctx: z.RefinementCtx,
): void {
  if (val.kind === "video") {
    if (!val.videoUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["videoUrl"],
        message: "Video URL is required for video lessons.",
      });
    }
    if (!val.videoProvider) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["videoProvider"],
        message: "Video provider is required for video lessons.",
      });
    }
  }
  if (val.kind === "practice") {
    if (!val.practiceMarkdown) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["practiceMarkdown"],
        message: "Practice content is required for practice lessons.",
      });
    }
  }
  if (val.kind === "quiz") {
    const qs = val.quizQuestionsJson ?? [];
    if (qs.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["quizQuestionsJson"],
        message: "Add at least one question for quiz lessons.",
      });
    }
    if (
      val.quizPassThreshold === null ||
      val.quizPassThreshold === undefined
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["quizPassThreshold"],
        message: "Pass threshold is required for quiz lessons.",
      });
    }
  }
}

const lessonCreateSchema = z
  .object({
    ...lessonBaseShape,
    moduleId: z.string().uuid(),
    sortOrder: z.coerce.number().int().min(0).max(10_000).optional(),
  })
  .superRefine(validateLessonKind);

const lessonUpdateSchema = z
  .object({
    ...lessonBaseShape,
    id: z.string().uuid(),
    sortOrder: z.coerce.number().int().min(0).max(10_000),
  })
  .superRefine(validateLessonKind);

/* --------------- Kind-dependent field zeroing --------------- */

function zeroOutForKind<T extends LessonPayload>(payload: T): T {
  const next = { ...payload };
  if (next.kind !== "video") {
    next.videoUrl = null;
    next.videoProvider = null;
  }
  if (next.kind !== "practice") {
    next.practiceMarkdown = null;
  }
  if (next.kind !== "quiz") {
    next.quizQuestionsJson = null;
    next.quizPassThreshold = null;
  }
  return next;
}

export const adminTrainingsRouter = router({
  list: adminProcedure.query(async ({ ctx }) => {
    // Correlated counts: qualify the outer row as "trainings"."id" so
    // ${trainings.id} in a raw sql template doesn't collapse to bare "id"
    // and break correlation (see topEmployers note in admin.ts).
    const rows = await ctx.db
      .select({
        ...getTableColumns(trainings),
        moduleCount: sql<number>`(
          SELECT COUNT(*)::int FROM "training_modules" tm
          WHERE tm.training_id = "trainings"."id"
        )`,
        lessonCount: sql<number>`(
          SELECT COUNT(*)::int FROM "training_lessons" tl
          INNER JOIN "training_modules" tm ON tm.id = tl.module_id
          WHERE tm.training_id = "trainings"."id"
        )`,
        enrollmentCount: sql<number>`(
          SELECT COUNT(*)::int FROM "training_enrollments" te
          WHERE te.training_id = "trainings"."id"
        )`,
      })
      .from(trainings)
      .orderBy(asc(trainings.sortOrder), asc(trainings.title));

    return rows;
  }),

  getById: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select()
        .from(trainings)
        .where(eq(trainings.id, input.id))
        .limit(1);
      if (!row) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Training not found.",
        });
      }
      return row;
    }),

  create: adminProcedure.input(createSchema).mutation(async ({ ctx, input }) => {
    const [dup] = await ctx.db
      .select({ id: trainings.id })
      .from(trainings)
      .where(eq(trainings.slug, input.slug))
      .limit(1);
    if (dup) {
      throw new TRPCError({
        code: "CONFLICT",
        message: `A training with slug "${input.slug}" already exists.`,
      });
    }

    const [row] = await ctx.db
      .insert(trainings)
      .values({
        slug: input.slug,
        title: input.title,
        shortBlurb: input.shortBlurb,
        longBlurb: input.longBlurb,
        sector: input.sector,
        certName: input.certName,
        hours: input.hours,
        durationLabel: input.durationLabel,
        level: input.level,
        monogram: input.monogram,
        tileColor: input.tileColor,
        instructorName: input.instructorName,
        instructorRole: input.instructorRole,
        outcomesJson: input.outcomesJson,
        unlocksJson: input.unlocksJson,
        isFeatured: input.isFeatured,
        isNew: input.isNew,
        isActive: input.isActive,
        sortOrder: input.sortOrder,
      })
      .returning();

    if (!row) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create training.",
      });
    }

    await ctx.db.insert(auditLog).values({
      actorUserId: ctx.session.user.id,
      actorLabel: ctx.session.user.email,
      action: "training.created",
      entityType: "training",
      entityId: row.id,
      meta: {
        slug: row.slug,
        title: row.title,
        sector: row.sector,
        level: row.level,
        isActive: row.isActive,
      },
    });

    return row;
  }),

  update: adminProcedure.input(updateSchema).mutation(async ({ ctx, input }) => {
    const [current] = await ctx.db
      .select()
      .from(trainings)
      .where(eq(trainings.id, input.id))
      .limit(1);
    if (!current) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Training not found.",
      });
    }

    if (input.slug !== current.slug) {
      const [dup] = await ctx.db
        .select({ id: trainings.id })
        .from(trainings)
        .where(eq(trainings.slug, input.slug))
        .limit(1);
      if (dup && dup.id !== input.id) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `A training with slug "${input.slug}" already exists.`,
        });
      }
    }

    const [row] = await ctx.db
      .update(trainings)
      .set({
        slug: input.slug,
        title: input.title,
        shortBlurb: input.shortBlurb,
        longBlurb: input.longBlurb,
        sector: input.sector,
        certName: input.certName,
        hours: input.hours,
        durationLabel: input.durationLabel,
        level: input.level,
        monogram: input.monogram,
        tileColor: input.tileColor,
        instructorName: input.instructorName,
        instructorRole: input.instructorRole,
        outcomesJson: input.outcomesJson,
        unlocksJson: input.unlocksJson,
        isFeatured: input.isFeatured,
        isNew: input.isNew,
        isActive: input.isActive,
        sortOrder: input.sortOrder,
      })
      .where(eq(trainings.id, input.id))
      .returning();

    if (!row) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to update training.",
      });
    }

    await ctx.db.insert(auditLog).values({
      actorUserId: ctx.session.user.id,
      actorLabel: ctx.session.user.email,
      action: "training.updated",
      entityType: "training",
      entityId: row.id,
      meta: {
        slug: row.slug,
        title: row.title,
        sector: row.sector,
        level: row.level,
        isActive: row.isActive,
      },
    });

    return row;
  }),

  /* ------------------------ Curriculum tree ------------------------ */

  curriculumTree: adminProcedure
    .input(z.object({ trainingId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [training] = await ctx.db
        .select()
        .from(trainings)
        .where(eq(trainings.id, input.trainingId))
        .limit(1);
      if (!training) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Training not found.",
        });
      }

      const modules = await ctx.db
        .select()
        .from(trainingModules)
        .where(eq(trainingModules.trainingId, input.trainingId))
        .orderBy(asc(trainingModules.sortOrder), asc(trainingModules.number));

      const moduleIds = modules.map((m) => m.id);
      const lessons: TrainingLesson[] = moduleIds.length
        ? await ctx.db
            .select()
            .from(trainingLessons)
            .where(inArray(trainingLessons.moduleId, moduleIds))
            .orderBy(
              asc(trainingLessons.moduleId),
              asc(trainingLessons.sortOrder),
              asc(trainingLessons.title),
            )
        : [];

      const lessonsByModule = new Map<string, TrainingLesson[]>();
      for (const l of lessons) {
        const arr = lessonsByModule.get(l.moduleId) ?? [];
        arr.push(l);
        lessonsByModule.set(l.moduleId, arr);
      }

      return {
        training,
        modules: modules.map((m) => ({
          ...m,
          lessons: lessonsByModule.get(m.id) ?? [],
        })),
      };
    }),

  /* ------------------------ Modules ------------------------ */

  moduleCreate: adminProcedure
    .input(moduleCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const [dup] = await ctx.db
        .select({ id: trainingModules.id })
        .from(trainingModules)
        .where(
          and(
            eq(trainingModules.trainingId, input.trainingId),
            eq(trainingModules.slug, input.slug),
          ),
        )
        .limit(1);
      if (dup) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `A module with slug "${input.slug}" already exists in this training.`,
        });
      }

      let sortOrder = input.sortOrder;
      if (sortOrder === undefined) {
        const [{ maxOrder }] = await ctx.db
          .select({
            maxOrder: sql<number>`coalesce(max(${trainingModules.sortOrder}), -1)`,
          })
          .from(trainingModules)
          .where(eq(trainingModules.trainingId, input.trainingId));
        sortOrder = Number(maxOrder ?? -1) + 1;
      }

      const [row] = await ctx.db
        .insert(trainingModules)
        .values({
          trainingId: input.trainingId,
          slug: input.slug,
          number: input.number,
          title: input.title,
          durationLabel: input.durationLabel,
          sortOrder,
        })
        .returning();

      if (!row) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create module.",
        });
      }

      await ctx.db.insert(auditLog).values({
        actorUserId: ctx.session.user.id,
        actorLabel: ctx.session.user.email,
        action: "training.module.created",
        entityType: "training_module",
        entityId: row.id,
        meta: {
          trainingId: row.trainingId,
          slug: row.slug,
          title: row.title,
        },
      });

      return row;
    }),

  moduleUpdate: adminProcedure
    .input(moduleUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const [current] = await ctx.db
        .select()
        .from(trainingModules)
        .where(eq(trainingModules.id, input.id))
        .limit(1);
      if (!current) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Module not found.",
        });
      }

      if (input.slug !== current.slug) {
        const [dup] = await ctx.db
          .select({ id: trainingModules.id })
          .from(trainingModules)
          .where(
            and(
              eq(trainingModules.trainingId, current.trainingId),
              eq(trainingModules.slug, input.slug),
            ),
          )
          .limit(1);
        if (dup && dup.id !== input.id) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `A module with slug "${input.slug}" already exists in this training.`,
          });
        }
      }

      const [row] = await ctx.db
        .update(trainingModules)
        .set({
          slug: input.slug,
          number: input.number,
          title: input.title,
          durationLabel: input.durationLabel,
          sortOrder: input.sortOrder,
        })
        .where(eq(trainingModules.id, input.id))
        .returning();

      if (!row) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update module.",
        });
      }

      await ctx.db.insert(auditLog).values({
        actorUserId: ctx.session.user.id,
        actorLabel: ctx.session.user.email,
        action: "training.module.updated",
        entityType: "training_module",
        entityId: row.id,
        meta: {
          trainingId: row.trainingId,
          slug: row.slug,
          title: row.title,
        },
      });

      return row;
    }),

  moduleDelete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [current] = await ctx.db
        .select()
        .from(trainingModules)
        .where(eq(trainingModules.id, input.id))
        .limit(1);
      if (!current) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Module not found.",
        });
      }

      // Lessons cascade via FK onDelete: cascade.
      await ctx.db
        .delete(trainingModules)
        .where(eq(trainingModules.id, input.id));

      await ctx.db.insert(auditLog).values({
        actorUserId: ctx.session.user.id,
        actorLabel: ctx.session.user.email,
        action: "training.module.deleted",
        entityType: "training_module",
        entityId: current.id,
        meta: {
          trainingId: current.trainingId,
          slug: current.slug,
          title: current.title,
        },
      });

      return { id: current.id };
    }),

  moduleReorder: adminProcedure
    .input(
      z.object({
        trainingId: z.string().uuid(),
        orderedIds: z.array(z.string().uuid()).min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify every id belongs to this training.
      const rows = await ctx.db
        .select({ id: trainingModules.id })
        .from(trainingModules)
        .where(
          and(
            eq(trainingModules.trainingId, input.trainingId),
            inArray(trainingModules.id, input.orderedIds),
          ),
        );
      if (rows.length !== input.orderedIds.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Reorder list contains modules from another training.",
        });
      }

      await Promise.all(
        input.orderedIds.map((id, idx) =>
          ctx.db
            .update(trainingModules)
            .set({ sortOrder: idx })
            .where(eq(trainingModules.id, id)),
        ),
      );

      return { ok: true };
    }),

  /* ------------------------ Lessons ------------------------ */

  lessonGetById: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select()
        .from(trainingLessons)
        .where(eq(trainingLessons.id, input.id))
        .limit(1);
      if (!row) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Lesson not found.",
        });
      }
      return row;
    }),

  lessonCreate: adminProcedure
    .input(lessonCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const [mod] = await ctx.db
        .select()
        .from(trainingModules)
        .where(eq(trainingModules.id, input.moduleId))
        .limit(1);
      if (!mod) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Module not found.",
        });
      }

      const [dup] = await ctx.db
        .select({ id: trainingLessons.id })
        .from(trainingLessons)
        .where(
          and(
            eq(trainingLessons.moduleId, input.moduleId),
            eq(trainingLessons.slug, input.slug),
          ),
        )
        .limit(1);
      if (dup) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `A lesson with slug "${input.slug}" already exists in this module.`,
        });
      }

      let sortOrder = input.sortOrder;
      if (sortOrder === undefined) {
        const [{ maxOrder }] = await ctx.db
          .select({
            maxOrder: sql<number>`coalesce(max(${trainingLessons.sortOrder}), -1)`,
          })
          .from(trainingLessons)
          .where(eq(trainingLessons.moduleId, input.moduleId));
        sortOrder = Number(maxOrder ?? -1) + 1;
      }

      const zeroed = zeroOutForKind({
        kind: input.kind,
        videoUrl: input.videoUrl,
        videoProvider: input.videoProvider,
        practiceMarkdown: input.practiceMarkdown,
        quizQuestionsJson: input.quizQuestionsJson,
        quizPassThreshold: input.quizPassThreshold ?? null,
      });

      const [row] = await ctx.db
        .insert(trainingLessons)
        .values({
          moduleId: input.moduleId,
          slug: input.slug,
          title: input.title,
          kind: input.kind,
          durationLabel: input.durationLabel,
          videoUrl: zeroed.videoUrl,
          videoProvider: zeroed.videoProvider,
          practiceMarkdown: zeroed.practiceMarkdown,
          quizQuestionsJson: zeroed.quizQuestionsJson,
          quizPassThreshold: zeroed.quizPassThreshold ?? null,
          sortOrder,
        })
        .returning();

      if (!row) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create lesson.",
        });
      }

      await ctx.db.insert(auditLog).values({
        actorUserId: ctx.session.user.id,
        actorLabel: ctx.session.user.email,
        action: "training.lesson.created",
        entityType: "training_lesson",
        entityId: row.id,
        meta: {
          moduleId: row.moduleId,
          slug: row.slug,
          title: row.title,
          kind: row.kind,
        },
      });

      return row;
    }),

  lessonUpdate: adminProcedure
    .input(lessonUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const [current] = await ctx.db
        .select()
        .from(trainingLessons)
        .where(eq(trainingLessons.id, input.id))
        .limit(1);
      if (!current) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Lesson not found.",
        });
      }

      if (input.slug !== current.slug) {
        const [dup] = await ctx.db
          .select({ id: trainingLessons.id })
          .from(trainingLessons)
          .where(
            and(
              eq(trainingLessons.moduleId, current.moduleId),
              eq(trainingLessons.slug, input.slug),
            ),
          )
          .limit(1);
        if (dup && dup.id !== input.id) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `A lesson with slug "${input.slug}" already exists in this module.`,
          });
        }
      }

      const zeroed = zeroOutForKind({
        kind: input.kind,
        videoUrl: input.videoUrl,
        videoProvider: input.videoProvider,
        practiceMarkdown: input.practiceMarkdown,
        quizQuestionsJson: input.quizQuestionsJson,
        quizPassThreshold: input.quizPassThreshold ?? null,
      });

      const [row] = await ctx.db
        .update(trainingLessons)
        .set({
          slug: input.slug,
          title: input.title,
          kind: input.kind,
          durationLabel: input.durationLabel,
          videoUrl: zeroed.videoUrl,
          videoProvider: zeroed.videoProvider,
          practiceMarkdown: zeroed.practiceMarkdown,
          quizQuestionsJson: zeroed.quizQuestionsJson,
          quizPassThreshold: zeroed.quizPassThreshold ?? null,
          sortOrder: input.sortOrder,
        })
        .where(eq(trainingLessons.id, input.id))
        .returning();

      if (!row) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update lesson.",
        });
      }

      await ctx.db.insert(auditLog).values({
        actorUserId: ctx.session.user.id,
        actorLabel: ctx.session.user.email,
        action: "training.lesson.updated",
        entityType: "training_lesson",
        entityId: row.id,
        meta: {
          moduleId: row.moduleId,
          slug: row.slug,
          title: row.title,
          kind: row.kind,
        },
      });

      return row;
    }),

  lessonDelete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [current] = await ctx.db
        .select()
        .from(trainingLessons)
        .where(eq(trainingLessons.id, input.id))
        .limit(1);
      if (!current) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Lesson not found.",
        });
      }

      await ctx.db
        .delete(trainingLessons)
        .where(eq(trainingLessons.id, input.id));

      await ctx.db.insert(auditLog).values({
        actorUserId: ctx.session.user.id,
        actorLabel: ctx.session.user.email,
        action: "training.lesson.deleted",
        entityType: "training_lesson",
        entityId: current.id,
        meta: {
          moduleId: current.moduleId,
          slug: current.slug,
          title: current.title,
          kind: current.kind,
        },
      });

      return { id: current.id };
    }),

  lessonReorder: adminProcedure
    .input(
      z.object({
        moduleId: z.string().uuid(),
        orderedIds: z.array(z.string().uuid()).min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select({ id: trainingLessons.id })
        .from(trainingLessons)
        .where(
          and(
            eq(trainingLessons.moduleId, input.moduleId),
            inArray(trainingLessons.id, input.orderedIds),
          ),
        );
      if (rows.length !== input.orderedIds.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Reorder list contains lessons from another module.",
        });
      }

      await Promise.all(
        input.orderedIds.map((id, idx) =>
          ctx.db
            .update(trainingLessons)
            .set({ sortOrder: idx })
            .where(eq(trainingLessons.id, id)),
        ),
      );

      return { ok: true };
    }),
});
