import { z } from "zod";

export const SECTOR_LABELS = [
  "Oil & Gas",
  "Renewable Energy",
  "Midstream",
  "Power Utilities",
  "Nuclear",
  "Mining",
] as const;

export type SectorLabel = (typeof SECTOR_LABELS)[number];

export const LEVEL_LABELS = [
  "Apprentice / 0–2y",
  "Mid / 3–6y",
  "Senior / 7–12y",
  "Lead / 13+y",
] as const;

export type LevelLabel = (typeof LEVEL_LABELS)[number];

export type EnergySector =
  | "oil_gas"
  | "renewables"
  | "nuclear"
  | "utilities"
  | "hydrogen"
  | "power";

// Midstream and Mining don't map cleanly to the current enum; bucket them into
// the closest sector we do model. Revisit when those get first-class enum values.
const SECTOR_TO_ENUM: Record<SectorLabel, EnergySector> = {
  "Oil & Gas": "oil_gas",
  "Renewable Energy": "renewables",
  Midstream: "oil_gas",
  "Power Utilities": "power",
  Nuclear: "nuclear",
  Mining: "utilities",
};

const LEVEL_TO_YEARS: Record<LevelLabel, number> = {
  "Apprentice / 0–2y": 1,
  "Mid / 3–6y": 4,
  "Senior / 7–12y": 9,
  "Lead / 13+y": 15,
};

export function sectorLabelToEnum(label: string): EnergySector | null {
  return (SECTOR_TO_ENUM as Record<string, EnergySector | undefined>)[label] ?? null;
}

export function levelLabelToYears(label: string): number | null {
  return (LEVEL_TO_YEARS as Record<string, number | undefined>)[label] ?? null;
}

export type CompanySizeEnum =
  | "1_10"
  | "11_50"
  | "51_120"
  | "120_250"
  | "250_500"
  | "500_1000"
  | "1000_plus";

export const COMPANY_SIZE_LABELS = [
  "1–10",
  "11–50",
  "51–120",
  "120–250",
  "250–500",
  "500–1000",
  "1000+",
] as const;

const COMPANY_SIZE_TO_ENUM: Record<string, CompanySizeEnum> = {
  "1–10": "1_10",
  "11–50": "11_50",
  "51–120": "51_120",
  "120–250": "120_250",
  "250–500": "250_500",
  "500–1000": "500_1000",
  "1000+": "1000_plus",
};

export function companySizeLabelToEnum(
  label: string | null | undefined,
): CompanySizeEnum | null {
  if (!label) return null;
  return COMPANY_SIZE_TO_ENUM[label] ?? null;
}

const jobseekerDraft = z.object({
  role: z.literal("jobseeker"),
  sector: z.string().nullable(),
  level: z.string().nullable(),
  skills: z.array(z.string()).max(6),
  plan: z.enum(["free", "pro", "placement"]),
});

const employerDraft = z.object({
  role: z.literal("employer"),
  company: z.string(),
  companySize: z.string().nullable(),
  hiringSectors: z.array(z.string()),
  location: z.string(),
  plan: z.enum(["starter", "growth", "scale"]),
});

export const onboardingDraftSchema = z.discriminatedUnion("role", [
  jobseekerDraft,
  employerDraft,
]);

export type OnboardingDraft = z.infer<typeof onboardingDraftSchema>;

export const ONBOARDING_DRAFT_KEY = "energized:onboarding-draft";
export const ONBOARDING_DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

export type StoredDraft = {
  savedAt: number;
  forUserEmail: string;
  draft: OnboardingDraft;
};
