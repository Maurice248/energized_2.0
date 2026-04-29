// Shared application-stage taxonomy. STAGE_FROM_DB and STAGE_LABEL are surface-agnostic.
// STAGE_STEP / STAGE_TOTAL are specific to the jobseeker pipeline progress bar — employer
// surfaces should define their own column ordering.

import type { applicationStatusEnum } from "@/server/db/schema/enums";

export type ApplicationStatus = (typeof applicationStatusEnum.enumValues)[number];

export type StageKey =
  | "applied"
  | "review"
  | "interview"
  | "offer"
  | "rejected";

export const STAGE_FROM_DB: Record<ApplicationStatus, StageKey> = {
  submitted: "applied",
  reviewed: "review",
  interview: "interview",
  offer: "offer",
  rejected: "rejected",
};

export const STAGE_LABEL: Record<StageKey, string> = {
  applied: "Applied",
  review: "Under review",
  interview: "Interview",
  offer: "Offer received",
  rejected: "Not selected",
};

export const STAGE_STEP: Record<StageKey, number> = {
  applied: 1,
  review: 2,
  interview: 3,
  offer: 5,
  rejected: 2,
};

export const STAGE_TOTAL = 5;
