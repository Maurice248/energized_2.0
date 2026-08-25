import { TRPCError } from "@trpc/server";
import { and, asc, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { z } from "zod";
import { adminProcedure, router } from "@/server/api/trpc";
import { auditLog, faqs } from "@/server/db/schema";
import { normalizeStoredCmsBody } from "@/lib/cms-page-sections";
import { seedFaqsTables } from "@/server/services/seed-faqs";

const faqCategorySchema = z.enum([
  "general",
  "seekers",
  "employers",
  "billing",
  "privacy",
]);

const faqStatusSchema = z.enum(["draft", "published"]);

const answerFormatSchema = z.enum(["markdown", "html"]);

const supportUrlSchema = z
  .union([z.literal(""), z.string().url()])
  .optional()
  .nullable()
  .transform((v) => (v === "" || v === undefined ? null : v));

const questionSchema = z
  .string()
  .trim()
  .min(1, "Question is required.")
  .max(500, "Question must be 500 characters or fewer.");

const answerSchema = z.string().max(50_000, "Answer must be 50,000 characters or fewer.");

function normalizeAnswer(body: string, format: "markdown" | "html"): string {
  return normalizeStoredCmsBody(body, format);
}

const categoryOrderSql = sql`CASE ${faqs.category}
  WHEN 'general' THEN 0
  WHEN 'seekers' THEN 1
  WHEN 'employers' THEN 2
  WHEN 'billing' THEN 3
  WHEN 'privacy' THEN 4
  ELSE 99
END`;

const listInputSchema = z
  .object({
    search: z.string().trim().max(200).optional(),
    status: z.enum(["all", "draft", "published"]).default("all"),
    category: z.enum(["all"]).or(faqCategorySchema).default("all"),
  })
  .optional();

const createSchema = z.object({
  category: faqCategorySchema.default("general"),
  question: questionSchema,
  answer: answerSchema.optional().default(""),
  answerFormat: answerFormatSchema.default("markdown"),
  supportArticleUrl: supportUrlSchema,
  status: faqStatusSchema.default("draft"),
});

const updateSchema = z.object({
  id: z.string().uuid(),
  category: faqCategorySchema.optional(),
  question: questionSchema.optional(),
  answer: answerSchema.optional(),
  answerFormat: answerFormatSchema.optional(),
  supportArticleUrl: supportUrlSchema,
  status: faqStatusSchema.optional(),
});

export const adminFaqsRouter = router({
  list: adminProcedure.input(listInputSchema).query(async ({ ctx, input }) => {
    const q = input?.search?.trim() ?? "";
    const status = input?.status ?? "all";
    const category = input?.category ?? "all";

    const conditions = [];
    if (q.length > 0) {
      const needle = `%${q}%`;
      conditions.push(
        or(
          ilike(faqs.question, needle),
          ilike(faqs.answer, needle),
        ) as ReturnType<typeof eq>,
      );
    }
    if (status !== "all") {
      conditions.push(eq(faqs.status, status));
    }
    if (category !== "all") {
      conditions.push(eq(faqs.category, category));
    }

    const rows = await ctx.db
      .select()
      .from(faqs)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(categoryOrderSql, asc(faqs.sortOrder), desc(faqs.updatedAt));

    return rows;
  }),

  stats: adminProcedure.query(async ({ ctx }) => {
    const [row] = await ctx.db
      .select({
        total: count(),
        published: sql<number>`count(*) filter (where ${faqs.status} = 'published')::int`,
        drafts: sql<number>`count(*) filter (where ${faqs.status} = 'draft')::int`,
      })
      .from(faqs);

    return {
      total: Number(row?.total ?? 0),
      published: Number(row?.published ?? 0),
      drafts: Number(row?.drafts ?? 0),
    };
  }),

  get: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select()
        .from(faqs)
        .where(eq(faqs.id, input.id))
        .limit(1);
      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "FAQ not found." });
      }
      return row;
    }),

  create: adminProcedure.input(createSchema).mutation(async ({ ctx, input }) => {
    const [{ maxOrder }] = await ctx.db
      .select({
        maxOrder: sql<number>`coalesce(max(${faqs.sortOrder}), -1)`,
      })
      .from(faqs)
      .where(eq(faqs.category, input.category));

    const nextOrder = Number(maxOrder ?? -1) + 1;
    const answer = normalizeAnswer(input.answer ?? "", input.answerFormat);

    const [row] = await ctx.db
      .insert(faqs)
      .values({
        category: input.category,
        question: input.question.trim(),
        answer,
        answerFormat: input.answerFormat,
        supportArticleUrl: input.supportArticleUrl ?? null,
        status: input.status,
        sortOrder: nextOrder,
        updatedByUserId: ctx.session.user.id,
      })
      .returning();

    if (!row) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create FAQ.",
      });
    }

    await ctx.db.insert(auditLog).values({
      actorUserId: ctx.session.user.id,
      actorLabel: ctx.session.user.email,
      action: "faq.created",
      entityType: "faq",
      entityId: row.id,
      meta: {
        category: row.category,
        status: row.status,
        question: row.question.slice(0, 120),
      },
    });

    return row;
  }),

  update: adminProcedure.input(updateSchema).mutation(async ({ ctx, input }) => {
    const [current] = await ctx.db
      .select()
      .from(faqs)
      .where(eq(faqs.id, input.id))
      .limit(1);
    if (!current) {
      throw new TRPCError({ code: "NOT_FOUND", message: "FAQ not found." });
    }

    if (
      input.answerFormat !== undefined &&
      input.answer === undefined &&
      input.answerFormat !== current.answerFormat
    ) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          "Include answer text in the same save when switching between Markdown and HTML.",
      });
    }

    const nextFormat = input.answerFormat ?? current.answerFormat;

    const patch: Partial<typeof faqs.$inferInsert> = {
      updatedByUserId: ctx.session.user.id,
    };

    if (input.category !== undefined && input.category !== current.category) {
      patch.category = input.category;
      const [{ maxOrder }] = await ctx.db
        .select({
          maxOrder: sql<number>`coalesce(max(${faqs.sortOrder}), -1)`,
        })
        .from(faqs)
        .where(eq(faqs.category, input.category));
      patch.sortOrder = Number(maxOrder ?? -1) + 1;
    }

    if (input.question !== undefined) patch.question = input.question.trim();
    if (input.answer !== undefined) {
      patch.answer = normalizeAnswer(input.answer, nextFormat);
    }
    if (input.answerFormat !== undefined) patch.answerFormat = input.answerFormat;
    if (input.supportArticleUrl !== undefined) {
      patch.supportArticleUrl = input.supportArticleUrl;
    }
    if (input.status !== undefined) patch.status = input.status;

    const [row] = await ctx.db
      .update(faqs)
      .set(patch)
      .where(eq(faqs.id, input.id))
      .returning();

    if (!row) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to update FAQ.",
      });
    }

    await ctx.db.insert(auditLog).values({
      actorUserId: ctx.session.user.id,
      actorLabel: ctx.session.user.email,
      action: "faq.updated",
      entityType: "faq",
      entityId: row.id,
      meta: {
        category: row.category,
        status: row.status,
        changedFields: Object.keys(patch).filter((k) => k !== "updatedByUserId"),
      },
    });

    return row;
  }),

  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [current] = await ctx.db
        .select()
        .from(faqs)
        .where(eq(faqs.id, input.id))
        .limit(1);
      if (!current) {
        throw new TRPCError({ code: "NOT_FOUND", message: "FAQ not found." });
      }

      await ctx.db.delete(faqs).where(eq(faqs.id, input.id));

      await ctx.db.insert(auditLog).values({
        actorUserId: ctx.session.user.id,
        actorLabel: ctx.session.user.email,
        action: "faq.deleted",
        entityType: "faq",
        entityId: current.id,
        meta: {
          category: current.category,
          question: current.question.slice(0, 120),
        },
      });

      return { id: current.id };
    }),

  reorder: adminProcedure
    .input(
      z.object({
        category: faqCategorySchema,
        orderedIds: z.array(z.string().uuid()).min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const inCat = await ctx.db
        .select({ id: faqs.id })
        .from(faqs)
        .where(eq(faqs.category, input.category));

      const validIds = new Set(inCat.map((r) => r.id));
      if (input.orderedIds.length !== validIds.size) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Reorder must list every FAQ in this category exactly once.",
        });
      }
      for (const id of input.orderedIds) {
        if (!validIds.has(id)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "One or more FAQs are not in this category.",
          });
        }
      }

      await ctx.db.transaction(async (tx) => {
        for (let i = 0; i < input.orderedIds.length; i++) {
          await tx
            .update(faqs)
            .set({
              sortOrder: i,
              updatedByUserId: ctx.session.user.id,
            })
            .where(
              and(eq(faqs.id, input.orderedIds[i]), eq(faqs.category, input.category)),
            );
        }
      });

      await ctx.db.insert(auditLog).values({
        actorUserId: ctx.session.user.id,
        actorLabel: ctx.session.user.email,
        action: "faq.reordered",
        entityType: "faq",
        entityId: input.category,
        meta: { category: input.category, count: input.orderedIds.length },
      });

      return { ok: true as const };
    }),

  /**
   * Idempotently inserts starter FAQs when matching questions are missing.
   * Does not overwrite existing copy.
   */
  seedDefaults: adminProcedure.mutation(async ({ ctx }) => {
    const res = await seedFaqsTables({
      actorUserId: ctx.session.user.id,
      actorLabel: ctx.session.user.email,
    });
    return { inserted: res.inserted };
  }),
});
