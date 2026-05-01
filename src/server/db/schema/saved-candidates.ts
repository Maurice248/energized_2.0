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
import { employerOrgs } from "./employer-orgs";

// Org-level shortlist of candidates. Anyone on the team can add or remove,
// and we track who added each row so the UI can show "added by …".
export const savedCandidates = pgTable(
  "saved_candidates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => employerOrgs.id, { onDelete: "cascade" }),
    candidateUserId: text("candidate_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    savedByUserId: text("saved_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    note: text("note"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    uniqueOrgCandidate: unique("saved_candidates_org_candidate_unique").on(
      t.orgId,
      t.candidateUserId,
    ),
    orgIdx: index("saved_candidates_org_idx").on(t.orgId),
  }),
);

export const savedCandidatesRelations = relations(
  savedCandidates,
  ({ one }) => ({
    org: one(employerOrgs, {
      fields: [savedCandidates.orgId],
      references: [employerOrgs.id],
    }),
    candidate: one(user, {
      fields: [savedCandidates.candidateUserId],
      references: [user.id],
    }),
    savedBy: one(user, {
      fields: [savedCandidates.savedByUserId],
      references: [user.id],
    }),
  }),
);
