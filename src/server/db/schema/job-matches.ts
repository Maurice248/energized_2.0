import { relations } from "drizzle-orm";
import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { jobListings } from "./job-listings";

export const jobMatches = pgTable(
  "job_matches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobListings.id, { onDelete: "cascade" }),
    candidateId: text("candidate_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    score: integer("score").notNull(),
    reason: text("reason").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    uniqueJobCandidate: unique("job_matches_job_candidate_unique").on(
      t.jobId,
      t.candidateId,
    ),
    candidateIdx: index("job_matches_candidate_idx").on(t.candidateId),
  }),
);

export const jobMatchesRelations = relations(jobMatches, ({ one }) => ({
  job: one(jobListings, {
    fields: [jobMatches.jobId],
    references: [jobListings.id],
  }),
  candidate: one(user, {
    fields: [jobMatches.candidateId],
    references: [user.id],
  }),
}));
