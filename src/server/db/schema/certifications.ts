import { relations } from "drizzle-orm";
import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { certificationTypeEnum } from "./enums";
import { profiles } from "./profiles";

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
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("certifications_profile_id_idx").on(table.profileId)],
);

export const certificationRelations = relations(certifications, ({ one }) => ({
  profile: one(profiles, {
    fields: [certifications.profileId],
    references: [profiles.id],
  }),
}));
