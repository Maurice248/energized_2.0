import {
  integer,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { trainings } from "./trainings";

export const trainingModules = pgTable(
  "training_modules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    trainingId: uuid("training_id")
      .notNull()
      .references(() => trainings.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    number: text("number").notNull(),
    title: text("title").notNull(),
    durationLabel: text("duration_label").notNull(),
    sortOrder: integer("sort_order").notNull(),
  },
  (t) => ({
    uniqSlug: uniqueIndex("training_modules_training_slug_idx").on(
      t.trainingId,
      t.slug,
    ),
  }),
);

export type TrainingModule = typeof trainingModules.$inferSelect;
export type NewTrainingModule = typeof trainingModules.$inferInsert;
