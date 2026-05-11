import {
  boolean,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { skillTestAttempts } from "./skill-test-attempts";
import { testTopics } from "./test-topics";

export const skillBadges = pgTable(
  "skill_badges",
  {
    candidateId: text("candidate_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    topicId: uuid("topic_id")
      .notNull()
      .references(() => testTopics.id),
    attemptId: uuid("attempt_id")
      .notNull()
      .references(() => skillTestAttempts.id),
    isVerifiedTop: boolean("is_verified_top").notNull(),
    score: integer("score").notNull(),
    earnedAt: timestamp("earned_at").notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.candidateId, t.topicId] }),
  }),
);

export type SkillBadge = typeof skillBadges.$inferSelect;
export type NewSkillBadge = typeof skillBadges.$inferInsert;
