# Employer gating on /skills and /trainings — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop showing the jobseeker monetization flow to employer accounts on `/skills` and `/trainings`. Catalogs stay visible (proof-of-talent surface); CTAs and copy change for employers, and deep jobseeker-only routes redirect them to `/candidates`.

**Architecture:** Per-page `getSession()` in each affected RSC. Pass `isEmployer` (a single boolean) down to existing child components as a new prop. Swap hrefs and conditionally render sections. Redirect employers from deep jobseeker-only routes before any data loads.

**Tech Stack:** Next.js App Router (RSCs), tRPC (no router changes), Better Auth session, Tailwind. No new dependencies.

**Spec:** [`docs/superpowers/specs/2026-05-11-employer-gating-skills-trainings-design.md`](../specs/2026-05-11-employer-gating-skills-trainings-design.md)

**Working style:** User prefers ship-fast + manual verification. No new unit tests in this plan; verification = typecheck + manual smoke per the spec's "Verification" section.

---

## File map

**Modify:**
- `src/app/(app)/skills/page.tsx` — derive `isEmployer`, pass to children, skip `myAttempts` fetch
- `src/app/(app)/skills/_components/catalog-hero.tsx` — accept `isEmployer`, swap right-hand panel
- `src/app/(app)/skills/_components/sector-grid.tsx` — accept `isEmployer`, swap card hrefs
- `src/app/(app)/skills/_components/popular-roles.tsx` — accept `isEmployer`, swap card hrefs
- `src/app/(app)/skills/[topicSlug]/configure/page.tsx` — add employer redirect
- `src/app/(app)/skills/[topicSlug]/attempt/[attemptId]/page.tsx` — add employer redirect
- `src/app/(app)/skills/[topicSlug]/attempt/[attemptId]/result/page.tsx` — add employer redirect
- `src/app/(app)/skills/my-tests/page.tsx` — change existing employer redirect target from `/employer` to `/candidates`
- `src/app/(app)/trainings/page.tsx` — derive `isEmployer`, pass to children
- `src/app/(app)/trainings/_components/catalog-hero.tsx` — accept `isEmployer`, swap headline + sub-copy
- `src/app/(app)/trainings/_components/catalog-client.tsx` — accept `isEmployer`, pass to card list
- `src/app/(app)/trainings/_components/featured-strip.tsx` — accept `isEmployer`, pass to cards
- `src/app/(app)/trainings/_components/training-card.tsx` — accept `isEmployer`, swap href
- `src/app/(app)/trainings/[slug]/page.tsx` — add employer redirect
- `src/app/(app)/trainings/[slug]/learn/[moduleSlug]/[lessonSlug]/page.tsx` — add employer redirect
- `src/app/(app)/trainings/[slug]/certificate/page.tsx` — add employer redirect
- `src/app/(app)/trainings/my-trainings/page.tsx` — change existing employer redirect target from `/employer` to `/candidates`

**Create:** none.

---

## Task 1: Skills root page — role detection + recent-attempts gate

**Files:**
- Modify: `src/app/(app)/skills/page.tsx`

- [ ] **Step 1: Add session lookup and conditional fetch**

Replace the current `SkillsPage` body so it derives `isEmployer` from the session and skips `myAttempts` for employers. Children receive the new prop in later tasks; for now the file just compiles unchanged for non-employers.

```tsx
import { api } from "@/lib/trpc/server";
import { getSession } from "@/server/auth";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { CatalogHero } from "./_components/catalog-hero";
import { SectorGrid } from "./_components/sector-grid";
import { PopularRoles } from "./_components/popular-roles";
import { HowItWorksStrip } from "./_components/how-it-works-strip";
import { RecentAttemptsStrip } from "./_components/recent-attempts-strip";

export default async function SkillsPage() {
  const session = await getSession();
  const isEmployer = session?.user?.role === "employer";

  const [sectors, attempts] = await Promise.all([
    api.skillTests.listTopics(),
    isEmployer ? Promise.resolve([]) : api.skillTests.myAttempts().catch(() => []),
  ]);
  const recent = attempts.slice(0, 3);

  return (
    <div
      className="v2"
      style={{
        minHeight: "100vh",
        background: "var(--v2-ink-50)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <SiteHeader active="skill-tests" />
      <main className="flex-1 bg-slate-50 py-14 lg:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <CatalogHero sectors={sectors} isEmployer={isEmployer} />
          {!isEmployer && recent.length > 0 && (
            <section className="mt-12">
              <RecentAttemptsStrip
                attempts={recent}
                totalCount={attempts.length}
              />
            </section>
          )}
          <section className="mt-16">
            <SectorGrid sectors={sectors} isEmployer={isEmployer} />
          </section>
          <section className="mt-16">
            <PopularRoles sectors={sectors} isEmployer={isEmployer} />
          </section>
          <HowItWorksStrip />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
```

- [ ] **Step 2: Verify typecheck fails on missing props (expected)**

Run: `pnpm typecheck`
Expected: errors complaining `CatalogHero`, `SectorGrid`, and `PopularRoles` don't accept `isEmployer`. That's intentional — Tasks 2–4 add the prop. Do **not** commit yet.

---

## Task 2: Skills sector grid — employer href swap

**Files:**
- Modify: `src/app/(app)/skills/_components/sector-grid.tsx`

- [ ] **Step 1: Accept `isEmployer` and swap the card href**

In the props type (currently destructured directly), add `isEmployer: boolean`. Compute the href per card. Replace the existing `<Link>` block inside the map with:

```tsx
export function SectorGrid({
  sectors,
  isEmployer,
}: {
  sectors: Sector[];
  isEmployer: boolean;
}) {
  // ...existing tab state + filter logic unchanged...

  return (
    <>
      {/* ...existing header + tabs unchanged... */}

      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((s) => {
          const href = isEmployer
            ? `/candidates?badges=${encodeURIComponent(s.slug)}`
            : `/skills/${s.slug}/configure`;
          return (
            <Link
              key={s.slug}
              href={href}
              className="group relative overflow-hidden rounded-2xl border-2 border-slate-300 bg-white p-6 text-left transition hover:-translate-y-0.5 hover:border-[var(--brand-black)] hover:shadow-xl"
              title={
                isEmployer ? "See candidates with this badge" : undefined
              }
            >
              {/* ...existing card contents unchanged... */}
            </Link>
          );
        })}
      </div>
    </>
  );
}
```

The existing card body (badge, monogram, name, blurb, role count) stays exactly as-is — only the wrapping `<Link>` href and the optional `title` attribute change.

- [ ] **Step 2: Quick visual sanity**

`pnpm typecheck` should pass for this file in isolation but still fail on `popular-roles.tsx` (next task).

---

## Task 3: Skills popular-roles list — employer href swap

**Files:**
- Modify: `src/app/(app)/skills/_components/popular-roles.tsx`

- [ ] **Step 1: Accept `isEmployer` and swap the row href**

Replace the component signature and the row `<Link>` href:

```tsx
import Link from "next/link";
import { ArrowRight } from "lucide-react";

type Sector = {
  slug: string;
  name: string;
  tileColor: string;
  roles: { slug: string; name: string; subDescription: string | null }[];
};

export function PopularRoles({
  sectors,
  isEmployer,
}: {
  sectors: Sector[];
  isEmployer: boolean;
}) {
  const top = sectors
    .flatMap((s) => s.roles.slice(0, 1).map((r) => ({ ...r, sector: s })))
    .slice(0, 9);
  return (
    <>
      {/* ...existing header unchanged... */}
      <div className="border-t border-slate-200">
        {top.map((r, i) => {
          const href = isEmployer
            ? `/candidates?badges=${encodeURIComponent(r.sector.slug)}`
            : `/skills/${r.slug}/configure`;
          return (
            <Link
              key={r.slug}
              href={href}
              title={
                isEmployer ? "See candidates with this badge" : undefined
              }
              className="group grid grid-cols-[40px_1fr_44px] items-center gap-6 border-b border-slate-200 px-2 py-5 transition hover:bg-white hover:px-4 md:grid-cols-[60px_1.4fr_1fr_60px]"
            >
              {/* ...existing row contents unchanged... */}
            </Link>
          );
        })}
      </div>
    </>
  );
}
```

Note: the popular-roles row's slug in the existing code is `r.slug` (a role slug). For employer hrefs we use the **sector** slug (`r.sector.slug`) because that's what the badge filter expects. This is a deliberate scope decision: role-level badge filtering doesn't exist today, sector-level does.

- [ ] **Step 2: No further verification yet — catalog-hero still missing the prop**

---

## Task 4: Skills catalog hero — employer-side panel swap

**Files:**
- Modify: `src/app/(app)/skills/_components/catalog-hero.tsx`

- [ ] **Step 1: Accept `isEmployer` and render an employer panel when set**

Top of file: add the prop. When `isEmployer` is true, render an employer-framed panel in place of the existing AI "Build test" generator. Keep the left-hand stats/headline column unchanged so the layout is identical.

```tsx
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowRight } from "lucide-react";
import posthog from "posthog-js";

type Sector = {
  slug: string;
  name: string;
  roles: { slug: string; name: string }[];
};

export function CatalogHero({
  sectors,
  isEmployer,
}: {
  sectors: Sector[];
  isEmployer: boolean;
}) {
  const [text, setText] = useState("");
  const router = useRouter();

  useEffect(() => {
    try {
      posthog.capture("skill_test.catalog.viewed", {
        totalSectors: sectors.length,
        isEmployer,
      });
    } catch {}
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = () => {
    if (!text.trim()) return;
    const lower = text.toLowerCase();
    const matchedRole = sectors
      .flatMap((s) => s.roles.map((r) => ({ ...r, sectorSlug: s.slug })))
      .find((r) => r.name.toLowerCase().includes(lower));
    if (matchedRole) {
      router.push(`/skills/${matchedRole.slug}/configure`);
      return;
    }
    const matchedSector = sectors.find((s) => s.name.toLowerCase().includes(lower));
    router.push(`/skills/${(matchedSector ?? sectors[0]).slug}/configure`);
  };

  const suggestions = ["Wind technician II", "Reservoir engineer", "Hydrogen process eng.", "Grid system operator"];

  return (
    <div className="grid gap-14 border-b border-slate-200 pb-12 lg:grid-cols-[1.4fr_1fr] lg:items-end">
      <div>
        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
          {isEmployer ? "Skill assessments · proof of talent" : "Skill assessments"}
        </div>
        <h1 className="mt-6 text-5xl font-bold leading-[0.95] tracking-tight md:text-7xl lg:text-8xl">
          {isEmployer ? (
            <>
              Hire <em className="not-italic font-bold italic text-[var(--brand-dark-blue)]">verified</em>.<br />
              Not self-claimed.
            </>
          ) : (
            <>
              Get <em className="not-italic font-bold italic text-[var(--brand-dark-blue)]">verified</em>.<br />
              One sitting. 25 minutes.
            </>
          )}
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600">
          {isEmployer
            ? "Every candidate on Energized can prove what they know — same AI-built test, real scenarios, sector-specific. Filter by badge and shortlist with confidence."
            : "AI builds a fresh test for your sector and role — multiple choice, real scenarios, calcs. Pass and a badge lands on your profile that recruiters can filter by."}
        </p>
        <div className="mt-8 flex flex-wrap gap-9">
          <Stat v={String(sectors.length)} l="Sectors covered" />
          <Stat v="Fresh" l="Test built each attempt — no two alike" />
          <Stat v="3.4×" l="Recruiter response rate vs. unverified" />
        </div>
      </div>

      {isEmployer ? (
        <EmployerPanel />
      ) : (
        <div className="relative overflow-hidden rounded-3xl bg-[var(--brand-black)] p-7 text-white">
          {/* ...existing AI generator panel unchanged... */}
        </div>
      )}
    </div>
  );
}

function EmployerPanel() {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-[var(--brand-black)] p-7 text-white">
      <div className="pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(28,170,226,0.25),transparent_70%)]" />
      <div className="relative">
        <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--brand-blue)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand-blue)]" />
          Find verified candidates
        </div>
        <h3
          className="mt-3 text-4xl font-bold tracking-tight"
          style={{ color: "#fff" }}
        >
          This is what your future hires{" "}
          <em
            className="not-italic italic"
            style={{ color: "var(--brand-blue, #1CAAE2)" }}
          >
            prove
          </em>
          .
        </h3>
        <p
          className="mt-3 text-base leading-7"
          style={{ color: "rgba(255,255,255,0.85)" }}
        >
          Pick a sector below to see candidates who have earned the badge — or jump straight to the talent pool.
        </p>
        <Link
          href="/candidates"
          className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-[var(--brand-blue)] px-5 py-2.5 text-sm font-bold text-[var(--brand-black)] transition hover:bg-white"
        >
          Browse candidates <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

function Stat({ v, l }: { v: string; l: string }) {
  return (
    <div>
      <div className="text-4xl font-bold italic tracking-tight text-[var(--brand-dark-blue)]">{v}</div>
      <div className="mt-2 max-w-[160px] text-[11px] font-bold uppercase leading-relaxed tracking-[0.16em] text-slate-500">
        {l}
      </div>
    </div>
  );
}
```

Implementation note: keep the existing AI-generator JSX inside the `else` branch verbatim. Use `Sparkles` only inside that branch — that's fine, the import stays.

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: passes for `/skills` surfaces. Any remaining errors should be in `/trainings` files (untouched yet).

- [ ] **Step 3: Commit**

```bash
git add src/app/\(app\)/skills/page.tsx \
        src/app/\(app\)/skills/_components/catalog-hero.tsx \
        src/app/\(app\)/skills/_components/sector-grid.tsx \
        src/app/\(app\)/skills/_components/popular-roles.tsx
git commit -m "feat(skills): employer-aware /skills catalog (proof-of-talent CTAs)"
```

---

## Task 5: Skills deep routes — redirect employers

**Files:**
- Modify: `src/app/(app)/skills/[topicSlug]/configure/page.tsx`
- Modify: `src/app/(app)/skills/[topicSlug]/attempt/[attemptId]/page.tsx`
- Modify: `src/app/(app)/skills/[topicSlug]/attempt/[attemptId]/result/page.tsx`
- Modify: `src/app/(app)/skills/my-tests/page.tsx`

- [ ] **Step 1: Configure page — redirect**

In `src/app/(app)/skills/[topicSlug]/configure/page.tsx`, add the redirect after `await params`:

```tsx
import { notFound, redirect } from "next/navigation";
import { api } from "@/lib/trpc/server";
import { getSession } from "@/server/auth";
import { ConfigureClient } from "./configure-client";

export default async function ConfigurePage({
  params,
}: {
  params: Promise<{ topicSlug: string }>;
}) {
  const { topicSlug } = await params;
  const session = await getSession();
  if (session?.user?.role === "employer") {
    redirect(`/candidates?badges=${encodeURIComponent(topicSlug)}`);
  }
  const data = await api.skillTests.getTopic({ slug: topicSlug }).catch(() => null);
  if (!data) notFound();

  return (
    <ConfigureClient
      sector={data.sector}
      roles={data.roles}
      initialRoleSlug={data.currentRole?.slug ?? null}
    />
  );
}
```

- [ ] **Step 2: Attempt runner page — redirect**

In `src/app/(app)/skills/[topicSlug]/attempt/[attemptId]/page.tsx`, replace the top of the function so the employer redirect runs **before** the attempt fetch (which would 404 since the attempt belongs to a jobseeker):

```tsx
import { notFound, redirect } from "next/navigation";
import { api } from "@/lib/trpc/server";
import { getSession } from "@/server/auth";
import { RunnerClient } from "./runner-client";

export default async function RunnerPage({
  params,
}: {
  params: Promise<{ topicSlug: string; attemptId: string }>;
}) {
  const { topicSlug, attemptId } = await params;
  const session = await getSession();
  if (session?.user?.role === "employer") {
    redirect(`/candidates?badges=${encodeURIComponent(topicSlug)}`);
  }
  const attempt = await api.skillTests
    .getAttempt({ attemptId })
    .catch(() => null);
  if (!attempt) notFound();
  if (attempt.status !== "in_progress") {
    redirect(`/skills/${topicSlug}/attempt/${attemptId}/result`);
  }
  return <RunnerClient attempt={attempt} topicSlug={topicSlug} />;
}
```

- [ ] **Step 3: Attempt result page — redirect**

In `src/app/(app)/skills/[topicSlug]/attempt/[attemptId]/result/page.tsx`, add the same redirect after `await params`. Insert the `getSession` import and the redirect block above the existing `getAttempt` call.

```tsx
import { notFound, redirect } from "next/navigation";
import { api } from "@/lib/trpc/server";
import { getSession } from "@/server/auth";
import { SiteHeader } from "@/components/marketing/site-header";
// ...other existing imports unchanged...

export default async function ResultPage({
  params,
}: {
  params: Promise<{ topicSlug: string; attemptId: string }>;
}) {
  const { topicSlug, attemptId } = await params;
  const session = await getSession();
  if (session?.user?.role === "employer") {
    redirect(`/candidates?badges=${encodeURIComponent(topicSlug)}`);
  }
  // ...rest of function body unchanged...
}
```

- [ ] **Step 4: my-tests page — change redirect target**

In `src/app/(app)/skills/my-tests/page.tsx`, find the existing line:

```tsx
if (session.user.role === "employer") redirect("/employer");
```

Replace with:

```tsx
if (session.user.role === "employer") redirect("/candidates");
```

- [ ] **Step 5: Typecheck**

Run: `pnpm typecheck`
Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add src/app/\(app\)/skills/\[topicSlug\]/configure/page.tsx \
        src/app/\(app\)/skills/\[topicSlug\]/attempt/\[attemptId\]/page.tsx \
        src/app/\(app\)/skills/\[topicSlug\]/attempt/\[attemptId\]/result/page.tsx \
        src/app/\(app\)/skills/my-tests/page.tsx
git commit -m "feat(skills): redirect employers from jobseeker-only deep routes to /candidates"
```

---

## Task 6: Trainings root + cards — role-aware hrefs

**Files:**
- Modify: `src/app/(app)/trainings/page.tsx`
- Modify: `src/app/(app)/trainings/_components/catalog-hero.tsx`
- Modify: `src/app/(app)/trainings/_components/catalog-client.tsx`
- Modify: `src/app/(app)/trainings/_components/featured-strip.tsx`
- Modify: `src/app/(app)/trainings/_components/training-card.tsx`

- [ ] **Step 1: Trainings root — derive `isEmployer`, pass down**

```tsx
import type { Metadata } from "next";
import { api } from "@/lib/trpc/server";
import { getSession } from "@/server/auth";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { CatalogHero } from "./_components/catalog-hero";
import { FeaturedStrip } from "./_components/featured-strip";
import { CatalogClient } from "./_components/catalog-client";

export const metadata: Metadata = {
  title: "Trainings — Energized",
};

export default async function TrainingsPage() {
  const session = await getSession();
  const isEmployer = session?.user?.role === "employer";
  const all = await api.trainings.list({ sort: "popular" });
  const featured = all.filter((t) => t.isFeatured).slice(0, 3);

  return (
    <div
      className="v2"
      style={{
        minHeight: "100vh",
        background: "var(--v2-ink-50)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <SiteHeader active="trainings" />
      <main className="flex-1 bg-slate-50 py-14 lg:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <CatalogHero total={all.length} isEmployer={isEmployer} />
          {featured.length > 0 && (
            <section className="mt-12">
              <FeaturedStrip trainings={featured} isEmployer={isEmployer} />
            </section>
          )}
          <section className="mt-12">
            <CatalogClient
              initialTrainings={all}
              isEmployer={isEmployer}
            />
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
```

- [ ] **Step 2: Trainings catalog hero — reframed copy for employers**

In `src/app/(app)/trainings/_components/catalog-hero.tsx`, replace the whole component:

```tsx
export function CatalogHero({
  total,
  isEmployer,
}: {
  total: number;
  isEmployer: boolean;
}) {
  return (
    <div className="grid gap-12 border-b border-slate-200 pb-12 lg:grid-cols-[1.4fr_1fr] lg:items-end">
      <div>
        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
          {isEmployer ? "Training catalog · talent depth" : "Training services · Platinum"}
        </div>
        <h1 className="mt-6 text-5xl font-bold leading-[0.95] tracking-tight md:text-6xl lg:text-7xl">
          {isEmployer ? (
            <>
              See the talent{" "}
              <em
                className="not-italic italic font-bold"
                style={{ color: "var(--brand-dark-blue, #004984)" }}
              >
                investing
              </em>{" "}
              in their skills.
            </>
          ) : (
            <>
              Skill up for the<br />
              roles that{" "}
              <em
                className="not-italic italic font-bold"
                style={{ color: "var(--brand-dark-blue, #004984)" }}
              >
                actually pay
              </em>
              .
            </>
          )}
        </h1>
        <p
          className="max-w-xl text-lg leading-relaxed text-slate-600"
          style={{ marginTop: 40 }}
        >
          {isEmployer
            ? `Energized candidates train across ${total}+ courses graded by working senior engineers. Certificates show on their profile — filter by badge to shortlist with confidence.`
            : `${total}+ courses graded by working senior engineers across Canadian energy. Self-paced. Earn certificates that sit on your profile — recruiters notice.`}
        </p>
      </div>
      <div className="grid gap-7">
        <Stat n={String(total)} l="Live courses across safety, technical, professional and transition tracks" />
        <Stat n="3.4×" l="More recruiter inbound for members with a verified badge" />
        {!isEmployer && (
          <Stat n="92%" l="First-attempt pass rate on partnered in-person practicals" />
        )}
      </div>
    </div>
  );
}

function Stat({ n, l }: { n: string; l: string }) {
  return (
    <div>
      <div
        className="text-4xl font-bold italic tracking-tight"
        style={{ color: "var(--brand-dark-blue, #004984)" }}
      >
        {n}
      </div>
      <div className="mt-2 max-w-[280px] text-[11px] font-bold uppercase leading-relaxed tracking-[0.16em] text-slate-500">
        {l}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: training-card — accept `isEmployer`, swap href**

In `src/app/(app)/trainings/_components/training-card.tsx`, change the signature and href:

```tsx
export function TrainingCard({
  training,
  isEmployer,
}: {
  training: CardTraining;
  isEmployer: boolean;
}) {
  const href = isEmployer ? "/candidates" : `/trainings/${training.slug}`;
  return (
    <Link
      href={href}
      title={isEmployer ? "See candidates investing in their skills" : undefined}
      className="group relative flex flex-col overflow-hidden rounded-2xl border-2 border-slate-300 bg-white p-6 transition hover:-translate-y-0.5 hover:border-[var(--brand-black,#101820)] hover:shadow-xl"
    >
      {/* ...existing card contents unchanged... */}
    </Link>
  );
}
```

- [ ] **Step 4: featured-strip — pass `isEmployer` to cards**

Replace the entire `featured-strip.tsx` body with:

```tsx
import { TrainingCard, type CardTraining } from "./training-card";

export function FeaturedStrip({
  trainings,
  isEmployer,
}: {
  trainings: CardTraining[];
  isEmployer: boolean;
}) {
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
          Featured{" "}
          <em
            className="not-italic italic"
            style={{ color: "var(--brand-dark-blue, #004984)" }}
          >
            trainings
          </em>
          .
        </h2>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {trainings.map((t) => (
          <TrainingCard key={t.slug} training={t} isEmployer={isEmployer} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: catalog-client — pass `isEmployer` to children**

In `catalog-client.tsx`, change two things only. First, the props signature:

```tsx
export function CatalogClient({
  initialTrainings,
  isEmployer,
}: {
  initialTrainings: CardTraining[];
  isEmployer: boolean;
}) {
```

Second, the card render at the bottom (currently `{visible.map((t) => (<TrainingCard key={t.slug} training={t} />))}`):

```tsx
{visible.map((t) => (
  <TrainingCard key={t.slug} training={t} isEmployer={isEmployer} />
))}
```

The filters/search/sort UI stays exactly as-is — there are no jobseeker-only CTAs inside `catalog-client.tsx` to hide.

- [ ] **Step 6: Typecheck**

Run: `pnpm typecheck`
Expected: pass.

- [ ] **Step 7: Commit**

```bash
git add src/app/\(app\)/trainings/page.tsx \
        src/app/\(app\)/trainings/_components/catalog-hero.tsx \
        src/app/\(app\)/trainings/_components/training-card.tsx \
        src/app/\(app\)/trainings/_components/featured-strip.tsx \
        src/app/\(app\)/trainings/_components/catalog-client.tsx
git commit -m "feat(trainings): employer-aware /trainings catalog (proof-of-talent CTAs)"
```

---

## Task 7: Trainings deep routes — redirect employers

**Files:**
- Modify: `src/app/(app)/trainings/[slug]/page.tsx`
- Modify: `src/app/(app)/trainings/[slug]/learn/[moduleSlug]/[lessonSlug]/page.tsx`
- Modify: `src/app/(app)/trainings/[slug]/certificate/page.tsx`
- Modify: `src/app/(app)/trainings/my-trainings/page.tsx`

- [ ] **Step 1: Training detail page — redirect**

In `src/app/(app)/trainings/[slug]/page.tsx`:

1. Change the import on line 1 from `import { notFound } from "next/navigation";` to:

   ```tsx
   import { notFound, redirect } from "next/navigation";
   ```

2. The file already imports `getSession` on line 3 and reads `session` later. Move the `getSession()` call to immediately after `const { slug } = await params;` and add the redirect before the `api.trainings.getBySlug` fetch (so an employer doesn't trigger unnecessary work). Restructure the top of the function body to:

   ```tsx
   const { slug } = await params;
   const session = await getSession();
   if (session?.user?.role === "employer") {
     redirect("/candidates");
   }
   const data = await api.trainings.getBySlug({ slug }).catch(() => null);
   if (!data) notFound();
   ```

3. Then **remove** the later duplicate `const session = await getSession();` line (currently around line 22) since the variable is now declared earlier. The `if (session) { ... }` block below stays as-is — it still reads from the same `session` variable.

- [ ] **Step 2: Learn (lesson) page — redirect**

In `src/app/(app)/trainings/[slug]/learn/[moduleSlug]/[lessonSlug]/page.tsx`, after the existing `if (!session)` redirect, add:

```tsx
if (session.user.role === "employer") {
  redirect("/candidates");
}
```

- [ ] **Step 3: Certificate page — redirect**

In `src/app/(app)/trainings/[slug]/certificate/page.tsx`, the current file does not call `getSession`. Add it at the top of the function:

```tsx
import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import { api } from "@/lib/trpc/server";
import { getSession } from "@/server/auth";
import { PrintButton } from "./print-button";

// ...inside the function body, before the `if (!sp.enrollment) notFound();` check:
const session = await getSession();
if (session?.user?.role === "employer") {
  redirect("/candidates");
}
```

- [ ] **Step 4: my-trainings page — change redirect target**

In `src/app/(app)/trainings/my-trainings/page.tsx`, replace:

```tsx
if (session.user.role === "employer") redirect("/employer");
```

with:

```tsx
if (session.user.role === "employer") redirect("/candidates");
```

- [ ] **Step 5: Typecheck + lint**

```bash
pnpm typecheck && pnpm lint
```

Expected: pass. Fix anything that fails before committing.

- [ ] **Step 6: Commit**

```bash
git add src/app/\(app\)/trainings/\[slug\]/page.tsx \
        src/app/\(app\)/trainings/\[slug\]/learn/\[moduleSlug\]/\[lessonSlug\]/page.tsx \
        src/app/\(app\)/trainings/\[slug\]/certificate/page.tsx \
        src/app/\(app\)/trainings/my-trainings/page.tsx
git commit -m "feat(trainings): redirect employers from jobseeker-only deep routes to /candidates"
```

---

## Task 8: Manual verification

- [ ] **Step 1: Smoke test as employer**

With the dev server running on `http://localhost:3000` (user runs this externally), sign in as an employer account and walk through:

1. `/skills` → catalog visible. No AI generator. No "Recent attempts" strip. Sector and popular-role cards link to `/candidates?badges=<sector-slug>`.
2. `/skills/wind/configure` → bounce to `/candidates?badges=wind`.
3. `/skills/my-tests` → bounce to `/candidates`.
4. `/skills/wind/attempt/<any-uuid>` → bounce to `/candidates?badges=wind`.
5. `/trainings` → catalog visible. Reframed hero ("See the talent investing in their skills."). Cards link to `/candidates`.
6. `/trainings/<any-slug>` → bounce to `/candidates`.
7. `/trainings/<any-slug>/learn/<m>/<l>` → bounce to `/candidates`.
8. `/trainings/my-trainings` → bounce to `/candidates`.

- [ ] **Step 2: Smoke test as jobseeker**

Sign out, sign in as a jobseeker. Visit `/skills` and `/trainings`. Nothing should look different from before this change. The "Recent attempts" strip renders if there are attempts.

- [ ] **Step 3: Smoke test as anonymous**

Sign out. Visit `/skills` and `/trainings`. Same as jobseeker — no employer-flavored copy.

Verification = these three sign-in states walked through. No new automated tests (per ship-fast working style).

---

## Out of scope (do not implement, do not commit)

- A `?training=<slug>` filter on `/candidates`. Tracked as a deferred follow-up in `MEMORY.md`.
- Hiding `/skills` and `/trainings` from the marketing nav for employers — deliberately kept visible as a proof point.
- Touching `for-employers` / `for-seekers` marketing pages.
- Any change to tRPC routers.
