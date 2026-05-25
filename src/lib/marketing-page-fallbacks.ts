/**
 * Single source of truth for the seven "system" marketing pages that admins
 * can edit from /admin/pages.
 *
 * - The router seeds rows in the `pages` table from these entries.
 * - Each static marketing route (src/app/(marketing)/<slug>/page.tsx) renders
 *   from the CMS row when it's `published`, otherwise falls back to the
 *   `title` + `body` defined here. This keeps the public site safe even if a
 *   migration or seed hasn't run yet.
 *
 * To add a new system marketing page: add an entry here, create the matching
 * route at `src/app/(marketing)/<slug>/page.tsx` that calls
 * `<CmsMarketingPage />`, and add the slug to MARKETING_STATIC_SLUGS in
 * `src/server/api/routers/admin-pages.ts`.
 */
export type MarketingPageFallback = {
  slug:
    | "about"
    | "for-seekers"
    | "for-employers"
    | "privacy"
    | "terms"
    | "contact"
    | "accessibility";
  eyebrow: string;
  title: string;
  body: string;
  seoTitle: string;
  seoDescription: string;
};

export const MARKETING_PAGE_FALLBACKS: MarketingPageFallback[] = [
  {
    slug: "about",
    eyebrow: "About Energized",
    title: "The job network for Canada's energy transition",
    seoTitle: "About",
    seoDescription:
      "The job network for Canada's energy transition — from reservoirs to renewables, from junior techs to senior P.Engs.",
    body: `Energized is the specialised hiring layer for everything that powers Canada — oil & gas, renewables, nuclear, utilities, hydrogen, and power. We connect energy professionals with employers who actually need their tickets, projects, and field experience.

## Why we exist

Generalist job boards bury specialised energy experience under unrelated noise. Hiring managers waste time filtering unqualified applicants. Energy professionals can't surface the credentials that actually matter — H2S Alive, First Aid, CSTS, Red Seal, P.Eng, NACE.

We built Energized so the substance of your work — projects, sites, commodities, rotations — sits at the centre of every match.

## What we believe

- Salary transparency by default.
- Tickets and certifications are first-class data, not free-text noise.
- AI-matched roles, not keyword spam.
- Canadian energy hiring deserves Canadian-built infrastructure.

_Edit this page from the admin **Pages** section._
`,
  },
  {
    slug: "for-seekers",
    eyebrow: "For job seekers",
    title: "Canadian energy careers, surfaced properly",
    seoTitle: "For job seekers — Canadian energy careers",
    seoDescription:
      "Specialised matching for Canadian energy professionals — oil & gas, renewables, nuclear, utilities, hydrogen, power. Free forever for job seekers.",
    body: `A specialised profile surface that showcases your energy-specific credentials and the projects that prove you can do the work.

## What you get

- **AI-matched roles, not keyword spam.** Our match engine reads the substance of your work — projects, certifications, the actual systems you ran — not just job titles.
- **Salary transparency by default.** Every published role posts a band. No hide-the-number games — you know what you're walking into before you apply.
- **Tickets that surface.** H2S Alive, First Aid, CSTS, Red Seal, P.Eng, NACE — the credentials that actually decide a hire are first-class on your profile.
- **Free forever.** Job seekers never pay.

_Edit this page from the admin **Pages** section._
`,
  },
  {
    slug: "for-employers",
    eyebrow: "For employers",
    title: "Hire Canadian energy specialists, faster",
    seoTitle: "For employers — hire Canadian energy specialists",
    seoDescription:
      "AI-ranked shortlists of Canadian energy professionals — oil & gas, renewables, nuclear, utilities, hydrogen, power. Built for Canadian energy hiring teams.",
    body: `A curated pool of energy professionals with structured filters by sector, ticket, rotation, location, and clearance — plus recruiter tooling that doesn't waste hiring-manager time.

## What you get

- **Energy-aware posting templates.** Capture sector, certifications required, salary band, work setup, and experience level as first-class fields.
- **AI-ranked shortlists.** We score and explain every candidate against your role, with the H2S, CSTS, rotation, and salary checks already done.
- **Recruiter seats.** Bring your hiring managers and external recruiters into the same pipeline.
- **Verified credentials.** We verify the certifications and licences that matter, so you don't have to.

_Edit this page from the admin **Pages** section._
`,
  },
  {
    slug: "privacy",
    eyebrow: "Legal",
    title: "Privacy policy",
    seoTitle: "Privacy",
    seoDescription: "How Energized handles your personal data.",
    body: `This page describes how Energized collects, uses, and protects your personal information.

We're drafting our full policy. In the meantime, reach us at **dev@energized.biz** with any privacy questions.

_Edit this page from the admin **Pages** section._
`,
  },
  {
    slug: "terms",
    eyebrow: "Legal",
    title: "Terms of service",
    seoTitle: "Terms",
    seoDescription: "Energized terms of service.",
    body: `These are the terms under which Energized provides its services.

We're drafting our full terms of service. In the meantime, reach us at **dev@energized.biz** with any questions about using Energized.

_Edit this page from the admin **Pages** section._
`,
  },
  {
    slug: "contact",
    eyebrow: "Get in touch",
    title: "Contact us",
    seoTitle: "Contact",
    seoDescription:
      "Get in touch with the Energized team — we read every message and reply within one business day.",
    body: `Whether you're hiring fifty wind techs in Halifax or wondering why your match score moved — **we read every message that comes in.** We reply within one business day.

## Reach us

- Email: **dev@energized.biz**
- Reply time: under one business day
- Languages: English

_Edit this page from the admin **Pages** section._
`,
  },
  {
    slug: "accessibility",
    eyebrow: "Accessibility",
    title: "Accessibility commitment",
    seoTitle: "Accessibility",
    seoDescription: "Our commitment to an accessible energy job network.",
    body: `Energized is committed to a job network that everyone can use, regardless of ability.

If you run into a barrier on the site, please write us at **dev@energized.biz** and we'll fix it.

_Edit this page from the admin **Pages** section._
`,
  },
];

const FALLBACK_BY_SLUG = new Map(
  MARKETING_PAGE_FALLBACKS.map((f) => [f.slug, f] as const),
);

export function getMarketingFallback(
  slug: MarketingPageFallback["slug"],
): MarketingPageFallback {
  const f = FALLBACK_BY_SLUG.get(slug);
  if (!f) {
    throw new Error(`Unknown marketing fallback slug: ${slug}`);
  }
  return f;
}
