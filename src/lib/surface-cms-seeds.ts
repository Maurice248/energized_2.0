/**
 * System CMS rows for surfaces that already have dedicated product routes (/,
 * /jobs, /skills, /trainings). Only the seeded hero/copy slots published from
 * the DB replace static defaults; layout, filters, and data stay in code.
 */
export const SURFACE_CMS_PUBLIC_SLUGS = [
  "home",
  "jobs",
  "skills",
  "trainings",
] as const;

export type SurfaceCmsSlug = (typeof SURFACE_CMS_PUBLIC_SLUGS)[number];

/** Stable section IDs consumed by loaders (extras in admin-only JSON are ignored on site). */
export const SURFACE_SECTION_IDS = {
  defaultHero: "surface-hero",
  skillsJobseeker: "skills-jobseeker",
  skillsEmployer: "skills-employer",
  trainingsJobseeker: "trainings-jobseeker",
  trainingsEmployer: "trainings-employer",
} as const;

function jsonBody(sections: { id: string; content: string }[]): string {
  return JSON.stringify(
    sections.map((s, index) => ({
      id: s.id,
      type: "text",
      title: "",
      content: s.content,
      order: index,
    })),
  );
}

/**
 * Canonical HTML seeded as JSON sections (`body_format = html`).
 * Styled with semantic tags + ALLOWED_TAGS from sanitize — avoid raw script/style.
 */
export const SYSTEM_SURFACE_PAGE_SEEDS: Array<{
  slug: SurfaceCmsSlug;
  title: string;
  body: string;
  seoTitle: string;
  seoDescription: string;
}> = [
  {
    slug: "home",
    title: "Home — landing hero copy",
    seoTitle: "Energized — jobs in Canadian energy",
    seoDescription:
      "The specialized job network for Canada's energy sector — oil & gas, renewables, nuclear, utilities, hydrogen, power.",
    body: jsonBody([
      {
        id: SURFACE_SECTION_IDS.defaultHero,
        content: `<div class="v2-eyebrow">Est. 2026 · Calgary → National</div>
<h1 class="v2-display v2-hero-headline" style="color:var(--v2-ink-950);">Careers for<br />the <em style="font-style:italic;">energy</em><br />in motion.</h1>
<div class="v2-hero-pill-row"><span class="v2-hero-pill">AI-matched</span><span class="v2-hero-pill-note">to sector-specific expertise</span></div>
<p class="v2-hero-sub">From reservoir engineers to renewable technicians, Energized pairs Canada's skilled workforce with roles that fit — faster, fairer, with AI that actually understands sector-specific expertise.</p>`,
      },
    ]),
  },
  {
    slug: "jobs",
    title: "Jobs browse — hero copy",
    seoTitle: "Browse energy jobs — Energized",
    seoDescription:
      "Find energy-sector roles across oil & gas, renewables, nuclear, utilities, hydrogen and power on Energized.",
    body: jsonBody([
      {
        id: SURFACE_SECTION_IDS.defaultHero,
        content: `<h1 class="v2-h2" style="font-style:italic;font-weight:900;margin-bottom:20px;line-height:1.1;">
Find work that <em style="color:var(--v2-accent-deep);font-style:italic;">actually</em> fits.</h1>`,
      },
    ]),
  },
  {
    slug: "skills",
    title: "Skills assessments — hero copy",
    seoTitle: "Skill assessments — Energized",
    seoDescription:
      "Sector-specific Energized skill assessments for Canadian energy professionals and employers.",
    body: jsonBody([
      {
        id: SURFACE_SECTION_IDS.skillsJobseeker,
        content: `<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.18em;color:#64748b;">Skill assessments</div>
<h1 style="margin-top:1.5rem;font-weight:700;line-height:0.95;letter-spacing:-0.02em;font-size:clamp(2.25rem,4vw,4.75rem);">Get <strong style="font-style:italic;color:var(--brand-dark-blue, #004984);font-weight:700;"><em style="font-style:italic;font-weight:700;">verified</em></strong>.<br />One sitting. 25 minutes.</h1>
<p style="margin-top:1.5rem;max-width:36rem;font-size:1.125rem;line-height:1.625;color:#475569;">AI builds a fresh test for your sector and role — multiple choice, real scenarios, calcs. Pass and a badge lands on your profile that recruiters can filter by.</p>`,
      },
      {
        id: SURFACE_SECTION_IDS.skillsEmployer,
        content: `<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.18em;color:#64748b;">Skill assessments · proof of talent</div>
<h1 style="margin-top:1.5rem;font-weight:700;line-height:0.95;letter-spacing:-0.02em;font-size:clamp(2.25rem,4vw,4.75rem);">Hire <strong style="font-style:italic;color:var(--brand-dark-blue, #004984);font-weight:700;"><em style="font-style:italic;font-weight:700;">verified</em></strong>.<br />Not self-claimed.</h1>
<p style="margin-top:1.5rem;max-width:36rem;font-size:1.125rem;line-height:1.625;color:#475569;">Every candidate on Energized can prove what they know — same AI-built test, real scenarios, sector-specific. Filter by badge and shortlist with confidence.</p>`,
      },
    ]),
  },
  {
    slug: "trainings",
    title: "Trainings catalog — hero copy",
    seoTitle: "Trainings — Energized",
    seoDescription:
      "Self-paced training courses for Canada's energy workforce — graded by practising engineers.",
    body: jsonBody([
      {
        id: SURFACE_SECTION_IDS.trainingsJobseeker,
        content: `<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.18em;color:#64748b;">Training services · Platinum</div>
<h1 style="margin-top:1.5rem;font-weight:700;line-height:0.95;letter-spacing:-0.02em;font-size:clamp(2.25rem,3.8vw,4.25rem);">Skill up for the<br />roles that <strong style="font-style:italic;color:var(--brand-dark-blue, #004984);font-weight:700;"><em style="font-style:italic;font-weight:700;">actually pay</em></strong>.</h1>
<p style="margin-top:2.5rem;max-width:36rem;font-size:1.125rem;line-height:1.625;color:#475569;">Courses graded by working senior engineers across Canadian energy. Self-paced. Earn certificates that sit on your profile — recruiters notice.</p>`,
      },
      {
        id: SURFACE_SECTION_IDS.trainingsEmployer,
        content: `<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.18em;color:#64748b;">Training catalog · talent depth</div>
<h1 style="margin-top:1.5rem;font-weight:700;line-height:0.95;letter-spacing:-0.02em;font-size:clamp(2.25rem,3.8vw,4.25rem);">See the talent <strong style="font-style:italic;color:var(--brand-dark-blue, #004984);font-weight:700;"><em style="font-style:italic;font-weight:700;">investing</em></strong> in their skills.</h1>
<p style="margin-top:2.5rem;max-width:36rem;font-size:1.125rem;line-height:1.625;color:#475569;">Energized candidates train across live courses graded by senior engineers. Certificates show on their profile — filter by badge to shortlist with confidence.</p>`,
      },
    ]),
  },
];
