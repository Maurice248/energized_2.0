import { relations } from "drizzle-orm";
import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { employerOrgs } from "./employer-orgs";

export const introRequestStatusEnum = pgEnum("intro_request_status", [
  "pending",
  "accepted",
  "declined",
  "canceled",
  "expired",
]);

export const introRequests = pgTable(
  "intro_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => employerOrgs.id, { onDelete: "cascade" }),
    candidateUserId: text("candidate_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    requestedByUserId: text("requested_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    message: text("message"),
    status: introRequestStatusEnum("status").notNull().default("pending"),
    acceptedAt: timestamp("accepted_at"),
    declinedAt: timestamp("declined_at"),
    canceledAt: timestamp("canceled_at"),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    orgCandidateStatusIdx: index("intro_requests_org_candidate_status_idx").on(
      t.orgId,
      t.candidateUserId,
      t.status,
    ),
    candidateStatusCreatedIdx: index(
      "intro_requests_candidate_status_created_idx",
    ).on(t.candidateUserId, t.status, t.createdAt),
    orgStatusCreatedIdx: index("intro_requests_org_status_created_idx").on(
      t.orgId,
      t.status,
      t.createdAt,
    ),
    statusExpiresIdx: index("intro_requests_status_expires_idx").on(
      t.status,
      t.expiresAt,
    ),
  }),
);

export const introRequestsRelations = relations(introRequests, ({ one }) => ({
  org: one(employerOrgs, {
    fields: [introRequests.orgId],
    references: [employerOrgs.id],
  }),
  candidate: one(user, {
    fields: [introRequests.candidateUserId],
    references: [user.id],
  }),
  requestedBy: one(user, {
    fields: [introRequests.requestedByUserId],
    references: [user.id],
  }),
}));
