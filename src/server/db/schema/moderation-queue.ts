import { relations } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import {
  moderationFlagSourceEnum,
  moderationKindEnum,
  moderationSeverityEnum,
  moderationStatusEnum,
} from "./enums";

export const moderationItems = pgTable(
  "moderation_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: moderationKindEnum("kind").notNull(),
    severity: moderationSeverityEnum("severity").notNull(),
    title: text("title").notNull(),
    summary: text("summary"),
    refTable: text("ref_table"),
    refId: text("ref_id"),
    aiConfidence: integer("ai_confidence"),
    reportedByCount: integer("reported_by_count").notNull().default(0),
    flagSource: moderationFlagSourceEnum("flag_source")
      .notNull()
      .default("auto"),
    status: moderationStatusEnum("status").notNull().default("pending"),
    meta: jsonb("meta").$type<Record<string, unknown>>().notNull().default({}),
    assignedTo: text("assigned_to").references(() => user.id, {
      onDelete: "set null",
    }),
    resolvedAt: timestamp("resolved_at"),
    resolvedBy: text("resolved_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date()),
  },
  (table) => [
    index("moderation_items_status_idx").on(table.status, table.createdAt),
    index("moderation_items_kind_idx").on(table.kind, table.status),
    index("moderation_items_ref_idx").on(table.refTable, table.refId),
  ],
);

export const moderationItemRelations = relations(moderationItems, ({ one }) => ({
  assignee: one(user, {
    fields: [moderationItems.assignedTo],
    references: [user.id],
    relationName: "moderationAssignee",
  }),
  resolver: one(user, {
    fields: [moderationItems.resolvedBy],
    references: [user.id],
    relationName: "moderationResolver",
  }),
}));

export type ModerationItem = typeof moderationItems.$inferSelect;
export type NewModerationItem = typeof moderationItems.$inferInsert;
