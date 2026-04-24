import { relations } from "drizzle-orm";
import {
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { employerOrgs } from "./employer-orgs";
import {
  experienceLevelEnum,
  jobStatusEnum,
  sectorEnum,
  workSetupEnum,
} from "./enums";

export type ScreeningQuestion = { q: string; required: boolean };

export const jobListings = pgTable("job_listings", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => employerOrgs.id, { onDelete: "cascade" }),
  createdByUserId: text("created_by_user_id")
    .notNull()
    .references(() => user.id),

  title: text("title"),
  sector: sectorEnum("sector"),
  subSectors: text("sub_sectors").array().notNull().default([]),
  experienceLevel: experienceLevelEnum("experience_level"),

  location: text("location"),
  workSetup: workSetupEnum("work_setup"),
  rotationSchedule: text("rotation_schedule"),
  hoursPerWeek: integer("hours_per_week"),

  salaryMin: integer("salary_min"),
  salaryMax: integer("salary_max"),
  salaryCurrency: text("salary_currency").notNull().default("CAD"),
  salaryPeriod: text("salary_period").notNull().default("year"),
  requiredCertifications: text("required_certifications")
    .array()
    .notNull()
    .default([]),
  screeningQuestions: jsonb("screening_questions")
    .$type<ScreeningQuestion[]>()
    .notNull()
    .default([]),

  summary: text("summary"),
  description: text("description"),

  status: jobStatusEnum("status").notNull().default("draft"),
  publishedAt: timestamp("published_at"),
  closedAt: timestamp("closed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const jobListingsRelations = relations(jobListings, ({ one }) => ({
  org: one(employerOrgs, {
    fields: [jobListings.orgId],
    references: [employerOrgs.id],
  }),
  createdBy: one(user, {
    fields: [jobListings.createdByUserId],
    references: [user.id],
  }),
}));
