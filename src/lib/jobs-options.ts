export type JobSector =
  | "oil_gas"
  | "renewables"
  | "nuclear"
  | "utilities"
  | "hydrogen"
  | "power"
  | "other";

export type JobWorkSetup =
  | "onsite"
  | "hybrid_preferred"
  | "remote_ok"
  | "flexible";

export type JobExperienceLevel =
  | "entry"
  | "intermediate"
  | "senior"
  | "lead"
  | "executive";

export type JobStatus = "draft" | "published" | "closed";

export const SECTOR_LABELS: Record<JobSector, string> = {
  oil_gas: "Oil & Gas",
  renewables: "Renewable Energy",
  nuclear: "Nuclear",
  utilities: "Power Utilities",
  hydrogen: "Hydrogen",
  power: "Power",
  other: "Other",
};

export const WORK_SETUP_LABELS: Record<JobWorkSetup, string> = {
  onsite: "Onsite",
  hybrid_preferred: "Hybrid preferred",
  remote_ok: "Remote OK",
  flexible: "Flexible",
};

export const EXPERIENCE_LEVEL_LABELS: Record<JobExperienceLevel, string> = {
  entry: "Entry",
  intermediate: "Intermediate",
  senior: "Senior",
  lead: "Lead",
  executive: "Executive",
};

export const ROTATION_OPTIONS: string[] = ["None", "14/7", "20/8", "7/7"];

export const HOURS_PER_WEEK_OPTIONS: number[] = [20, 30, 40, 44];

export const SALARY_CURRENCY_OPTIONS: { value: string; label: string }[] = [
  { value: "CAD", label: "CAD" },
  { value: "USD", label: "USD" },
];

export const SALARY_PERIOD_OPTIONS: { value: string; label: string }[] = [
  { value: "year", label: "per year" },
  { value: "hour", label: "per hour" },
  { value: "day", label: "per day" },
];

export const SUB_SECTOR_OPTIONS: string[] = [
  "Solar PV",
  "Wind Onshore",
  "Wind Offshore",
  "Battery Storage",
  "Hydroelectric",
  "Grid-scale",
  "Distributed",
  "Transmission",
  "Upstream",
  "Downstream",
  "Pipelines",
  "LNG",
  "CCUS",
];

export const CERTIFICATION_OPTIONS: string[] = [
  "H2S Alive",
  "First Aid",
  "CSTS",
  "Red Seal",
  "P.Eng",
  "NACE",
  "Fall Protection",
];

export function formatSalary(
  min: number | null,
  max: number | null,
  currency: string | null,
  period: string | null,
): string {
  if (min == null && max == null) return "Salary TBD";
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: (currency ?? "CAD").toUpperCase(),
      maximumFractionDigits: 0,
    }).format(n);
  const per = period === "hour" ? "/hr" : period === "day" ? "/day" : "/yr";
  if (min != null && max != null) return `${fmt(min)} – ${fmt(max)}${per}`;
  return `${fmt((min ?? max) as number)}${per}`;
}
