import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import {
  availabilityEnum,
  remotePreferenceEnum,
  sectorEnum,
} from "./enums";
import { user } from "./auth";
import { certifications } from "./certifications";
import { workHistory } from "./work-history";

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  headline: text("headline"),
  summary: text("summary"),
  phone: text("phone"),
  yearsExperience: integer("years_experience"),
  sectors: sectorEnum("sectors").array().notNull().default([]),
  willingToRelocate: boolean("willing_to_relocate").notNull().default(false),
  remotePreference: remotePreferenceEnum("remote_preference"),
  location: text("location"),
  resumeUrl: text("resume_url"),
  resumeFilename: text("resume_filename"),
  resumeUploadedAt: timestamp("resume_uploaded_at"),
  skills: text("skills").array().notNull().default([]),
  openToWork: boolean("open_to_work").notNull().default(true),
  fifoRotational: boolean("fifo_rotational").notNull().default(false),
  minCompCad: integer("min_comp_cad"),
  availability: availabilityEnum("availability"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const profileRelations = relations(profiles, ({ one, many }) => ({
  user: one(user, {
    fields: [profiles.userId],
    references: [user.id],
  }),
  certifications: many(certifications),
  workHistory: many(workHistory),
}));
