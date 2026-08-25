import { faqs, auditLog } from "@/server/db/schema";
import { db } from "@/server/db";
import { FAQ_SEEDS } from "@/lib/faq-seeds";

export type SeedFaqsOptions = {
  actorUserId: string | null;
  actorLabel: string;
};

/**
 * Idempotently inserts starter FAQs when a matching question is missing.
 * Does not overwrite admin edits (match is exact trimmed question text).
 */
export async function seedFaqsTables(options: SeedFaqsOptions) {
  const existing = await db
    .select({
      question: faqs.question,
      category: faqs.category,
      sortOrder: faqs.sortOrder,
    })
    .from(faqs);

  const seen = new Set(existing.map((r) => r.question.trim().toLowerCase()));

  const sortCursor: Partial<Record<(typeof FAQ_SEEDS)[number]["category"], number>> =
    {};
  for (const row of existing) {
    const current = sortCursor[row.category] ?? -1;
    if (row.sortOrder > current) sortCursor[row.category] = row.sortOrder;
  }

  const toInsert = [];
  for (const seed of FAQ_SEEDS) {
    const key = seed.question.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const next = (sortCursor[seed.category] ?? -1) + 1;
    sortCursor[seed.category] = next;

    toInsert.push({
      category: seed.category,
      question: seed.question.trim(),
      answer: seed.answer.trim(),
      answerFormat: "markdown" as const,
      supportArticleUrl: seed.supportArticleUrl ?? null,
      sortOrder: next,
      status: "published" as const,
      updatedByUserId: options.actorUserId,
    });
  }

  if (toInsert.length === 0) {
    return { inserted: 0, questions: [] as string[] };
  }

  const inserted = await db
    .insert(faqs)
    .values(toInsert)
    .returning({ id: faqs.id, question: faqs.question });

  await db.insert(auditLog).values({
    actorUserId: options.actorUserId,
    actorLabel: options.actorLabel,
    action: "faq.seeded",
    entityType: "faq",
    meta: { count: inserted.length },
  });

  return {
    inserted: inserted.length,
    questions: inserted.map((r) => r.question),
  };
}
