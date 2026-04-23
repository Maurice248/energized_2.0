import { pgEnum } from "drizzle-orm/pg-core";

export const sectorEnum = pgEnum("energy_sector", [
  "oil_gas",
  "renewables",
  "nuclear",
  "utilities",
  "hydrogen",
  "power",
  "other",
]);

export const userRoleEnum = pgEnum("user_role", [
  "jobseeker",
  "employer",
  "recruiter",
  "admin",
]);

export const remotePreferenceEnum = pgEnum("remote_preference", [
  "on_site",
  "hybrid",
  "remote",
  "flexible",
]);

export const availabilityEnum = pgEnum("availability", [
  "immediately",
  "notice_2w",
  "notice_4w",
  "notice_3m",
  "browsing",
]);

export const certificationTypeEnum = pgEnum("certification_type", [
  "h2s_alive",
  "first_aid",
  "csts",
  "red_seal",
  "p_eng",
  "nace",
  "fall_protection",
  "other",
]);
