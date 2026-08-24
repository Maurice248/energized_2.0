import { asc, eq, sql } from "drizzle-orm";
import { publicProcedure, router } from "@/server/api/trpc";
import { faqs } from "@/server/db/schema";

const categoryOrderSql = sql`CASE ${faqs.category}
  WHEN 'general' THEN 0
  WHEN 'seekers' THEN 1
  WHEN 'employers' THEN 2
  WHEN 'billing' THEN 3
  WHEN 'privacy' THEN 4
  ELSE 99
END`;

export const faqsRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({
        id: faqs.id,
        category: faqs.category,
        question: faqs.question,
        answer: faqs.answer,
        answerFormat: faqs.answerFormat,
        supportArticleUrl: faqs.supportArticleUrl,
        sortOrder: faqs.sortOrder,
      })
      .from(faqs)
      .where(eq(faqs.status, "published"))
      .orderBy(categoryOrderSql, asc(faqs.sortOrder), asc(faqs.question));
  }),
});
