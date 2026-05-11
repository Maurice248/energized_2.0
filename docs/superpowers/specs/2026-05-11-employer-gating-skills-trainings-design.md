# Employer gating on /skills and /trainings

## Problem

`/skills` and `/trainings` are jobseeker products, but employers (signed in with `role === "employer"`) currently see the same surfaces and CTAs. Clicking through pushes them into jobseeker monetization gates ("Upgrade to Platinum to enroll", "Take a free test"), which is meaningless for an employer account.

## Goal

Turn these pages from a leaky jobseeker funnel into an employer-friendly **proof-of-talent** surface. Same catalogs, different CTAs and copy, route to `/candidates` filtered by the relevant credential.

## Non-goals

- No new data model. No new tRPC procedures.
- No new candidate filter for "completed training X". Training cards link to `/candidates` (unfiltered) for now; skill tests link to `/candidates?badges=<topicSlug>` because that filter already exists.
- No change to public/unauthenticated experience (visitors with no session still see the jobseeker-oriented catalog — that's the marketing surface).

## Behavior, by page

| Page | Jobseeker / anon | Employer |
|---|---|---|
| `/skills` | unchanged | catalog visible; CTAs swapped (see below); recent-attempts strip hidden; AI "Build test" generator hidden |
| `/skills/my-tests` | unchanged | redirect → `/candidates` |
| `/skills/[slug]/configure` | unchanged | redirect → `/candidates?badges=<slug>` |
| `/skills/[slug]/attempt/*` | unchanged | redirect → `/candidates?badges=<slug>` |
| `/trainings` | unchanged | catalog visible; CTAs swapped; copy reframed |
| `/trainings/[slug]` | unchanged | redirect → `/candidates` |
| `/trainings/[slug]/learn/*` | unchanged | redirect → `/candidates` |
| `/trainings/[slug]/certificate` | unchanged | redirect → `/candidates` |
| `/trainings/my-trainings` | unchanged | redirect → `/candidates` |

## CTA swaps

### `/skills` cards (sector-grid, popular-roles)

- Jobseeker/anon: `<Link href="/skills/{slug}/configure">` — "Start a test"
- Employer: `<Link href="/candidates?badges={slug}">` — visual treatment same; hover hint "See candidates with this badge"

### `/skills` catalog hero (`catalog-hero.tsx`)

- Jobseeker/anon: keep the "Just tell us the job" AI generator that routes to `/skills/{slug}/configure`
- Employer: replace right-hand card with a static employer panel (same dark tile, brand-blue accent) explaining "This is what your future hires prove they know" + a "Find verified candidates" CTA → `/candidates`

### `/skills` recent attempts strip

- Hide entirely when viewer is an employer (already skipped because `api.skillTests.myAttempts()` returns nothing, but be explicit — don't render the section, don't call the query).

### `/trainings` cards (training-card, featured-strip)

- Jobseeker/anon: link to `/trainings/{slug}`
- Employer: link to `/candidates` (no training filter yet); card visual treatment unchanged

### `/trainings` catalog hero copy

- Replace "Skill up for the roles that actually pay" headline with an employer-framed one when `isEmployer`:
  > "See the talent **investing** in their skills."
- Sub-stats reframed to employer-relevant ("3.4× more recruiter inbound for verified candidates" stays; first-attempt pass-rate stat hidden for employer).

## How the role check propagates

- Both root pages (`/skills/page.tsx`, `/trainings/page.tsx`) are async RSCs. Call `getSession()` once at the top, derive `isEmployer = session?.user?.role === "employer"`, pass it as a prop into the components that need it.
- For deep routes (`/skills/[slug]/configure`, `/skills/my-tests`, `/trainings/[slug]`, etc.), the redirect happens in the server file at the top, before the client component mounts. Pattern:
  ```ts
  const session = await getSession();
  if (session?.user?.role === "employer") {
    redirect(`/candidates?badges=${slug}`); // or "/candidates"
  }
  ```

## Out of scope (deferred)

- A `?training=<slug>` filter on `/candidates`. Would require schema work (training-completion → searchable). Acceptable today: employer click on a training card lands on `/candidates` unfiltered. Add a one-line follow-up note in `MEMORY.md`.
- Reframing the marketing-site `for-employers` page or `/for-seekers` page; out of scope here.
- No copy changes to `/skills/_components/how-it-works-strip.tsx` — it's generic enough to read both ways.

## Risk / failure modes

- A jobseeker whose role somehow flipped to employer mid-session would suddenly see redirects. Acceptable — role is durable; this isn't a real scenario.
- An employer with an unverified email signing in sees the redirect; that's fine because they shouldn't have reached `(app)` at all without verification.
- SiteHeader nav stays the same for everyone — we are deliberately NOT hiding the links. Employers see the tabs as a proof point, click in, and get a sensible employer experience.

## Verification

Manual:
1. Sign in as an employer; visit `/skills` → catalog visible, no AI generator, no "my attempts", cards link to `/candidates?badges=<slug>`.
2. Visit `/skills/wind/configure` directly → bounced to `/candidates?badges=wind`.
3. Visit `/trainings` → catalog visible, reframed hero, cards link to `/candidates`.
4. Visit `/trainings/<slug>` directly → bounced to `/candidates`.
5. Sign in as a jobseeker; nothing changes on either page.
6. Sign out; nothing changes on either page.

No new unit tests (per ship-fast working style); rely on manual verification + typecheck/lint.
