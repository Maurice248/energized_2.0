import { relations } from "drizzle-orm";
import { index, integer, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { cmsBodyFormatEnum, pageStatusEnum } from "./pages";

export const faqCategoryEnum = pgEnum("faq_category", [
  "general",
  "seekers",
  "employers",
  "billing",
  "privacy",
]);

export const faqs = pgTable(
  "faqs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    category: faqCategoryEnum("category").notNull().default("general"),
    question: text("question").notNull(),
    answer: text("answer").notNull().default(""),
    answerFormat: cmsBodyFormatEnum("answer_format").notNull().default("markdown"),
    supportArticleUrl: text("support_article_url"),
    sortOrder: integer("sort_order").notNull().default(0),
    status: pageStatusEnum("status").notNull().default("draft"),
    updatedByUserId: text("updated_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("faqs_category_sort_idx").on(table.category, table.sortOrder),
    index("faqs_status_idx").on(table.status),
    index("faqs_updated_at_idx").on(table.updatedAt),
  ],
);

export const faqsRelations = relations(faqs, ({ one }) => ({
  updatedBy: one(user, {
    fields: [faqs.updatedByUserId],
    references: [user.id],
  }),
}));

export type Faq = typeof faqs.$inferSelect;
export type NewFaq = typeof faqs.$inferInsert;
