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

export const companySizeEnum = pgEnum("company_size", [
  "1_10",
  "11_50",
  "51_120",
  "120_250",
  "250_500",
  "500_1000",
  "1000_plus",
]);

export const orgRoleEnum = pgEnum("org_role", [
  "owner",
  "admin",
  "recruiter",
  "hiring_manager",
  "viewer",
]);

export const orgMemberStatusEnum = pgEnum("org_member_status", [
  "active",
  "pending",
  "revoked",
]);

export const hiringPaceEnum = pgEnum("hiring_pace", [
  "passive",
  "when_right",
  "actively_hiring",
  "scaling_fast",
]);

export const workSetupEnum = pgEnum("work_setup", [
  "onsite",
  "hybrid_preferred",
  "remote_ok",
  "flexible",
]);
