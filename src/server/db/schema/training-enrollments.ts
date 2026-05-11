import {
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { trainings } from "./trainings";

export const trainingEnrollmentStatusEnum = pgEnum(
  "training_enrollment_status",
  ["enrolled", "in_progress", "completed"],
);

export type LessonProgress = {
  completedAt: string;
  score?: number;
};

export type EnrollmentProgress = Record<string, LessonProgress>;

export const trainingEnrollments = pgTable(
  "training_enrollments",
  {
    id: uuid("id").notNull().defaultRandom(),
    candidateId: text("candidate_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    trainingId: uuid("training_id")
      .notNull()
      .references(() => trainings.id),
    status: trainingEnrollmentStatusEnum("status").notNull().default("enrolled"),
    progressJson: jsonb("progress_json")
      .$type<EnrollmentProgress>()
      .notNull()
      .default({}),
    enrolledAt: timestamp("enrolled_at").notNull().defaultNow(),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    finalScore: integer("final_score"),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.candidateId, t.trainingId] }),
  }),
);

export type TrainingEnrollment = typeof trainingEnrollments.$inferSelect;
export type NewTrainingEnrollment = typeof trainingEnrollments.$inferInsert;
