import { relations } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { jobListings } from "./job-listings";
import { applicationStatusEnum } from "./enums";

export type ScreeningAnswer = { q: string; a: string; required: boolean };

export const applications = pgTable(
  "applications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobListings.id, { onDelete: "cascade" }),
    candidateId: text("candidate_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    coverNote: text("cover_note"),
    screeningAnswers: jsonb("screening_answers")
      .$type<ScreeningAnswer[]>()
      .notNull()
      .default([]),
    status: applicationStatusEnum("status").notNull().default("submitted"),
    // Set on every employer-side detail-page view of this application.
    // Surfaced to Gold candidates as "Last viewed by employer Xh ago".
    lastViewedByEmployerAt: timestamp("last_viewed_by_employer_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    uniqueCandidatePerJob: unique("applications_job_candidate_unique").on(
      t.jobId,
      t.candidateId,
    ),
    jobIdx: index("applications_job_idx").on(t.jobId),
    candidateIdx: index("applications_candidate_idx").on(t.candidateId),
  }),
);

export const applicationsRelations = relations(applications, ({ one }) => ({
  job: one(jobListings, {
    fields: [applications.jobId],
    references: [jobListings.id],
  }),
  candidate: one(user, {
    fields: [applications.candidateId],
    references: [user.id],
  }),
}));
