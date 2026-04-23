import { relations } from "drizzle-orm";
import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sectorEnum } from "./enums";
import { profiles } from "./profiles";

export const workHistory = pgTable(
  "work_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    employerName: text("employer_name").notNull(),
    roleTitle: text("role_title").notNull(),
    site: text("site"),
    sector: sectorEnum("sector"),
    commodity: text("commodity"),
    rotation: text("rotation"),
    summary: text("summary"),
    skills: text("skills").array().notNull().default([]),
    startedAt: timestamp("started_at").notNull(),
    endedAt: timestamp("ended_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("work_history_profile_id_idx").on(table.profileId)],
);

export const workHistoryRelations = relations(workHistory, ({ one }) => ({
  profile: one(profiles, {
    fields: [workHistory.profileId],
    references: [profiles.id],
  }),
}));
