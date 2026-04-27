import { relations } from "drizzle-orm";
import {
  boolean,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import {
  companySizeEnum,
  hiringPaceEnum,
  sectorEnum,
  subscriptionStatusEnum,
  workSetupEnum,
} from "./enums";
import { orgMembers } from "./org-members";

export const employerOrgs = pgTable("employer_orgs", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  domain: text("domain"),
  website: text("website"),
  hq: text("hq"),
  founded: text("founded"),
  tagline: text("tagline"),
  about: text("about"),
  logoUrl: text("logo_url"),
  logoColor: text("logo_color").notNull().default("#FF7A59"),
  coverUrl: text("cover_url"),
  size: companySizeEnum("size"),
  primarySector: sectorEnum("primary_sector"),
  subSectors: text("sub_sectors").array().notNull().default([]),
  verified: boolean("verified").notNull().default(false),
  verifiedAt: timestamp("verified_at"),
  verificationToken: text("verification_token"),
  domainVerifyEmailToken: text("domain_verify_email_token").unique(),
  domainVerifyEmailTo: text("domain_verify_email_to"),
  domainVerifyEmailSentAt: timestamp("domain_verify_email_sent_at"),
  domainVerifyExpiresAt: timestamp("domain_verify_expires_at"),
  // plan repurposed: "none" | "package_a" | "package_b" | "package_c"
  plan: text("plan").notNull().default("none"),
  // planRenewsAt repurposed as Stripe current_period_end
  planRenewsAt: timestamp("plan_renews_at"),
  stripeCustomerId: text("stripe_customer_id").unique(),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionStatus: subscriptionStatusEnum("subscription_status")
    .notNull()
    .default("none"),
  currentPeriodStart: timestamp("current_period_start"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  cancellationDisposition: text("cancellation_disposition"),
  defaultWorkSetup: workSetupEnum("default_work_setup"),
  hiringPace: hiringPaceEnum("hiring_pace"),
  focusRoles: text("focus_roles").array().notNull().default([]),
  autoMatch: boolean("auto_match").notNull().default(true),
  prioritizeDiverse: boolean("prioritize_diverse").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const employerOrgRelations = relations(employerOrgs, ({ many }) => ({
  members: many(orgMembers),
}));
