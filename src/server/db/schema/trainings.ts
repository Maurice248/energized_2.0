import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const trainingSectorEnum = pgEnum("training_sector", [
  "safety",
  "tech",
  "prof",
  "soft",
  "trans",
]);

export const trainingLevelEnum = pgEnum("training_level", [
  "beginner",
  "intermediate",
  "advanced",
  "all",
]);

export type TrainingUnlock = { role: string; co: string; band: string };

export const trainings = pgTable("trainings", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  shortBlurb: text("short_blurb").notNull(),
  longBlurb: text("long_blurb").notNull(),
  sector: trainingSectorEnum("sector").notNull(),
  certName: text("cert_name"),
  hours: integer("hours").notNull(),
  durationLabel: text("duration_label").notNull(),
  level: trainingLevelEnum("level").notNull(),
  monogram: text("monogram").notNull(),
  tileColor: text("tile_color").notNull(),
  instructorName: text("instructor_name").notNull(),
  instructorRole: text("instructor_role").notNull(),
  outcomesJson: jsonb("outcomes_json").$type<string[]>().notNull(),
  unlocksJson: jsonb("unlocks_json").$type<TrainingUnlock[]>().notNull(),
  isFeatured: boolean("is_featured").notNull().default(false),
  isNew: boolean("is_new").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Training = typeof trainings.$inferSelect;
export type NewTraining = typeof trainings.$inferInsert;
