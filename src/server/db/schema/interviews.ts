import { relations } from "drizzle-orm";
import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { applications } from "./applications";
import { user } from "./auth";

export const interviewMediumEnum = pgEnum("interview_medium", [
  "video",
  "phone",
  "in_person",
]);

export const interviewStatusEnum = pgEnum("interview_status", [
  "proposed",
  "confirmed",
  "canceled",
  "expired",
  "completed",
]);

export const interviews = pgTable(
  "interviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    proposedById: text("proposed_by_id").references(() => user.id, {
      onDelete: "set null",
    }),
    medium: interviewMediumEnum("medium").notNull(),
    details: text("details").notNull(),
    durationMin: integer("duration_min").notNull().default(60),
    notes: text("notes"),
    status: interviewStatusEnum("status").notNull().default("proposed"),
    cancelReason: text("cancel_reason"),
    canceledById: text("canceled_by_id").references(() => user.id, {
      onDelete: "set null",
    }),
    confirmedSlotId: uuid("confirmed_slot_id"),
    expiresAt: timestamp("expires_at").notNull(),
    remindedAt: timestamp("reminded_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    applicationStatusIdx: index("interviews_application_status_idx").on(
      t.applicationId,
      t.status,
    ),
    statusExpiresIdx: index("interviews_status_expires_idx").on(
      t.status,
      t.expiresAt,
    ),
    statusRemindedIdx: index("interviews_status_reminded_idx").on(
      t.status,
      t.remindedAt,
    ),
  }),
);

export const interviewSlots = pgTable(
  "interview_slots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    interviewId: uuid("interview_id")
      .notNull()
      .references(() => interviews.id, { onDelete: "cascade" }),
    startsAt: timestamp("starts_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    interviewIdx: index("interview_slots_interview_idx").on(t.interviewId),
    startsAtIdx: index("interview_slots_starts_at_idx").on(t.startsAt),
  }),
);

export const interviewsRelations = relations(interviews, ({ one, many }) => ({
  application: one(applications, {
    fields: [interviews.applicationId],
    references: [applications.id],
  }),
  proposedBy: one(user, {
    fields: [interviews.proposedById],
    references: [user.id],
  }),
  canceledBy: one(user, {
    fields: [interviews.canceledById],
    references: [user.id],
  }),
  slots: many(interviewSlots),
}));

export const interviewSlotsRelations = relations(interviewSlots, ({ one }) => ({
  interview: one(interviews, {
    fields: [interviewSlots.interviewId],
    references: [interviews.id],
  }),
}));
