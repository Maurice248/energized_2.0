/**
 * Canonical starter FAQs for `/faqs` and the admin library.
 *
 * Inserted idempotently by `seedFaqsTables` (match on question text).
 * Admins can edit copy after seeding without the next seed overwriting them.
 */
export type FaqSeedCategory =
  | "general"
  | "seekers"
  | "employers"
  | "billing"
  | "privacy";

export type FaqSeed = {
  category: FaqSeedCategory;
  question: string;
  answer: string;
  supportArticleUrl?: string | null;
};

export const FAQ_SEEDS: FaqSeed[] = [
  /* ---------- General ---------- */
  {
    category: "general",
    question: "What is Energized?",
    answer: `Energized is the specialised job network for Canada's energy sector — oil & gas, renewables, nuclear, utilities, hydrogen, and power.

Generalist boards bury tickets, rotations, and field experience under unrelated noise. We treat those as first-class data so professionals get matched on the work they actually do, and hiring teams spend less time filtering unqualified applicants.`,
  },
  {
    category: "general",
    question: "Which energy sectors do you cover?",
    answer: `We cover the full Canadian energy stack:

- Oil & gas (upstream, downstream, pipelines, LNG)
- Renewables (wind, solar, hydro, storage)
- Nuclear
- Utilities and power
- Hydrogen
- Energy-adjacent work such as CCUS and transmission

If your work keeps the grid, the wellsite, or the transition moving, it belongs here.`,
  },
  {
    category: "general",
    question: "Is Energized only for Canada?",
    answer: `Yes — Energized is built for Canadian energy hiring. Roles, salary bands, tickets, and rotations are modelled around how work actually happens here (H2S Alive, CSTS, Red Seal, P.Eng, 14/7 and 20/8 schedules, and so on).

Employers posting from Canada, and professionals who want to work in Canada, are the intended audience.`,
  },
  {
    category: "general",
    question: "How is Energized different from LinkedIn or Indeed?",
    answer: `Those boards are generalists. Energized is not.

- **Tickets first.** H2S Alive, First Aid, CSTS, Red Seal, P.Eng, NACE, and Fall Protection are structured fields — not buried in a PDF.
- **Salary bands on every published role.** No hide-the-number games.
- **Energy-aware matching.** Fit is scored on sector, certifications, rotation, location, and project history — not keyword stuffing.
- **A curated candidate pool** for hiring teams, with filters that match how energy recruiters actually search.`,
  },
  {
    category: "general",
    question: "How do I contact you?",
    answer: `Write us from the [contact page](/contact) or email **dev@energized.biz**. We read every message and typically reply within one business day.

If you've found an accessibility barrier, use the same channels — we'll fix it.`,
  },

  /* ---------- Job seekers ---------- */
  {
    category: "seekers",
    question: "Is Energized free for job seekers?",
    answer: `Core job-seeker features are **free forever**. You can build a full profile, add certifications and a resume, browse every published role with all filters, save jobs, apply without a cap, track application status, and get email alerts for new matches. Free accounts also include one sector-specific skill assessment.

[Gold](/sign-up?plan=gold) (C$59/mo) and [Platinum](/sign-up?plan=platinum) (C$149/mo) are optional upgrades for AI tools, featured visibility, early access, and the trainings library. See [For job seekers](/for-seekers) for the full picture.`,
  },
  {
    category: "seekers",
    question: "How do I create a profile that actually gets seen?",
    answer: `Create a free account, then complete onboarding — sector, experience level, location, and the tickets you hold. From there:

- Add **work history at the project / site level**, not just job titles.
- List certifications with expiry dates (H2S Alive, CSTS, First Aid, Red Seal, P.Eng, NACE, Fall Protection, and others).
- Upload a resume so hiring teams can download it with your application.
- Turn on **Open to work** if you want to appear in employer candidate search.

Gold members also get a featured profile (top of employer search), AI profile polish, and match scores on every role.`,
  },
  {
    category: "seekers",
    question: "Which tickets and certifications can I list?",
    answer: `The credentials energy hiring managers actually filter on are first-class on your profile, including:

- H2S Alive
- First Aid
- CSTS
- Red Seal
- P.Eng
- NACE
- Fall Protection

You can add other tickets with a credential ID, issue and expiry dates, and an uploaded scan. Platinum includes expiry warnings on your profile so a lapsed ticket doesn't blindside you mid-pipeline.`,
  },
  {
    category: "seekers",
    question: "How do I apply for a role?",
    answer: `Open any published listing on [Jobs](/jobs), review the salary band, tickets, rotation, and work setup, then apply from the role page. You can attach a cover note and answer any screening questions the employer added.

You'll track status (submitted, reviewed, interview, offer, or rejected) from your applications dashboard. Confirmation email is sent when the application lands.`,
  },
  {
    category: "seekers",
    question: "What are skill assessments?",
    answer: `Skill assessments are sector-specific tests that issue a verifiable badge on your profile if you pass. Hiring teams can see that you sat a real check — not just listed a keyword.

Free accounts include **one** assessment. Gold unlocks AI-generated skill tests across more topics. Browse what's live on [Skills](/skills).`,
  },
  {
    category: "seekers",
    question: "What's included in Gold and Platinum?",
    answer: `**Gold (C$59/mo)** is built to get you found: AI match scoring on every role, cover-note drafts, profile polish, extra skill tests, a featured profile, application insights (when an employer opens your application), unlimited saved searches with a daily digest, and 48-hour early access to new roles.

**Platinum (C$149/mo)** includes Gold, plus certification expiry warnings, renewal reminder emails, and the [trainings library](/trainings) — sector-specific courses. Cert-prep practice tests (H2S, First Aid, CSTS, P.Eng) are rolling out next.

Cancel anytime from your profile billing settings.`,
  },
  {
    category: "seekers",
    question: "Can I upload a resume and keep my tickets on file?",
    answer: `Yes. Upload a resume (PDF or Word, up to 10 MB) and certification scans (images up to 2 MB). Files are stored privately and shared with employers when you apply, or when your profile is visible in candidate search.

You can update or replace documents from your profile at any time.`,
  },

  /* ---------- Employers ---------- */
  {
    category: "employers",
    question: "How do I post a job on Energized?",
    answer: `Create an employer account and complete company onboarding. Free accounts can draft listings; **publishing** (and contacting candidates) requires a paid package.

Paid posting templates capture sector, required tickets, salary band, work setup, rotation, and experience level as structured fields — the same filters candidates and recruiters actually use. See [For employers](/for-employers).`,
  },
  {
    category: "employers",
    question: "What's the difference between Package A, B, and C?",
    answer: `All paid packages include the applicant pipeline, branded company profile, screening questions, and full candidate-database access.

- **Package A — C$299/mo:** 1 active posting, 1 recruiter seat, standard placement on /jobs.
- **Package B — C$549/mo (most popular):** 2 active postings, 3 seats, 1 featured job slot per cycle, basic hiring analytics, enhanced company profile.
- **Package C — C$749/mo:** 3 active postings, 5 seats, 3 featured slots, priority placement, advanced funnel analytics, premium company page, priority support.

Start at [sign-up](/sign-up?role=employer). You can change or cancel from employer billing at any time.`,
  },
  {
    category: "employers",
    question: "Can I browse candidates without posting a role?",
    answer: `Yes. A free employer account can build a company profile, browse the candidate pool with every filter (sector, ticket, rotation, location, open-to-work), and save people to a private shortlist.

Publishing a job and contacting candidates requires a paid package. Draft listings are available on free so you can get the posting ready before you subscribe.`,
  },
  {
    category: "employers",
    question: "How do recruiter seats work?",
    answer: `A recruiter is a seat under your employer organisation — an internal hiring manager or an external recruiter you invite into the same pipeline.

- Package A includes 1 seat
- Package B includes 3 seats
- Package C includes 5 seats

Everyone on the org shares jobs, applicants, and shortlists. Don't share logins; add a seat instead.`,
  },
  {
    category: "employers",
    question: "Do you verify certifications?",
    answer: `Candidates list tickets as structured fields (type, credential ID, issue/expiry, uploaded scan). Our team reviews credential uploads, and skill-assessment badges are issued only after a passing result.

Match scores already check H2S, CSTS, rotation, and salary fit against your posting so your shortlist isn't a pile of keyword hits. You still make the hiring decision — Energized does not guarantee a credential on its own.`,
  },

  /* ---------- Billing ---------- */
  {
    category: "billing",
    question: "How much does Energized cost?",
    answer: `**Job seekers:** Free for core features. Gold is C$59/month. Platinum is C$149/month.

**Employers:** Free to look around (profile, candidate browse, drafts). Paid posting packages are C$299 / C$549 / C$749 per month for Packages A, B, and C.

Prices are in Canadian dollars. Plans are monthly and can be cancelled anytime. Current feature lists live on the homepage pricing section.`,
  },
  {
    category: "billing",
    question: "How do I change or cancel my plan?",
    answer: `Job seekers manage Gold and Platinum under **Profile → Billing**. Employers manage Packages A–C under **Employer profile → Billing**.

Cancellation takes effect at the end of the current billing period — you keep access until then. You can also upgrade or downgrade from the same screen. Questions? [Contact us](/contact).`,
  },
  {
    category: "billing",
    question: "Are charges refundable?",
    answer: `Unless a paid plan says otherwise, charges are **non-refundable** once the billing period has started, except where Canadian consumer law requires a refund.

If a charge looks wrong, write **dev@energized.biz** within a few days and we'll look at it. See the [Terms of service](/terms) for the full billing terms.`,
  },
  {
    category: "billing",
    question: "How are payments processed?",
    answer: `Subscriptions are billed through Stripe. Energized does not store full card numbers on our servers.

You'll see the plan name, amount, and cadence before you confirm checkout. Invoices and payment history are available from your billing settings after the first successful charge.`,
  },

  /* ---------- Privacy ---------- */
  {
    category: "privacy",
    question: "Who can see my profile and documents?",
    answer: `**Job seekers:** Employers and recruiters can see your profile when it is visible (Open to work / candidate search) or when you apply. Resumes and certification scans are stored privately and shared in those contexts — they are not public on the open web.

**Employers:** Company profiles and published jobs are public. Pipeline notes and shortlists stay inside your organisation.

Details are in the [Privacy policy](/privacy).`,
  },
  {
    category: "privacy",
    question: "Do you sell my personal information?",
    answer: `No. We do not sell or rent personal information to third parties.

We share data only as needed to run the service: with employers involved in an application or a visible candidate search, with payment processors, and with vendors that host email, files, analytics, and AI on our behalf. See [Privacy policy](/privacy).`,
  },
  {
    category: "privacy",
    question: "How does AI matching use my data?",
    answer: `Match scores, profile polish, cover notes, screening suggestions, and skill assessments use the professional data you provide — experience, tickets, sector, location, and related signals.

We instruct these systems **not** to use protected characteristics (age, gender, family status, disability, religion, race, or nationality) as scoring factors. Automated outputs are reviewed for fairness. You can request a human review of any automated assessment that materially affects your application or profile. AI outputs are tools, not a hiring decision or a guarantee of work.`,
  },
  {
    category: "privacy",
    question: "How do I access, correct, or delete my data?",
    answer: `You can edit your profile, documents, and preferences anytime while signed in. You can also delete your account from profile settings.

Under PIPEDA you may access, correct, or request deletion of personal information, and withdraw consent (subject to legal limits). Some records — for example application history an employer may need to keep — can be retained after you close the account.

Send privacy requests to **dev@energized.biz**, or file a complaint with the Office of the Privacy Commissioner of Canada. Full policy: [Privacy](/privacy).`,
  },
];
