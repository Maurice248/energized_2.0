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
import { user } from "./auth";
import { testTopics } from "./test-topics";

export const skillAttemptStatusEnum = pgEnum("skill_attempt_status", [
  "in_progress",
  "passed",
  "passed_top",
  "failed",
  "forfeited",
]);

export type SkillTestQuestion = {
  id: string;
  prompt: string;
  context: string | null;
  options: [string, string, string, string];
  correctIdx: 0 | 1 | 2 | 3;
  tags: string[];
  tagKind: "scenario" | "calc" | null;
};

export type CategoryBreakdown = Array<{
  cat: string;
  right: number;
  total: number;
  pct: number;
}>;

export const skillTestAttempts = pgTable("skill_test_attempts", {
  id: uuid("id").primaryKey().defaultRandom(),
  candidateId: text("candidate_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  topicId: uuid("topic_id")
    .notNull()
    .references(() => testTopics.id),
  status: skillAttemptStatusEnum("status").notNull().default("in_progress"),
  level: text("level").notNull(),
  questionCount: integer("question_count").notNull(),
  includeScenarios: boolean("include_scenarios").notNull().default(true),
  includeCalc: boolean("include_calc").notNull().default(true),
  questionsJson: jsonb("questions_json").$type<SkillTestQuestion[]>().notNull(),
  answersJson: jsonb("answers_json").$type<Record<string, number>>(),
  score: integer("score"),
  correctCount: integer("correct_count"),
  categoryBreakdown: jsonb("category_breakdown").$type<CategoryBreakdown>(),
  aiFeedback: text("ai_feedback"),
  generationModel: text("generation_model"),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  finishedAt: timestamp("finished_at"),
});

export type SkillTestAttempt = typeof skillTestAttempts.$inferSelect;
export type NewSkillTestAttempt = typeof skillTestAttempts.$inferInsert;
