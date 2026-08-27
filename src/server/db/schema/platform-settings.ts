import { sql } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import type { SiteFooterContent } from "@/lib/site-footer";

/** Persisted row for /admin/settings (Greenopia-style hub); secrets stay in env. */
export type PlatformSocialLink = {
  id: string;
  name: string;
  url: string;
  icon: string;
  order: number;
  isActive: boolean;
};

export const platformSettings = pgTable("platform_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  siteName: text("site_name").notNull().default("Energized"),
  siteDescription: text("site_description"),
  siteEmail: text("site_email"),
  sitePhone: text("site_phone"),
  siteAddress: text("site_address"),
  siteLogo: text("site_logo"),
  siteFavicon: text("site_favicon"),
  maintenanceMode: boolean("maintenance_mode").notNull().default(false),
  allowRegistration: boolean("allow_registration").notNull().default(true),
  requireEmailVerification: boolean("require_email_verification").notNull().default(true),
  passwordMinLength: integer("password_min_length").notNull().default(8),
  sessionTimeoutHours: integer("session_timeout_hours").notNull().default(24),
  maxLoginAttempts: integer("max_login_attempts").notNull().default(5),
  lockoutDurationMinutes: integer("lockout_duration_minutes").notNull().default(30),
  emailFromName: text("email_from_name"),
  emailFromAddress: text("email_from_address"),
  emailReplyTo: text("email_reply_to"),
  adminNotificationEmail: text("admin_notification_email"),
  enableSms: boolean("enable_sms").notNull().default(false),
  googleAnalyticsId: text("google_analytics_id"),
  stripePublishableKey: text("stripe_publishable_key"),
  socialLinks: jsonb("social_links")
    .$type<PlatformSocialLink[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  footer: jsonb("footer").$type<SiteFooterContent>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type PlatformSettingsRow = typeof platformSettings.$inferSelect;
