import {
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { trainingModules } from "./training-modules";

export const trainingLessonKindEnum = pgEnum("training_lesson_kind", [
  "video",
  "practice",
  "quiz",
]);

export type QuizQuestion = {
  id: string;
  prompt: string;
  options: [string, string, string, string];
  correctIdx: 0 | 1 | 2 | 3;
  explanation?: string;
};

export const trainingLessons = pgTable(
  "training_lessons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    moduleId: uuid("module_id")
      .notNull()
      .references(() => trainingModules.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    kind: trainingLessonKindEnum("kind").notNull(),
    durationLabel: text("duration_label").notNull(),
    videoUrl: text("video_url"),
    videoProvider: text("video_provider"),
    practiceMarkdown: text("practice_markdown"),
    quizQuestionsJson: jsonb("quiz_questions_json").$type<QuizQuestion[]>(),
    quizPassThreshold: integer("quiz_pass_threshold"),
    sortOrder: integer("sort_order").notNull(),
  },
  (t) => ({
    uniqSlug: uniqueIndex("training_lessons_module_slug_idx").on(
      t.moduleId,
      t.slug,
    ),
  }),
);

export type TrainingLesson = typeof trainingLessons.$inferSelect;
export type NewTrainingLesson = typeof trainingLessons.$inferInsert;
