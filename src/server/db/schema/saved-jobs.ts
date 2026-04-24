import { relations } from "drizzle-orm";
import {
  index,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { jobListings } from "./job-listings";

export const savedJobs = pgTable(
  "saved_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobListings.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    uniqueUserPerJob: unique("saved_jobs_job_user_unique").on(
      t.jobId,
      t.userId,
    ),
    userIdx: index("saved_jobs_user_idx").on(t.userId),
  }),
);

export const savedJobsRelations = relations(savedJobs, ({ one }) => ({
  job: one(jobListings, {
    fields: [savedJobs.jobId],
    references: [jobListings.id],
  }),
  user: one(user, {
    fields: [savedJobs.userId],
    references: [user.id],
  }),
}));
