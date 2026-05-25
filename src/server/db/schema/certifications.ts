import { relations } from "drizzle-orm";
import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import {
  certificationTypeEnum,
  certificationVerificationStatusEnum,
} from "./enums";
import { profiles } from "./profiles";
import { user } from "./auth";

export const certifications = pgTable(
  "certifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    type: certificationTypeEnum("type").notNull(),
    name: text("name").notNull(),
    issuer: text("issuer"),
    credentialId: text("credential_id"),
    issuedAt: timestamp("issued_at"),
    expiresAt: timestamp("expires_at"),
    documentUrl: text("document_url"),
    verificationStatus: certificationVerificationStatusEnum("verification_status")
      .notNull()
      .default("pending"),
    verifiedBy: text("verified_by").references(() => user.id, {
      onDelete: "set null",
    }),
    verifiedAt: timestamp("verified_at"),
    verificationNote: text("verification_note"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("certifications_profile_id_idx").on(table.profileId),
    index("certifications_verification_status_idx").on(table.verificationStatus),
  ],
);

export const certificationRelations = relations(certifications, ({ one }) => ({
  profile: one(profiles, {
    fields: [certifications.profileId],
    references: [profiles.id],
  }),
  reviewer: one(user, {
    fields: [certifications.verifiedBy],
    references: [user.id],
  }),
}));
