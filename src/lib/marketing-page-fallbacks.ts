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
- Canadian energy hiring deserves Canadian-built infrastructure.`,
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
- **Free forever.** Job seekers never pay.`,
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
- **Verified credentials.** We verify the certifications and licences that matter, so you don't have to.`,
  },
  {
    slug: "privacy",
    eyebrow: "Legal",
    title: "Privacy policy",
    seoTitle: "Privacy policy",
    seoDescription:
      "How Energized collects, uses, discloses, and protects personal information for Canadian energy job seekers and employers.",
    body: `Energized (“Energized”, “we”, “our”, or “us”) values your privacy and is committed to protecting your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your data when you use our web platform and related services (collectively, the “Services”).

Last updated: 25 August 2026.

## 1. Information We Collect

We collect personal and professional information necessary to operate a specialised job network for Canada’s energy sector. This includes:

- Identification and contact details (e.g. name, email, phone number, location)
- Account credentials, role (job seeker, employer, recruiter, or admin), and communication logs
- Professional profile data (headline, summary, skills, sectors, years of experience, availability, compensation expectations, rotation and relocation preferences)
- Work history, education, certifications and tickets (including uploaded credential scans)
- Resumes, profile photos, and company logos
- Job applications, cover notes, screening answers, interviews, intro requests, saved jobs, and saved searches
- Skill-assessment attempts and results, and training progress
- Employer organisation details, job postings, pipeline notes, and team membership
- Billing and payment information needed to process subscriptions (handled by our payment processor)
- Technical data such as IP address, browser or device information, and usage analytics

## 2. How We Use Your Information

We use your information to:

- Create and manage accounts, profiles, job postings, and applications
- Match job seekers with roles and help employers shortlist qualified candidates
- Verify certifications and employer organisations
- Generate AI-assisted match scores, profile polish, cover notes, screening questions, and skill assessments
- Schedule interviews, send notifications, and deliver saved-search digests
- Process payments and manage subscriptions
- Improve our services, keep the platform secure, and comply with legal obligations

## 3. Data Sharing and Disclosure

We only share your data when necessary, including with:

- Employers and recruiters involved in your application, or who search the candidate pool when your profile is visible
- Payment processors (for secure subscription billing)
- Email, analytics, AI, hosting, and file-storage providers that process data on our behalf to run the Services
- Legal authorities, if required by law or court order

We do not sell or rent personal information to third parties.

## 4. Data Storage and Security

Data is encrypted in transit. Files such as resumes, certification scans, and logos are stored in secured cloud storage, and access is limited to authorised personnel and, where relevant, verified employers reviewing an application or a visible candidate profile. We retain records only as long as necessary for legal or operational purposes (for example, application history an employer may need to keep), after which they are deleted or anonymised.

## 5. Cookies and Tracking

Energized uses cookies and analytics tools to keep you signed in, enhance user experience, and monitor platform performance. You may manage cookie preferences in your browser settings. No third-party advertising cookies are used for targeted marketing without consent.

## 6. AI and Automated Scoring

Our AI-powered features analyse profile and job data (experience, tickets, sector, location, and related signals) to generate match scores, draft profile copy or cover notes, extract resume details, suggest screening questions, and support skill assessments. We instruct these systems not to use protected characteristics (such as age, gender, family status, disability, religion, race, or nationality) as scoring factors.

Automated outputs are reviewed periodically for fairness and compliance with the Canadian Human Rights Act and applicable provincial human rights legislation. You have the right to request a human review of any automated assessment that materially affects your application or profile on Energized.

## 7. Your Rights

Under PIPEDA and applicable Canadian privacy laws, you have the right to:

- Access and correct your personal information
- Withdraw consent at any time (subject to legal limitations)
- Request deletion of your data after you close your account, subject to records we must keep for legal, billing, or dispute-resolution purposes
- File a complaint with the Office of the Privacy Commissioner of Canada (OPC)

Requests can be submitted via **dev@energized.biz**.

## 8. International Data Transfers

Energized is a Canadian service. Some subprocessors that help us operate the platform (for example AI, email, payments, analytics, hosting, and file storage) may process data outside Canada, including in the United States. Where data is transferred outside Canada, we take steps so that equivalent privacy protections are applied.

## 9. Policy Updates

Energized may update this Privacy Policy periodically. Material changes will be communicated to registered users via email or in-app notification. Your continued use of the platform after updates constitutes acceptance of the revised policy.

## 10. Contact Information

For privacy-related questions or concerns, contact us at:

Email: **dev@energized.biz**

© 2026 Energized. All Rights Reserved.`,
  },
  {
    slug: "terms",
    eyebrow: "Legal",
    title: "Terms of service",
    seoTitle: "Terms of service",
    seoDescription:
      "Terms that govern your use of Energized — the job network for Canadian energy professionals and employers.",
    body: `These Terms of Service (“Terms”) govern your access to and use of the Energized web platform and related services (“Services”). By using our platform, you agree to these Terms, our [Privacy Policy](/privacy), and any other applicable policies provided by Energized.

Last updated: 25 August 2026.

## 1. Definitions

1.1 **“Job seeker”** refers to an individual building a professional profile, browsing roles, or applying for work through Energized.

1.2 **“Employer”** refers to a company or hiring organisation posting roles, searching candidates, or managing a hiring pipeline through the platform.

1.3 **“Recruiter”** refers to a seat under an employer organisation with permission to use hiring tools on that organisation’s behalf.

1.4 **“User”** means any registered or unregistered person accessing the platform.

1.5 **“Listings”** refer to job postings published on Energized.

## 2. User Responsibilities

Users agree to provide accurate and truthful information when using the platform — including work history, certifications, tickets, and job-posting details. You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account. You must not impersonate another person, misrepresent credentials, or upload documents you do not have the right to share.

## 3. Permitted Use

Energized may only be used for legitimate job search, hiring, and recruiting in the Canadian energy sector (including oil & gas, renewables, nuclear, utilities, hydrogen, and power). You must not use the Services to discriminate, harass, scrape, spam, or violate applicable human rights, employment, or privacy laws. Employers and recruiters must not use candidate data for purposes unrelated to evaluating or filling a role.

## 4. Data Privacy and Security

Energized complies with the Personal Information Protection and Electronic Documents Act (PIPEDA) and other applicable privacy laws in Canada. Your personal data, including uploaded resumes and certification scans, is used to operate the Services as described in our [Privacy Policy](/privacy). AI-assisted match scores and related features are tools to help Users evaluate fit; they are not a guarantee of employment or of a hiring decision.

## 5. Fees and Payments

Core job-seeker features are free. Certain features — including employer posting packages, recruiter seats, featured listings, and optional job-seeker plans — may incur fees. By using paid features, you agree to pay the applicable charges as displayed during checkout. Fees are processed by our payment provider. Unless a paid plan states otherwise, charges are non-refundable once the billing period has started, except where required by law.

## 6. Intellectual Property

All content, trademarks, and code on the Energized platform are the property of Energized or its licensors. Users are granted a limited, non-transferable license to use the platform for its intended purpose. You retain rights in content you submit (such as your profile, resume, and job listings), and you grant Energized a licence to host, display, and process that content as needed to provide the Services.

## 7. Limitation of Liability

Energized provides its Services on an “as-is” and “as-available” basis. We do not guarantee that you will be hired, that a role will be filled, or that match scores, skill assessments, or other AI outputs will be error-free. Energized shall not be liable for any indirect, incidental, or consequential damages arising from the use of or inability to use the Services.

## 8. Termination

Energized reserves the right to suspend or terminate your access to the platform at any time for violations of these Terms or misuse of the Services, including fraudulent profiles, discriminatory hiring practices, or abuse of other Users. You may close your account at any time; some records may be retained as described in the Privacy Policy.

## 9. Governing Law

These Terms are governed by and construed in accordance with the federal laws of Canada applicable therein.

## 10. Contact

For questions or concerns about these Terms, please contact Energized at:

Email: **dev@energized.biz**

© 2026 Energized. All Rights Reserved.`,
  },
  {
    slug: "contact",
    eyebrow: "Contact us",
    title: "We're here to help",
    seoTitle: "Contact",
    seoDescription:
      "Get in touch with the Energized team — we read every message and reply within one business day.",
    body: `Have a question or need assistance? Send a message and our team will get back to you within **one business day**.`,
  },
  {
    slug: "accessibility",
    eyebrow: "Accessibility",
    title: "Accessibility commitment",
    seoTitle: "Accessibility",
    seoDescription: "Our commitment to an accessible energy job network.",
    body: `Energized is committed to a job network that everyone can use, regardless of ability.

If you run into a barrier on the site, please write us at **dev@energized.biz** and we'll fix it.`,
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
