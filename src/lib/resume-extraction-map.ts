/** Shared resume autofill enums + mapping (kept in sync with profile router / DB). */

export const RESUME_SECTOR_VALUES = [
  "oil_gas",
  "renewables",
  "nuclear",
  "utilities",
  "hydrogen",
  "power",
  "other",
] as const;

export type ResumeSectorValue = (typeof RESUME_SECTOR_VALUES)[number];

export const RESUME_CERT_TYPE_VALUES = [
  "h2s_alive",
  "first_aid",
  "csts",
  "red_seal",
  "p_eng",
  "nace",
  "fall_protection",
  "other",
] as const;

export type ResumeCertTypeValue = (typeof RESUME_CERT_TYPE_VALUES)[number];

const SECTOR_SET = new Set<string>(RESUME_SECTOR_VALUES);

export function normalizeSectorFromAi(raw: string | null | undefined): ResumeSectorValue | null {
  if (!raw?.trim()) return null;
  const compact = raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/&/g, "")
    .replace(/-/g, "_");
  if (SECTOR_SET.has(compact)) return compact as ResumeSectorValue;
  const alias = new Map<string, ResumeSectorValue>([
    ["oil", "oil_gas"],
    ["gas", "oil_gas"],
    ["petroleum", "oil_gas"],
    ["o_g", "oil_gas"],
    ["oilandgas", "oil_gas"],
    ["sands", "oil_gas"],
    ["oilsands", "oil_gas"],
    ["lng", "oil_gas"],
    ["midstream", "oil_gas"],
    ["upstream", "oil_gas"],
    ["downstream", "oil_gas"],
    ["wind", "renewables"],
    ["solar", "renewables"],
    ["geothermal", "renewables"],
    ["hydro", "renewables"],
    ["storage", "renewables"],
    ["utility", "utilities"],
    ["utility_power", "utilities"],
    ["transmission", "utilities"],
    ["distribution", "utilities"],
    ["gen", "power"],
    ["generation", "power"],
  ]);
  return alias.get(compact) ?? null;
}

export function mapCertificationTypeFromAi(
  typeHint: string | null | undefined,
  name: string,
): ResumeCertTypeValue {
  const blob = `${typeHint ?? ""} ${name}`.toLowerCase();
  if (/\bh2s\b|h2s\s*alive|hydrogen\s*sulphide/.test(blob)) return "h2s_alive";
  if (
    /\bfirst\s*aid\b|\bcpr\b|emergency\s*first\s*aid|standard\s*first\s*aid/.test(blob)
  ) {
    return "first_aid";
  }
  if (/\bcsts\b|construction\s*safety|corsti/.test(blob)) return "csts";
  if (/\bred\s*seal\b|\bjourneyperson\b/.test(blob)) return "red_seal";
  if (/\bp\.?\s*eng\b|professional\s*engineer|ingénieur/.test(blob)) return "p_eng";
  if (/\bnace\b|cathodic|coatings\s*inspector/.test(blob)) return "nace";
  if (/fall\s*protection|working\s*at\s*heights|worksite\s*at\s*heights/.test(blob)) {
    return "fall_protection";
  }
  return "other";
}

/** Parse AI / form date strings to YYYY-MM-DD for `<input type="date">`. */
export function flexParseToIsoDate(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const t = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  if (/^\d{4}-\d{2}$/.test(t)) return `${t}-01`;
  if (/^\d{4}$/.test(t)) return `${t}-01-01`;
  const d = new Date(t);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

export function normalizeYear(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const y = raw.trim();
  return /^\d{4}$/.test(y) ? y : null;
}

export type ResumeAutofillDraftWorkRow = {
  employerName: string;
  roleTitle: string;
  site: string | null;
  sector: ResumeSectorValue | null;
  commodity: string | null;
  rotation: string | null;
  summary: string | null;
  skills: string[];
  startedAt: string;
  endedAt: string | null;
};

export type ResumeAutofillDraftEducationRow = {
  school: string;
  degree: string | null;
  startedYear: string | null;
  endedYear: string | null;
  details: string | null;
};

export type ResumeAutofillDraftCertRow = {
  type: ResumeCertTypeValue;
  name: string;
  issuer: string | null;
  issuedAt: string | null;
  expiresAt: string | null;
};

export type ResumeAutofillDraft = {
  workHistory: ResumeAutofillDraftWorkRow[];
  education: ResumeAutofillDraftEducationRow[];
  certifications: ResumeAutofillDraftCertRow[];
  coreSkills: string[];
};
