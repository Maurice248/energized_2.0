import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

export const pageStatusEnum = pgEnum("page_status", ["draft", "published"]);

export const cmsBodyFormatEnum = pgEnum("cms_body_format", ["markdown", "html"]);

export const pages = pgTable(
  "pages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    bodyFormat: cmsBodyFormatEnum("body_format").notNull().default("markdown"),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    status: pageStatusEnum("status").notNull().default("draft"),
    // Seeded marketing slugs cannot be deleted and their slug cannot be changed,
    // because a static (marketing) route in src/app/(marketing)/<slug>/page.tsx
    // shadows the dynamic /[slug] CMS route for the same path.
    isSystem: boolean("is_system").notNull().default(false),
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
    index("pages_status_idx").on(table.status),
    index("pages_updated_at_idx").on(table.updatedAt),
  ],
);

export const pagesRelations = relations(pages, ({ one }) => ({
  updatedBy: one(user, {
    fields: [pages.updatedByUserId],
    references: [user.id],
  }),
}));

export type Page = typeof pages.$inferSelect;
export type NewPage = typeof pages.$inferInsert;
