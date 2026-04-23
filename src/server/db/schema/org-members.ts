import { relations } from "drizzle-orm";
import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { orgMemberStatusEnum, orgRoleEnum } from "./enums";
import { user } from "./auth";
import { employerOrgs } from "./employer-orgs";

export const orgMembers = pgTable(
  "org_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => employerOrgs.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: orgRoleEnum("role").notNull().default("recruiter"),
    status: orgMemberStatusEnum("status").notNull().default("pending"),
    inviteToken: text("invite_token").unique(),
    inviteExpiresAt: timestamp("invite_expires_at"),
    invitedByUserId: text("invited_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    invitedAt: timestamp("invited_at").notNull().defaultNow(),
    acceptedAt: timestamp("accepted_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("org_members_org_id_idx").on(table.orgId),
    index("org_members_user_id_idx").on(table.userId),
    uniqueIndex("org_members_org_email_unique").on(table.orgId, table.email),
  ],
);

export const orgMemberRelations = relations(orgMembers, ({ one }) => ({
  org: one(employerOrgs, {
    fields: [orgMembers.orgId],
    references: [employerOrgs.id],
  }),
  user: one(user, {
    fields: [orgMembers.userId],
    references: [user.id],
  }),
}));
