/* ---------------------------------------------------------------------------
 * Client-safe billing data (no env imports).
 *
 * All feature copy and marketing display data lives here. Server-only billing
 * logic (Stripe price IDs, env-bound config) lives in `billing-tiers.ts` and
 * imports the constants from this file for single-source-of-truth on features.
 *
 * Client components MUST import display data from here (or via the re-exports
 * in `billing-tiers.ts` from server components) to avoid pulling `env.ts` into
 * the client bundle.
 * --------------------------------------------------------------------------- */

/* ---------- Employer paid-tier delivered features ---------- */

export const PACKAGE_A_FEATURES: string[] = [
  "1 active job posting at a time",
  "1 recruiter seat",
  "Full applicant pipeline + emails",
  "Branded company profile",
  "Screening questions on the application form",
  "Standard placement on /jobs",
  "Full candidate database access",
];

export const PACKAGE_B_FEATURES: string[] = [
  "Everything in Package A",
  "2 active job postings at a time",
  "3 recruiter seats",
  "1 featured job slot per cycle (top of /jobs)",
  "Basic hiring analytics (views, conversions, time-to-hire)",
  "Enhanced company profile (header image, additional sections)",
];

export const PACKAGE_C_FEATURES: string[] = [
  "Everything in Package B",
  "3 active job postings at a time",
  "5 recruiter seats",
  "3 featured job slots per cycle",
  "Priority placement above A/B in /jobs",
  "Advanced hiring analytics (full funnel, source attribution)",
  "Premium company page (videos, perks, testimonials)",
  "Priority support",
];

/* ---------- Jobseeker paid-tier delivered features ---------- */

export const GOLD_FEATURES: string[] = [
  "AI match scoring on every role — instant fit at a glance",
  "AI cover-letter generator — drafts a tailored note from your profile + the job",
  "AI profile polish — rewrites your summary to highlight impact",
  "\"Open to work\" badge with sector preferences",
  "See which employers viewed your profile",
  "Unlimited saved searches with daily digest",
  "Featured profile — top of employer searches (coming soon)",
  "Application insights — who viewed your application, and when (coming soon)",
  "48-hour early access to new postings (coming soon)",
];

export const PLATINUM_FEATURES: string[] = [
  "Everything in Gold (incl. AI features when shipped)",
  "Cert expiry warnings in your profile",
  "Trainings library — energy-sector courses (coming soon)",
  "Cert prep & practice tests, H2S / First Aid / CSTS / P.Eng (coming soon)",
  "Renewal reminder emails before tickets expire (coming soon)",
  "Early access to new training content as it launches (coming soon)",
];

/* ---------- Free-tier delivered features (no Stripe product, no billing) ---------- */

export const JOBSEEKER_FREE_FEATURES: string[] = [
  "Unlimited applications",
  "Full profile + resume + certifications",
  "Browse all jobs with every filter",
  "Save unlimited jobs",
  "Application status tracking",
  "Email alerts for new matches",
];

export const JOBSEEKER_FREE_FUTURE_FEATURES: string[] = [
  "Featured profile",
  "Profile-views insights",
  "Trainings library",
];

export const EMPLOYER_FREE_FEATURES: string[] = [
  "Company profile (logo, description, sector tags)",
  "Browse candidate database with all filters",
  "Save candidates to a private shortlist",
  "Draft job postings (no publish, no contact)",
];

export const EMPLOYER_FREE_FUTURE_FEATURES: string[] = [
  "Publish job postings",
  "Contact candidates",
  "Applicant pipeline",
];

/* ---------- Marketing display plans ---------- */

export type DisplayPlan = {
  id: string;
  audience: "jobseeker" | "employer";
  label: string;
  tagline: string;
  priceCents: number;
  features: string[];
  futureFeatures?: string[];
  featured?: boolean;
  tag?: string;
  cta: string;
  href: string;
};

export const JOBSEEKER_DISPLAY_PLANS: DisplayPlan[] = [
  {
    id: "jobseeker_free",
    audience: "jobseeker",
    label: "Free",
    tagline: "Get on the radar",
    priceCents: 0,
    features: JOBSEEKER_FREE_FEATURES,
    futureFeatures: JOBSEEKER_FREE_FUTURE_FEATURES,
    cta: "Sign up free",
    href: "/sign-up",
  },
  {
    id: "jobseeker_gold",
    audience: "jobseeker",
    label: "Gold",
    tagline: "Get found, not just heard",
    priceCents: 5900,
    featured: true,
    tag: "Most popular",
    features: ["Everything in Free", ...GOLD_FEATURES],
    cta: "Upgrade to Gold",
    href: "/sign-up?plan=gold",
  },
  {
    id: "jobseeker_platinum",
    audience: "jobseeker",
    label: "Platinum",
    tagline: "Career partner mode",
    priceCents: 14900,
    features: PLATINUM_FEATURES,
    cta: "Get Platinum",
    href: "/sign-up?plan=platinum",
  },
];

export const EMPLOYER_DISPLAY_PLANS: DisplayPlan[] = [
  {
    id: "employer_free",
    audience: "employer",
    label: "Free",
    tagline: "Look around before you commit",
    priceCents: 0,
    features: EMPLOYER_FREE_FEATURES,
    futureFeatures: EMPLOYER_FREE_FUTURE_FEATURES,
    cta: "Create employer account",
    href: "/sign-up?role=employer",
  },
  {
    id: "package_a",
    audience: "employer",
    label: "Package A",
    tagline: "Start hiring",
    priceCents: 29900,
    features: PACKAGE_A_FEATURES,
    cta: "Choose Package A",
    href: "/sign-up?plan=package_a&role=employer",
  },
  {
    id: "package_b",
    audience: "employer",
    label: "Package B",
    tagline: "Hire across multiple roles",
    priceCents: 54900,
    featured: true,
    tag: "Most popular",
    features: PACKAGE_B_FEATURES,
    cta: "Choose Package B",
    href: "/sign-up?plan=package_b&role=employer",
  },
  {
    id: "package_c",
    audience: "employer",
    label: "Package C",
    tagline: "Scale your hiring",
    priceCents: 74900,
    features: PACKAGE_C_FEATURES,
    cta: "Choose Package C",
    href: "/sign-up?plan=package_c&role=employer",
  },
];
