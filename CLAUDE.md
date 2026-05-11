# CLAUDE.md — Energized

> Guidance for Claude Code when working in this repo. Read this file fully before making changes.

---

## 1. Project Overview

**Energized** is a streamlined job-search platform for the Canadian energy sector. It bridges the gap between qualified energy professionals (oil & gas, renewables, nuclear, utilities, hydrogen, power) and hiring companies struggling to fill a widening labour gap.

**Why Energized exists**
- Generalist job boards (LinkedIn, Indeed, Energy Jobline) bury specialized energy experience under unrelated noise.
- Hiring managers waste time filtering unqualified applicants.
- Energy professionals can't surface the certifications, tickets, and field experience that actually matter (e.g. H2S Alive, First Aid, CSTS, Red Seal, PEng, NACE, etc.).

**Core value prop**
- **For candidates:** a specialized profile surface that showcases energy-specific credentials, field experience, and project history.
- **For employers:** a curated pool with structured filters (sector, ticket, rotation, location, clearance) and recruiter tooling.

**User types**
1. `jobseeker` — energy professionals building rich profiles and applying.
2. `employer` — hiring companies posting roles and managing pipelines.
3. `recruiter` — an internal seat under an employer org.
4. `admin` — Energized staff moderating content.

---

## 2. Tech Stack (canonical)

| # | Layer | Choice |
|---|---|---|
| 1 | UI / Components | React + Tailwind + shadcn/ui + Radix |
| 2 | Routing | Next.js App Router |
| 3 | Data Fetching | tRPC |
| 4 | Rendering | SSR + RSC + Streaming + Hydration (Next.js) |
| 5 | Build & Bundling | Turbopack + automatic code splitting |
| 6 | Server / Runtime | Node.js serverless + Edge middleware |
| 7 | Authentication | Better Auth |
| 8 | Database & ORM | Neon DB (Postgres) + Drizzle |
| 9 | Payments & Billing | Stripe |
| 10 | Email & Notifications | Resend + React Email |
| 11 | File Storage & CDN | Vercel Blob |
| 12 | Background Jobs | Trigger.dev |
| 13 | Monitoring & Analytics | PostHog (also Feature Flags + A/B Testing) |
| 14 | Testing | Vitest + Playwright (with visual) |
| 15 | CI/CD & Infrastructure | Vercel |
| 16 | AI / LLM Integration | Vercel AI SDK + OpenAI |
| 17 | Rate Limiting & Security | Better Auth CSRF + Vercel Firewall |

> **Do not introduce alternative libraries for any of the above layers without explicit approval.** If you feel a layer is missing something (e.g. a form library), propose it in a PR description rather than silently adding it.

---

## 3. Folder Structure

```
energized/
├── src/
│   ├── app/                     # Next.js App Router (routes, layouts, RSC)
│   │   ├── (marketing)/         # Public-facing: landing, pricing, /blog
│   │   ├── (auth)/              # sign-in, sign-up, reset
│   │   ├── (app)/               # Authenticated shell
│   │   │   ├── jobs/            # Job browse + detail
│   │   │   ├── candidates/      # Employer-only candidate search
│   │   │   ├── applications/
│   │   │   ├── dashboard/
│   │   │   └── settings/
│   │   ├── api/
│   │   │   ├── trpc/[trpc]/     # tRPC HTTP handler
│   │   │   ├── auth/[...all]/   # Better Auth handler
│   │   │   ├── stripe/webhook/
│   │   │   └── trigger/         # Trigger.dev webhook
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── ui/                  # shadcn/ui primitives (generated)
│   │   ├── marketing/
│   │   ├── jobs/
│   │   ├── candidates/
│   │   └── shared/
│   ├── server/
│   │   ├── api/
│   │   │   ├── routers/         # tRPC routers (jobs, profile, billing…)
│   │   │   ├── trpc.ts          # initTRPC + middleware
│   │   │   └── root.ts          # appRouter
│   │   ├── auth.ts              # Better Auth config
│   │   ├── db/
│   │   │   ├── schema/          # Drizzle tables, split by domain
│   │   │   ├── index.ts         # db client
│   │   │   └── migrations/
│   │   └── services/            # Domain logic (matching, search, billing)
│   ├── lib/
│   │   ├── trpc/                # Client-side tRPC (RSC + client)
│   │   ├── stripe.ts
│   │   ├── resend.ts
│   │   ├── blob.ts
│   │   ├── posthog.ts
│   │   ├── ai.ts                # Vercel AI SDK + OpenAI wrapper
│   │   └── utils.ts             # cn(), formatters, etc.
│   ├── emails/                  # React Email templates
│   ├── middleware.ts            # Edge auth + rate-limit
│   ├── env.ts                   # Typed env (zod)
│   └── styles/globals.css
├── code/
│   └── trigger/                 # Trigger.dev task definitions (NOT src/jobs/)
├── drizzle.config.ts
├── trigger.config.ts
├── playwright.config.ts
├── vitest.config.ts
├── next.config.ts
├── tailwind.config.ts
├── components.json              # shadcn config
├── package.json
└── CLAUDE.md
```

**Import aliases (set in `tsconfig.json`):**
- `@/app/*`, `@/components/*`, `@/server/*`, `@/lib/*`, `@/emails/*` (Trigger.dev tasks live at `code/trigger/`, not under `src/`)

---

## 4. Global Conventions

- **TypeScript strict** is mandatory. No `any`. Prefer `unknown` + narrowing.
- **Server Components by default.** Add `"use client"` only when you need state, effects, or browser APIs.
- **Data access goes through tRPC** — no direct DB calls from Client Components. RSCs may call tRPC via the server caller (see §7).
- **Validation is always Zod**, shared between server input schemas and client forms.
- **Never read `process.env` directly** — import from `@/env` (typed + validated).
- **Styling:** Tailwind utility classes. Compose with `cn()` from `@/lib/utils`. Reuse shadcn primitives before inventing.
- **Naming:** `kebab-case` files, `PascalCase` components, `camelCase` functions/vars. tRPC procedures are verbs: `jobs.list`, `jobs.create`, `profile.update`.
- **Errors:** throw `TRPCError` with codes (`UNAUTHORIZED`, `NOT_FOUND`, `BAD_REQUEST`). Never leak stack traces to clients.
- **Logging:** `console.log` is fine in dev; use structured logging (`{ event, userId, ... }`) so PostHog/Vercel can parse.
- **Accessibility:** all interactive elements must be keyboard-navigable; lean on Radix primitives via shadcn.

---

## 5. Layer 1 — UI / Components (React + Tailwind + shadcn/ui + Radix)

- Generate primitives with the shadcn CLI into `src/components/ui/`. Don't edit them unless the change is intentional and documented.
- Feature components live under `src/components/<feature>/`.
- Keep components ≤ ~150 lines; split when they grow.

```tsx
// src/components/jobs/job-card.tsx
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Zap } from "lucide-react";
import Link from "next/link";

type Props = {
  job: {
    id: string;
    title: string;
    company: string;
    location: string;
    sector: "oil_gas" | "renewables" | "nuclear" | "utilities" | "hydrogen";
    salaryRange?: string;
    postedAt: Date;
  };
};

export function JobCard({ job }: Props) {
  return (
    <Card className="transition hover:shadow-md">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">{job.title}</h3>
            <p className="text-sm text-muted-foreground">{job.company}</p>
          </div>
          <Badge variant="secondary" className="capitalize">
            <Zap className="mr-1 h-3 w-3" />
            {job.sector.replace("_", " ")}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <MapPin className="h-4 w-4" /> {job.location}
        </span>
        {job.salaryRange && <span>{job.salaryRange}</span>}
      </CardContent>
      <CardFooter>
        <Button asChild variant="outline" size="sm">
          <Link href={`/jobs/${job.id}`}>View role</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
```

---

## 6. Layer 2 & 4 — Routing + Rendering (Next.js App Router, RSC, Streaming)

- Use **Route Groups** `(marketing)`, `(auth)`, `(app)` to scope layouts.
- Put **auth gates in layouts**, not in every page.
- Use `loading.tsx` + `<Suspense>` to stream slow data while the shell renders.

```tsx
// src/app/(app)/layout.tsx
import { redirect } from "next/navigation";
import { getSession } from "@/server/auth";
import { AppShell } from "@/components/shared/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  return <AppShell user={session.user}>{children}</AppShell>;
}
```

```tsx
// src/app/(app)/jobs/page.tsx — RSC calling tRPC via server caller
import { Suspense } from "react";
import { api } from "@/lib/trpc/server";
import { JobCard } from "@/components/jobs/job-card";
import { JobListSkeleton } from "@/components/jobs/job-list-skeleton";

export default function JobsPage({ searchParams }: { searchParams: { sector?: string } }) {
  return (
    <Suspense fallback={<JobListSkeleton />}>
      <JobsList sector={searchParams.sector} />
    </Suspense>
  );
}

async function JobsList({ sector }: { sector?: string }) {
  const jobs = await api.jobs.list({ sector });
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {jobs.map((j) => <JobCard key={j.id} job={j} />)}
    </div>
  );
}
```

---

## 7. Layer 3 — Data Fetching (tRPC)

**Initialize tRPC:**

```ts
// src/server/api/trpc.ts
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { getSession } from "@/server/auth";
import { db } from "@/server/db";

export const createContext = async () => ({ db, session: await getSession() });

const t = initTRPC.context<typeof createContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session) throw new TRPCError({ code: "UNAUTHORIZED" });
  return next({ ctx: { ...ctx, session: ctx.session } });
});

export const employerProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.session.user.role !== "employer") throw new TRPCError({ code: "FORBIDDEN" });
  return next({ ctx });
});
```

**A feature router:**

```ts
// src/server/api/routers/jobs.ts
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { router, publicProcedure, employerProcedure } from "@/server/api/trpc";
import { jobListings } from "@/server/db/schema/jobs";

export const jobsRouter = router({
  list: publicProcedure
    .input(z.object({ sector: z.string().optional(), limit: z.number().default(20) }))
    .query(({ ctx, input }) =>
      ctx.db
        .select()
        .from(jobListings)
        .where(input.sector ? eq(jobListings.sector, input.sector) : undefined)
        .orderBy(desc(jobListings.postedAt))
        .limit(input.limit)
    ),

  create: employerProcedure
    .input(z.object({
      title: z.string().min(3),
      sector: z.enum(["oil_gas", "renewables", "nuclear", "utilities", "hydrogen"]),
      location: z.string(),
      description: z.string().min(50),
      salaryMin: z.number().optional(),
      salaryMax: z.number().optional(),
    }))
    .mutation(({ ctx, input }) =>
      ctx.db.insert(jobListings).values({ ...input, employerId: ctx.session.user.id }).returning()
    ),
});
```

**Client + server callers:**

```ts
// src/lib/trpc/server.ts — for use in RSCs
import { cache } from "react";
import { createCaller } from "@/server/api/root";
import { createContext } from "@/server/api/trpc";

export const api = createCaller(cache(createContext));
```

```ts
// src/lib/trpc/client.ts — for Client Components
import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@/server/api/root";
export const api = createTRPCReact<AppRouter>();
```

---

## 8. Layer 5 & 15 — Build, Bundling, CI/CD (Turbopack + Vercel)

- Dev script: `next dev --turbopack`.
- Keep Client Components small — they define the JS bundle boundary.
- Use `next/dynamic` with `ssr: false` only for truly browser-only widgets.
- Vercel handles previews per-PR. Production deploys on merge to `main`.
- Run `pnpm typecheck && pnpm lint && pnpm test` locally before opening a PR; CI runs the same.

---

## 9. Layer 6 — Server / Runtime (Serverless + Edge)

- **Default runtime:** Node.js serverless (needed for Drizzle + most integrations).
- **Edge runtime:** only `src/middleware.ts` (auth cookie checks, geo, rate-limit routing).

```ts
// src/middleware.ts
import { NextResponse, type NextRequest } from "next/server";

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/trpc).*)"],
};

export function middleware(req: NextRequest) {
  const session = req.cookies.get("better-auth.session_token");
  const isAuthRoute = req.nextUrl.pathname.startsWith("/sign-in") ||
                      req.nextUrl.pathname.startsWith("/sign-up");
  const isAppRoute = req.nextUrl.pathname.startsWith("/dashboard") ||
                     req.nextUrl.pathname.startsWith("/applications");

  if (isAppRoute && !session) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }
  if (isAuthRoute && session) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
  return NextResponse.next();
}
```

---

## 10. Layer 7 — Authentication (Better Auth)

- Sessions via HTTP-only cookies; no JWTs in the client.
- Support **email + password**, **magic links**, and **Google OAuth** at minimum.
- Extend the user model with `role` (`jobseeker` | `employer` | `recruiter` | `admin`) and `onboardedAt`.

```ts
// src/server/auth.ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { headers } from "next/headers";
import { db } from "@/server/db";
import { env } from "@/env";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  emailAndPassword: { enabled: true, requireEmailVerification: true },
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },
  user: {
    additionalFields: {
      role: { type: "string", defaultValue: "jobseeker", required: true },
      onboardedAt: { type: "date", required: false },
    },
  },
  advanced: { cookiePrefix: "better-auth" },
});

export const getSession = async () =>
  auth.api.getSession({ headers: await headers() });
```

```ts
// src/app/api/auth/[...all]/route.ts
import { auth } from "@/server/auth";
import { toNextJsHandler } from "better-auth/next-js";
export const { GET, POST } = toNextJsHandler(auth);
```

---

## 11. Layer 8 — Database & ORM (Neon + Drizzle)

- Neon serverless driver for Postgres. Use HTTP driver in Edge, WebSocket/pool in Node.
- Schema is **split by domain** under `src/server/db/schema/` and re-exported from `schema/index.ts`.

```ts
// src/server/db/index.ts
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";
import { env } from "@/env";

const sql = neon(env.DATABASE_URL);
export const db = drizzle(sql, { schema });
```

```ts
// src/server/db/schema/jobs.ts
import { pgTable, text, timestamp, uuid, integer, pgEnum } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const sectorEnum = pgEnum("energy_sector", [
  "oil_gas", "renewables", "nuclear", "utilities", "hydrogen",
]);

export const jobListings = pgTable("job_listings", {
  id: uuid("id").primaryKey().defaultRandom(),
  employerId: text("employer_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  sector: sectorEnum("sector").notNull(),
  location: text("location").notNull(),
  description: text("description").notNull(),
  salaryMin: integer("salary_min"),
  salaryMax: integer("salary_max"),
  postedAt: timestamp("posted_at").notNull().defaultNow(),
  closedAt: timestamp("closed_at"),
});

export const applications = pgTable("applications", {
  id: uuid("id").primaryKey().defaultRandom(),
  jobId: uuid("job_id").notNull().references(() => jobListings.id, { onDelete: "cascade" }),
  candidateId: text("candidate_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  status: text("status").$type<"submitted" | "reviewed" | "interview" | "offer" | "rejected">()
    .notNull().default("submitted"),
  coverNote: text("cover_note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
```

```ts
// drizzle.config.ts
import { defineConfig } from "drizzle-kit";
export default defineConfig({
  schema: "./src/server/db/schema/*",
  out: "./src/server/db/migrations",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
```

Scripts: `pnpm db:generate`, `pnpm db:migrate`, `pnpm db:studio`.

---

## 12. Layer 9 — Payments & Billing (Stripe)

Energized has three revenue paths:
- **Employer subscription** (monthly/annual) for job postings.
- **Boost credits** (one-time) to highlight a listing.
- **Recruiter seats** (per-seat add-on).

```ts
// src/lib/stripe.ts
import Stripe from "stripe";
import { env } from "@/env";
export const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2025-03-31.basil" });
```

```ts
// src/app/api/stripe/webhook/route.ts
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";
import { env } from "@/env";
import { handleStripeEvent } from "@/server/services/billing";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get("stripe-signature")!;
  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return new NextResponse(`Invalid signature: ${(err as Error).message}`, { status: 400 });
  }
  await handleStripeEvent(event);
  return NextResponse.json({ received: true });
}
```

> Webhook route must be in the Node.js runtime (default) — it needs the raw request body.

---

## 13. Layer 10 — Email & Notifications (Resend + React Email)

```tsx
// src/emails/application-received.tsx
import { Body, Container, Head, Html, Preview, Section, Text, Button } from "@react-email/components";

export default function ApplicationReceived({ candidateName, jobTitle, company, url }: {
  candidateName: string; jobTitle: string; company: string; url: string;
}) {
  return (
    <Html>
      <Head />
      <Preview>Your application to {company} is in.</Preview>
      <Body className="bg-gray-50 font-sans">
        <Container className="mx-auto max-w-md p-6">
          <Text>Hey {candidateName},</Text>
          <Text>Your application for <strong>{jobTitle}</strong> at {company} has been received.</Text>
          <Section className="my-4">
            <Button href={url} className="rounded bg-black px-4 py-2 text-white">
              View application
            </Button>
          </Section>
          <Text className="text-xs text-gray-500">— Energized</Text>
        </Container>
      </Body>
    </Html>
  );
}
```

```ts
// src/lib/resend.ts
import { Resend } from "resend";
import { env } from "@/env";
export const resend = new Resend(env.RESEND_API_KEY);

export async function sendApplicationReceived(to: string, props: Parameters<typeof import("@/emails/application-received").default>[0]) {
  const { default: Template } = await import("@/emails/application-received");
  return resend.emails.send({
    from: "Energized <hello@energized.ca>",
    to,
    subject: `Application received — ${props.jobTitle}`,
    react: Template(props),
  });
}
```

---

## 14. Layer 11 — File Storage & CDN (Vercel Blob)

Used for resumes, certification scans (H2S Alive, First Aid), company logos.

```ts
// src/lib/blob.ts
import { put, del } from "@vercel/blob";

export async function uploadResume(userId: string, file: File) {
  const { url } = await put(`resumes/${userId}/${crypto.randomUUID()}-${file.name}`, file, {
    access: "public",
    addRandomSuffix: false,
    contentType: file.type,
  });
  return url;
}

export const deleteBlob = (url: string) => del(url);
```

> Validate MIME type and size (≤ 10 MB resumes, ≤ 2 MB images) before upload. Scan for PII leakage on certification uploads.

---

## 15. Layer 12 — Background Jobs (Trigger.dev)

Use for: sending application-received emails, nightly search-index rebuilds, AI profile-enrichment, recurring candidate-match digests.

```ts
// code/trigger/send-application-email.ts
import { task } from "@trigger.dev/sdk/v3";
import { sendApplicationReceived } from "@/lib/resend";
import { db } from "@/server/db";
import { applications, jobListings, user } from "@/server/db/schema";
import { eq } from "drizzle-orm";

export const sendApplicationEmail = task({
  id: "send-application-email",
  run: async (payload: { applicationId: string }) => {
    const [row] = await db.select({
      candidateEmail: user.email,
      candidateName: user.name,
      jobTitle: jobListings.title,
      company: user.name, // replace with employer join
      applicationId: applications.id,
    })
    .from(applications)
    .innerJoin(user, eq(user.id, applications.candidateId))
    .innerJoin(jobListings, eq(jobListings.id, applications.jobId))
    .where(eq(applications.id, payload.applicationId));

    if (!row) return;
    await sendApplicationReceived(row.candidateEmail, {
      candidateName: row.candidateName,
      jobTitle: row.jobTitle,
      company: row.company,
      url: `https://energized.ca/applications/${row.applicationId}`,
    });
  },
});
```

Trigger from tRPC mutations: `await tasks.trigger<typeof sendApplicationEmail>("send-application-email", { applicationId })`.

---

## 16. Layer 13 — Monitoring, Analytics, Feature Flags (PostHog)

```ts
// src/lib/posthog.ts
import posthog from "posthog-js";
import { PostHog } from "posthog-node";
import { env } from "@/env";

// Client
export function initPostHogClient() {
  if (typeof window === "undefined") return;
  posthog.init(env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: "https://us.i.posthog.com",
    capture_pageview: "history_change",
    person_profiles: "identified_only",
  });
}

// Server
export const posthogServer = new PostHog(env.POSTHOG_SERVER_KEY, {
  host: "https://us.i.posthog.com",
});

export async function isFeatureEnabled(flag: string, userId: string) {
  return posthogServer.isFeatureEnabled(flag, userId);
}
```

**Event naming**: `domain.action.result` — e.g. `job.posted`, `application.submitted`, `billing.subscription.started`. Keep a registry in `src/lib/analytics-events.ts` so taxonomy doesn't drift.

---

## 17. Layer 14 — Testing (Vitest + Playwright with visual)

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: { environment: "node", include: ["src/**/*.test.ts"], setupFiles: ["./test/setup.ts"] },
});
```

```ts
// src/server/api/routers/jobs.test.ts
import { describe, it, expect } from "vitest";
import { createCaller } from "@/server/api/root";

describe("jobs.list", () => {
  it("filters by sector", async () => {
    const caller = createCaller({ db: testDb, session: null });
    const result = await caller.jobs.list({ sector: "renewables" });
    expect(result.every((j) => j.sector === "renewables")).toBe(true);
  });
});
```

```ts
// e2e/apply-flow.spec.ts
import { test, expect } from "@playwright/test";

test("candidate can apply to a job", async ({ page }) => {
  await page.goto("/jobs");
  await page.getByRole("link", { name: /view role/i }).first().click();
  await page.getByRole("button", { name: /apply/i }).click();
  await expect(page).toHaveURL(/\/applications\//);
  await expect(page).toHaveScreenshot("apply-success.png", { maxDiffPixelRatio: 0.01 });
});
```

- Unit/integration: Vitest.
- E2E + visual regression: Playwright with `toHaveScreenshot`.
- Seed a dedicated test Neon branch in CI — don't touch `main` data.

---

## 18. Layer 16 — AI / LLM Integration (Vercel AI SDK + OpenAI)

**Primary AI use cases**
1. **Profile Polish** — rewrite bullet points to highlight measurable impact ("Reduced flare gas volume by 18% at Site-14").
2. **Job Match Scoring** — score a candidate ↔ listing fit and explain it.
3. **Cover Note Generator** — draft a short, sector-aware note.
4. **Posting Assistant** — help employers write inclusive, clear job posts.

Provider is `@ai-sdk/openai` (the Vercel AI SDK abstracts call sites, so swapping models is a one-liner). Model is read from `OPENAI_MODEL` env (default `gpt-4o`).

```ts
// src/lib/ai.ts
import { createOpenAI } from "@ai-sdk/openai";
import { generateText, streamText } from "ai";
import { env } from "@/env";

const openaiClient = createOpenAI({ apiKey: env.OPENAI_API_KEY });

export async function scoreJobMatch(input: { profile: string; job: string }) {
  const { text } = await generateText({
    model: openaiClient(env.OPENAI_MODEL),
    system: "You are an energy-sector recruiter. Score 0-100 and explain briefly.",
    prompt: `PROFILE:\n${input.profile}\n\nJOB:\n${input.job}\n\nReturn JSON {score, reason}.`,
    maxOutputTokens: 400,
  });
  return JSON.parse(text) as { score: number; reason: string };
}
```

```tsx
// src/app/api/ai/cover-note/route.ts — streaming endpoint
import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { env } from "@/env";

export const runtime = "nodejs";

const openaiClient = createOpenAI({ apiKey: env.OPENAI_API_KEY });

export async function POST(req: Request) {
  const { profile, job } = await req.json();
  const result = streamText({
    model: openaiClient(env.OPENAI_MODEL),
    system: "Write a concise 120-word cover note for a Canadian energy-sector role. Grounded, no fluff.",
    prompt: `Profile:\n${profile}\n\nJob:\n${job}`,
  });
  return result.toTextStreamResponse();
}
```

> **AI cost hygiene:** cache deterministic outputs (Redis/Blob), cap tokens, and guard with PostHog flags so you can kill a feature instantly.

---

## 19. Layer 17 — Rate Limiting & Security (Better Auth CSRF + Vercel Firewall)

- **CSRF:** Better Auth handles it for its own routes via double-submit cookies. For your own mutating routes (tRPC mutations), enforce `origin` checks in `trpc.ts` middleware.
- **Vercel Firewall:** enable in the Vercel dashboard. Add rules:
  - Block known bad ASNs on `/api/*`.
  - Rate-limit `/api/auth/*` at 10 req/min/IP.
  - Rate-limit `/api/trpc/*` at 60 req/min/IP (authenticated) / 20 (anonymous).
  - Challenge on suspicious signals for `/api/stripe/webhook` (but whitelist Stripe IPs).
- **Headers:** strict CSP, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Content-Type-Options: nosniff` — set in `next.config.ts`.
- **Secrets:** all via Vercel env; never commit `.env.local`.
- **PII:** resumes and certifications are private by default — signed Vercel Blob URLs with TTL when sharing with employers.

---

## 20. Domain Model (Energized-specific)

Tables you'll need beyond auth basics:

- `profiles` — one-to-one with `user`. Stores headline, years of experience, sectors, willing-to-relocate, remote preference.
- `certifications` — H2S Alive, First Aid, CSTS, Red Seal, PEng, NACE, Fall Protection. Linked to profile with expiry dates.
- `work_history` — project-level entries: site, role, tenure, rotation schedule (e.g. 14/7, 20/8), commodity.
- `employer_orgs` — company entity, seats, billing customer id.
- `job_listings` (see §11).
- `applications` (see §11).
- `saved_searches` — drives the nightly digest.
- `matches` — AI-generated candidate↔job matches with score + reason.
- `notifications` — in-app inbox + email send log.

---

## 21. Environment Variables

All env is typed in `src/env.ts`:

```ts
// src/env.ts
import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  STRIPE_SECRET_KEY: z.string(),
  STRIPE_WEBHOOK_SECRET: z.string(),
  RESEND_API_KEY: z.string(),
  BLOB_READ_WRITE_TOKEN: z.string(),
  TRIGGER_SECRET_KEY: z.string(),
  ANTHROPIC_API_KEY: z.string(),
  POSTHOG_SERVER_KEY: z.string(),
  NEXT_PUBLIC_POSTHOG_KEY: z.string(),
  NEXT_PUBLIC_APP_URL: z.string().url(),
});

export const env = schema.parse(process.env);
```

---

## 22. Scripts (`package.json`)

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "typecheck": "tsc --noEmit",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest",
    "e2e": "playwright test",
    "e2e:update": "playwright test --update-snapshots",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio",
    "email:dev": "email dev --dir src/emails",
    "trigger:dev": "npx trigger.dev@latest dev"
  }
}
```

---

## 23. MVP Roadmap (build order)

1. **Foundations** — repo, env, Tailwind, shadcn init, Neon branch, Drizzle schema for auth + profile.
2. **Auth** — Better Auth email/password + Google, sign-in/sign-up pages, protected layout.
3. **Candidate profile** — onboarding wizard, certifications, work history, resume upload (Vercel Blob).
4. **Employer onboarding** — org creation, Stripe subscription checkout, webhook plumbing.
5. **Job posting CRUD** — create/list/detail, public `/jobs` browse with sector filter.
6. **Application flow** — apply button, application status, Resend confirmation via Trigger.dev.
7. **AI layer** — profile polish + cover-note streaming endpoint.
8. **Search & match** — Postgres full-text first, upgrade to dedicated index only if needed.
9. **Dashboards** — candidate application tracker; employer pipeline kanban.
10. **Observability** — PostHog events wired end-to-end, feature flags gating AI spend.
11. **Hardening** — Vercel Firewall rules, CSP headers, Playwright visual suite, load test.

---

## 24. Working Agreement for Claude Code

When asked to implement something in this repo:

1. **Read the relevant router/schema first.** Don't mutate types before understanding existing shape.
2. **Keep changes scoped.** Prefer a new file over sprawling edits; don't refactor adjacent code unless asked.
3. **Write the Zod schema first**, then the tRPC procedure, then the UI.
4. **No new top-level dependencies** without calling it out in the response.
5. **Every mutation that sends email or triggers long work** must go through Trigger.dev, never awaited inline.
6. **Run `pnpm typecheck && pnpm lint && pnpm test`** after non-trivial changes and report the result.
7. **Never commit** unless explicitly asked. Show a diff summary first.
8. **Follow the naming conventions in §4** — PostHog event names, tRPC procedure names, file casing.

---

*Last updated: 2026-04-21*


<!-- TRIGGER.DEV basic START -->
# Trigger.dev Basic Tasks (v4)

**MUST use `@trigger.dev/sdk`, NEVER `client.defineJob`**

## Basic Task

```ts
import { task } from "@trigger.dev/sdk";

export const processData = task({
  id: "process-data",
  retry: {
    maxAttempts: 10,
    factor: 1.8,
    minTimeoutInMs: 500,
    maxTimeoutInMs: 30_000,
    randomize: false,
  },
  run: async (payload: { userId: string; data: any[] }) => {
    // Task logic - runs for long time, no timeouts
    console.log(`Processing ${payload.data.length} items for user ${payload.userId}`);
    return { processed: payload.data.length };
  },
});
```

## Schema Task (with validation)

```ts
import { schemaTask } from "@trigger.dev/sdk";
import { z } from "zod";

export const validatedTask = schemaTask({
  id: "validated-task",
  schema: z.object({
    name: z.string(),
    age: z.number(),
    email: z.string().email(),
  }),
  run: async (payload) => {
    // Payload is automatically validated and typed
    return { message: `Hello ${payload.name}, age ${payload.age}` };
  },
});
```

## Triggering Tasks

### From Backend Code

```ts
import { tasks } from "@trigger.dev/sdk";
import type { processData } from "./trigger/tasks";

// Single trigger
const handle = await tasks.trigger<typeof processData>("process-data", {
  userId: "123",
  data: [{ id: 1 }, { id: 2 }],
});

// Batch trigger (up to 1,000 items, 3MB per payload)
const batchHandle = await tasks.batchTrigger<typeof processData>("process-data", [
  { payload: { userId: "123", data: [{ id: 1 }] } },
  { payload: { userId: "456", data: [{ id: 2 }] } },
]);
```

### Debounced Triggering

Consolidate multiple triggers into a single execution:

```ts
// Multiple rapid triggers with same key = single execution
await myTask.trigger(
  { userId: "123" },
  {
    debounce: {
      key: "user-123-update",  // Unique key for debounce group
      delay: "5s",              // Wait before executing
    },
  }
);

// Trailing mode: use payload from LAST trigger
await myTask.trigger(
  { data: "latest-value" },
  {
    debounce: {
      key: "trailing-example",
      delay: "10s",
      mode: "trailing",  // Default is "leading" (first payload)
    },
  }
);
```

**Debounce modes:**
- `leading` (default): Uses payload from first trigger, subsequent triggers only reschedule
- `trailing`: Uses payload from most recent trigger

### From Inside Tasks (with Result handling)

```ts
export const parentTask = task({
  id: "parent-task",
  run: async (payload) => {
    // Trigger and continue
    const handle = await childTask.trigger({ data: "value" });

    // Trigger and wait - returns Result object, NOT task output
    const result = await childTask.triggerAndWait({ data: "value" });
    if (result.ok) {
      console.log("Task output:", result.output); // Actual task return value
    } else {
      console.error("Task failed:", result.error);
    }

    // Quick unwrap (throws on error)
    const output = await childTask.triggerAndWait({ data: "value" }).unwrap();

    // Batch trigger and wait
    const results = await childTask.batchTriggerAndWait([
      { payload: { data: "item1" } },
      { payload: { data: "item2" } },
    ]);

    for (const run of results) {
      if (run.ok) {
        console.log("Success:", run.output);
      } else {
        console.log("Failed:", run.error);
      }
    }
  },
});

export const childTask = task({
  id: "child-task",
  run: async (payload: { data: string }) => {
    return { processed: payload.data };
  },
});
```

> Never wrap triggerAndWait or batchTriggerAndWait calls in a Promise.all or Promise.allSettled as this is not supported in Trigger.dev tasks.

## Waits

```ts
import { task, wait } from "@trigger.dev/sdk";

export const taskWithWaits = task({
  id: "task-with-waits",
  run: async (payload) => {
    console.log("Starting task");

    // Wait for specific duration
    await wait.for({ seconds: 30 });
    await wait.for({ minutes: 5 });
    await wait.for({ hours: 1 });
    await wait.for({ days: 1 });

    // Wait until specific date
    await wait.until({ date: new Date("2024-12-25") });

    // Wait for token (from external system)
    await wait.forToken({
      token: "user-approval-token",
      timeoutInSeconds: 3600, // 1 hour timeout
    });

    console.log("All waits completed");
    return { status: "completed" };
  },
});
```

> Never wrap wait calls in a Promise.all or Promise.allSettled as this is not supported in Trigger.dev tasks.

## Key Points

- **Result vs Output**: `triggerAndWait()` returns a `Result` object with `ok`, `output`, `error` properties - NOT the direct task output
- **Type safety**: Use `import type` for task references when triggering from backend
- **Waits > 5 seconds**: Automatically checkpointed, don't count toward compute usage
- **Debounce + idempotency**: Idempotency keys take precedence over debounce settings

## NEVER Use (v2 deprecated)

```ts
// BREAKS APPLICATION
client.defineJob({
  id: "job-id",
  run: async (payload, io) => {
    /* ... */
  },
});
```

Use SDK (`@trigger.dev/sdk`), check `result.ok` before accessing `result.output`

<!-- TRIGGER.DEV basic END -->

<!-- TRIGGER.DEV advanced-tasks START -->
# Trigger.dev Advanced Tasks (v4)

**Advanced patterns and features for writing tasks**

## Tags & Organization

```ts
import { task, tags } from "@trigger.dev/sdk";

export const processUser = task({
  id: "process-user",
  run: async (payload: { userId: string; orgId: string }, { ctx }) => {
    // Add tags during execution
    await tags.add(`user_${payload.userId}`);
    await tags.add(`org_${payload.orgId}`);

    return { processed: true };
  },
});

// Trigger with tags
await processUser.trigger(
  { userId: "123", orgId: "abc" },
  { tags: ["priority", "user_123", "org_abc"] } // Max 10 tags per run
);

// Subscribe to tagged runs
for await (const run of runs.subscribeToRunsWithTag("user_123")) {
  console.log(`User task ${run.id}: ${run.status}`);
}
```

**Tag Best Practices:**

- Use prefixes: `user_123`, `org_abc`, `video:456`
- Max 10 tags per run, 1-64 characters each
- Tags don't propagate to child tasks automatically

## Batch Triggering v2

Enhanced batch triggering with larger payloads and streaming ingestion.

### Limits

- **Maximum batch size**: 1,000 items (increased from 500)
- **Payload per item**: 3MB each (increased from 1MB combined)
- Payloads > 512KB automatically offload to object storage

### Rate Limiting (per environment)

| Tier | Bucket Size | Refill Rate |
|------|-------------|-------------|
| Free | 1,200 runs | 100 runs/10 sec |
| Hobby | 5,000 runs | 500 runs/5 sec |
| Pro | 5,000 runs | 500 runs/5 sec |

### Concurrent Batch Processing

| Tier | Concurrent Batches |
|------|-------------------|
| Free | 1 |
| Hobby | 10 |
| Pro | 10 |

### Usage

```ts
import { myTask } from "./trigger/myTask";

// Basic batch trigger (up to 1,000 items)
const runs = await myTask.batchTrigger([
  { payload: { userId: "user-1" } },
  { payload: { userId: "user-2" } },
  { payload: { userId: "user-3" } },
]);

// Batch trigger with wait
const results = await myTask.batchTriggerAndWait([
  { payload: { userId: "user-1" } },
  { payload: { userId: "user-2" } },
]);

for (const result of results) {
  if (result.ok) {
    console.log("Result:", result.output);
  }
}

// With per-item options
const batchHandle = await myTask.batchTrigger([
  {
    payload: { userId: "123" },
    options: {
      idempotencyKey: "user-123-batch",
      tags: ["priority"],
    },
  },
  {
    payload: { userId: "456" },
    options: {
      idempotencyKey: "user-456-batch",
    },
  },
]);
```

## Debouncing

Consolidate multiple triggers into a single execution by debouncing task runs with a unique key and delay window.

### Use Cases

- **User activity updates**: Batch rapid user actions into a single run
- **Webhook deduplication**: Handle webhook bursts without redundant processing
- **Search indexing**: Combine document updates instead of processing individually
- **Notification batching**: Group notifications to prevent user spam

### Basic Usage

```ts
await myTask.trigger(
  { userId: "123" },
  {
    debounce: {
      key: "user-123-update",  // Unique identifier for debounce group
      delay: "5s",              // Wait duration ("5s", "1m", or milliseconds)
    },
  }
);
```

### Execution Modes

**Leading Mode** (default): Uses payload/options from the first trigger; subsequent triggers only reschedule execution time.

```ts
// First trigger sets the payload
await myTask.trigger({ action: "first" }, {
  debounce: { key: "my-key", delay: "10s" }
});

// Second trigger only reschedules - payload remains "first"
await myTask.trigger({ action: "second" }, {
  debounce: { key: "my-key", delay: "10s" }
});
// Task executes with { action: "first" }
```

**Trailing Mode**: Uses payload/options from the most recent trigger.

```ts
await myTask.trigger(
  { data: "latest-value" },
  {
    debounce: {
      key: "trailing-example",
      delay: "10s",
      mode: "trailing",
    },
  }
);
```

In trailing mode, these options update with each trigger:
- `payload` — task input data
- `metadata` — run metadata
- `tags` — run tags (replaces existing)
- `maxAttempts` — retry attempts
- `maxDuration` — maximum compute time
- `machine` — machine preset

### Important Notes

- Idempotency keys take precedence over debounce settings
- Compatible with `triggerAndWait()` — parent runs block correctly on debounced execution
- Debounce key is scoped to the task

## Concurrency & Queues

```ts
import { task, queue } from "@trigger.dev/sdk";

// Shared queue for related tasks
const emailQueue = queue({
  name: "email-processing",
  concurrencyLimit: 5, // Max 5 emails processing simultaneously
});

// Task-level concurrency
export const oneAtATime = task({
  id: "sequential-task",
  queue: { concurrencyLimit: 1 }, // Process one at a time
  run: async (payload) => {
    // Critical section - only one instance runs
  },
});

// Per-user concurrency
export const processUserData = task({
  id: "process-user-data",
  run: async (payload: { userId: string }) => {
    // Override queue with user-specific concurrency
    await childTask.trigger(payload, {
      queue: {
        name: `user-${payload.userId}`,
        concurrencyLimit: 2,
      },
    });
  },
});

export const emailTask = task({
  id: "send-email",
  queue: emailQueue, // Use shared queue
  run: async (payload: { to: string }) => {
    // Send email logic
  },
});
```

## Error Handling & Retries

```ts
import { task, retry, AbortTaskRunError } from "@trigger.dev/sdk";

export const resilientTask = task({
  id: "resilient-task",
  retry: {
    maxAttempts: 10,
    factor: 1.8, // Exponential backoff multiplier
    minTimeoutInMs: 500,
    maxTimeoutInMs: 30_000,
    randomize: false,
  },
  catchError: async ({ error, ctx }) => {
    // Custom error handling
    if (error.code === "FATAL_ERROR") {
      throw new AbortTaskRunError("Cannot retry this error");
    }

    // Log error details
    console.error(`Task ${ctx.task.id} failed:`, error);

    // Allow retry by returning nothing
    return { retryAt: new Date(Date.now() + 60000) }; // Retry in 1 minute
  },
  run: async (payload) => {
    // Retry specific operations
    const result = await retry.onThrow(
      async () => {
        return await unstableApiCall(payload);
      },
      { maxAttempts: 3 }
    );

    // Conditional HTTP retries
    const response = await retry.fetch("https://api.example.com", {
      retry: {
        maxAttempts: 5,
        condition: (response, error) => {
          return response?.status === 429 || response?.status >= 500;
        },
      },
    });

    return result;
  },
});
```

## Machines & Performance

```ts
export const heavyTask = task({
  id: "heavy-computation",
  machine: { preset: "large-2x" }, // 8 vCPU, 16 GB RAM
  maxDuration: 1800, // 30 minutes timeout
  run: async (payload, { ctx }) => {
    // Resource-intensive computation
    if (ctx.machine.preset === "large-2x") {
      // Use all available cores
      return await parallelProcessing(payload);
    }

    return await standardProcessing(payload);
  },
});

// Override machine when triggering
await heavyTask.trigger(payload, {
  machine: { preset: "medium-1x" }, // Override for this run
});
```

**Machine Presets:**

- `micro`: 0.25 vCPU, 0.25 GB RAM
- `small-1x`: 0.5 vCPU, 0.5 GB RAM (default)
- `small-2x`: 1 vCPU, 1 GB RAM
- `medium-1x`: 1 vCPU, 2 GB RAM
- `medium-2x`: 2 vCPU, 4 GB RAM
- `large-1x`: 4 vCPU, 8 GB RAM
- `large-2x`: 8 vCPU, 16 GB RAM

## Idempotency

```ts
import { task, idempotencyKeys } from "@trigger.dev/sdk";

export const paymentTask = task({
  id: "process-payment",
  retry: {
    maxAttempts: 3,
  },
  run: async (payload: { orderId: string; amount: number }) => {
    // Automatically scoped to this task run, so if the task is retried, the idempotency key will be the same
    const idempotencyKey = await idempotencyKeys.create(`payment-${payload.orderId}`);

    // Ensure payment is processed only once
    await chargeCustomer.trigger(payload, {
      idempotencyKey,
      idempotencyKeyTTL: "24h", // Key expires in 24 hours
    });
  },
});

// Payload-based idempotency
import { createHash } from "node:crypto";

function createPayloadHash(payload: any): string {
  const hash = createHash("sha256");
  hash.update(JSON.stringify(payload));
  return hash.digest("hex");
}

export const deduplicatedTask = task({
  id: "deduplicated-task",
  run: async (payload) => {
    const payloadHash = createPayloadHash(payload);
    const idempotencyKey = await idempotencyKeys.create(payloadHash);

    await processData.trigger(payload, { idempotencyKey });
  },
});
```

## Metadata & Progress Tracking

```ts
import { task, metadata } from "@trigger.dev/sdk";

export const batchProcessor = task({
  id: "batch-processor",
  run: async (payload: { items: any[] }, { ctx }) => {
    const totalItems = payload.items.length;

    // Initialize progress metadata
    metadata
      .set("progress", 0)
      .set("totalItems", totalItems)
      .set("processedItems", 0)
      .set("status", "starting");

    const results = [];

    for (let i = 0; i < payload.items.length; i++) {
      const item = payload.items[i];

      // Process item
      const result = await processItem(item);
      results.push(result);

      // Update progress
      const progress = ((i + 1) / totalItems) * 100;
      metadata
        .set("progress", progress)
        .increment("processedItems", 1)
        .append("logs", `Processed item ${i + 1}/${totalItems}`)
        .set("currentItem", item.id);
    }

    // Final status
    metadata.set("status", "completed");

    return { results, totalProcessed: results.length };
  },
});

// Update parent metadata from child task
export const childTask = task({
  id: "child-task",
  run: async (payload, { ctx }) => {
    // Update parent task metadata
    metadata.parent.set("childStatus", "processing");
    metadata.root.increment("childrenCompleted", 1);

    return { processed: true };
  },
});
```

## Logging & Tracing

```ts
import { task, logger } from "@trigger.dev/sdk";

export const tracedTask = task({
  id: "traced-task",
  run: async (payload, { ctx }) => {
    logger.info("Task started", { userId: payload.userId });

    // Custom trace with attributes
    const user = await logger.trace(
      "fetch-user",
      async (span) => {
        span.setAttribute("user.id", payload.userId);
        span.setAttribute("operation", "database-fetch");

        const userData = await database.findUser(payload.userId);
        span.setAttribute("user.found", !!userData);

        return userData;
      },
      { userId: payload.userId }
    );

    logger.debug("User fetched", { user: user.id });

    try {
      const result = await processUser(user);
      logger.info("Processing completed", { result });
      return result;
    } catch (error) {
      logger.error("Processing failed", {
        error: error.message,
        userId: payload.userId,
      });
      throw error;
    }
  },
});
```

## Hidden Tasks

```ts
// Hidden task - not exported, only used internally
const internalProcessor = task({
  id: "internal-processor",
  run: async (payload: { data: string }) => {
    return { processed: payload.data.toUpperCase() };
  },
});

// Public task that uses hidden task
export const publicWorkflow = task({
  id: "public-workflow",
  run: async (payload: { input: string }) => {
    // Use hidden task internally
    const result = await internalProcessor.triggerAndWait({
      data: payload.input,
    });

    if (result.ok) {
      return { output: result.output.processed };
    }

    throw new Error("Internal processing failed");
  },
});
```

## Best Practices

- **Concurrency**: Use queues to prevent overwhelming external services
- **Retries**: Configure exponential backoff for transient failures
- **Idempotency**: Always use for payment/critical operations
- **Metadata**: Track progress for long-running tasks
- **Machines**: Match machine size to computational requirements
- **Tags**: Use consistent naming patterns for filtering
- **Debouncing**: Use for user activity, webhooks, and notification batching
- **Batch triggering**: Use for bulk operations up to 1,000 items
- **Error Handling**: Distinguish between retryable and fatal errors

Design tasks to be stateless, idempotent, and resilient to failures. Use metadata for state tracking and queues for resource management.

<!-- TRIGGER.DEV advanced-tasks END -->

<!-- TRIGGER.DEV scheduled-tasks START -->
# Scheduled tasks (cron)

Recurring tasks using cron. For one-off future runs, use the **delay** option.

## Define a scheduled task

```ts
import { schedules } from "@trigger.dev/sdk";

export const task = schedules.task({
  id: "first-scheduled-task",
  run: async (payload) => {
    payload.timestamp; // Date (scheduled time, UTC)
    payload.lastTimestamp; // Date | undefined
    payload.timezone; // IANA, e.g. "America/New_York" (default "UTC")
    payload.scheduleId; // string
    payload.externalId; // string | undefined
    payload.upcoming; // Date[]

    payload.timestamp.toLocaleString("en-US", { timeZone: payload.timezone });
  },
});
```

> Scheduled tasks need at least one schedule attached to run.

## Attach schedules

**Declarative (sync on dev/deploy):**

```ts
schedules.task({
  id: "every-2h",
  cron: "0 */2 * * *", // UTC
  run: async () => {},
});

schedules.task({
  id: "tokyo-5am",
  cron: { pattern: "0 5 * * *", timezone: "Asia/Tokyo", environments: ["PRODUCTION", "STAGING"] },
  run: async () => {},
});
```

**Imperative (SDK or dashboard):**

```ts
await schedules.create({
  task: task.id,
  cron: "0 0 * * *",
  timezone: "America/New_York", // DST-aware
  externalId: "user_123",
  deduplicationKey: "user_123-daily", // updates if reused
});
```

### Dynamic / multi-tenant example

```ts
// /trigger/reminder.ts
export const reminderTask = schedules.task({
  id: "todo-reminder",
  run: async (p) => {
    if (!p.externalId) throw new Error("externalId is required");
    const user = await db.getUser(p.externalId);
    await sendReminderEmail(user);
  },
});
```

```ts
// app/reminders/route.ts
export async function POST(req: Request) {
  const data = await req.json();
  return Response.json(
    await schedules.create({
      task: reminderTask.id,
      cron: "0 8 * * *",
      timezone: data.timezone,
      externalId: data.userId,
      deduplicationKey: `${data.userId}-reminder`,
    })
  );
}
```

## Cron syntax (no seconds)

```
* * * * *
| | | | └ day of week (0–7 or 1L–7L; 0/7=Sun; L=last)
| | | └── month (1–12)
| | └──── day of month (1–31 or L)
| └────── hour (0–23)
└──────── minute (0–59)
```

## When schedules won't trigger

- **Dev:** only when the dev CLI is running.
- **Staging/Production:** only for tasks in the **latest deployment**.

## SDK management (quick refs)

```ts
await schedules.retrieve(id);
await schedules.list();
await schedules.update(id, { cron: "0 0 1 * *", externalId: "ext", deduplicationKey: "key" });
await schedules.deactivate(id);
await schedules.activate(id);
await schedules.del(id);
await schedules.timezones(); // list of IANA timezones
```

## Dashboard

Create/attach schedules visually (Task, Cron pattern, Timezone, Optional: External ID, Dedup key, Environments). Test scheduled tasks from the **Test** page.

<!-- TRIGGER.DEV scheduled-tasks END -->

<!-- TRIGGER.DEV config START -->
# Trigger.dev Configuration (v4)

**Complete guide to configuring `trigger.config.ts` with build extensions**

## Basic Configuration

```ts
import { defineConfig } from "@trigger.dev/sdk";

export default defineConfig({
  project: "<project-ref>", // Required: Your project reference
  dirs: ["./trigger"], // Task directories
  runtime: "node", // "node", "node-22", or "bun"
  logLevel: "info", // "debug", "info", "warn", "error"

  // Default retry settings
  retries: {
    enabledInDev: false,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
      randomize: true,
    },
  },

  // Build configuration
  build: {
    autoDetectExternal: true,
    keepNames: true,
    minify: false,
    extensions: [], // Build extensions go here
  },

  // Global lifecycle hooks
  onStartAttempt: async ({ payload, ctx }) => {
    console.log("Global task start");
  },
  onSuccess: async ({ payload, output, ctx }) => {
    console.log("Global task success");
  },
  onFailure: async ({ payload, error, ctx }) => {
    console.log("Global task failure");
  },
});
```

## Build Extensions

### Database & ORM

#### Prisma

```ts
import { prismaExtension } from "@trigger.dev/build/extensions/prisma";

extensions: [
  prismaExtension({
    schema: "prisma/schema.prisma",
    version: "5.19.0", // Optional: specify version
    migrate: true, // Run migrations during build
    directUrlEnvVarName: "DIRECT_DATABASE_URL",
    typedSql: true, // Enable TypedSQL support
  }),
];
```

#### TypeScript Decorators (for TypeORM)

```ts
import { emitDecoratorMetadata } from "@trigger.dev/build/extensions/typescript";

extensions: [
  emitDecoratorMetadata(), // Enables decorator metadata
];
```

### Scripting Languages

#### Python

```ts
import { pythonExtension } from "@trigger.dev/build/extensions/python";

extensions: [
  pythonExtension({
    scripts: ["./python/**/*.py"], // Copy Python files
    requirementsFile: "./requirements.txt", // Install packages
    devPythonBinaryPath: ".venv/bin/python", // Dev mode binary
  }),
];

// Usage in tasks
const result = await python.runInline(`print("Hello, world!")`);
const output = await python.runScript("./python/script.py", ["arg1"]);
```

### Browser Automation

#### Playwright

```ts
import { playwright } from "@trigger.dev/build/extensions/playwright";

extensions: [
  playwright({
    browsers: ["chromium", "firefox", "webkit"], // Default: ["chromium"]
    headless: true, // Default: true
  }),
];
```

#### Puppeteer

```ts
import { puppeteer } from "@trigger.dev/build/extensions/puppeteer";

extensions: [puppeteer()];

// Environment variable needed:
// PUPPETEER_EXECUTABLE_PATH: "/usr/bin/google-chrome-stable"
```

#### Lightpanda

```ts
import { lightpanda } from "@trigger.dev/build/extensions/lightpanda";

extensions: [
  lightpanda({
    version: "latest", // or "nightly"
    disableTelemetry: false,
  }),
];
```

### Media Processing

#### FFmpeg

```ts
import { ffmpeg } from "@trigger.dev/build/extensions/core";

extensions: [
  ffmpeg({ version: "7" }), // Static build, or omit for Debian version
];

// Automatically sets FFMPEG_PATH and FFPROBE_PATH
// Add fluent-ffmpeg to external packages if using
```

#### Audio Waveform

```ts
import { audioWaveform } from "@trigger.dev/build/extensions/audioWaveform";

extensions: [
  audioWaveform(), // Installs Audio Waveform 1.1.0
];
```

### System & Package Management

#### System Packages (apt-get)

```ts
import { aptGet } from "@trigger.dev/build/extensions/core";

extensions: [
  aptGet({
    packages: ["ffmpeg", "imagemagick", "curl=7.68.0-1"], // Can specify versions
  }),
];
```

#### Additional NPM Packages

Only use this for installing CLI tools, NOT packages you import in your code.

```ts
import { additionalPackages } from "@trigger.dev/build/extensions/core";

extensions: [
  additionalPackages({
    packages: ["wrangler"], // CLI tools and specific versions
  }),
];
```

#### Additional Files

```ts
import { additionalFiles } from "@trigger.dev/build/extensions/core";

extensions: [
  additionalFiles({
    files: ["wrangler.toml", "./assets/**", "./fonts/**"], // Glob patterns supported
  }),
];
```

### Environment & Build Tools

#### Environment Variable Sync

```ts
import { syncEnvVars } from "@trigger.dev/build/extensions/core";

extensions: [
  syncEnvVars(async (ctx) => {
    // ctx contains: environment, projectRef, env
    return [
      { name: "SECRET_KEY", value: await getSecret(ctx.environment) },
      { name: "API_URL", value: ctx.environment === "prod" ? "api.prod.com" : "api.dev.com" },
    ];
  }),
];
```

#### ESBuild Plugins

```ts
import { esbuildPlugin } from "@trigger.dev/build/extensions";
import { sentryEsbuildPlugin } from "@sentry/esbuild-plugin";

extensions: [
  esbuildPlugin(
    sentryEsbuildPlugin({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
    }),
    { placement: "last", target: "deploy" } // Optional config
  ),
];
```

## Custom Build Extensions

```ts
import { defineConfig } from "@trigger.dev/sdk";

const customExtension = {
  name: "my-custom-extension",

  externalsForTarget: (target) => {
    return ["some-native-module"]; // Add external dependencies
  },

  onBuildStart: async (context) => {
    console.log(`Build starting for ${context.target}`);
    // Register esbuild plugins, modify build context
  },

  onBuildComplete: async (context, manifest) => {
    console.log("Build complete, adding layers");
    // Add build layers, modify deployment
    context.addLayer({
      id: "my-layer",
      files: [{ source: "./custom-file", destination: "/app/custom" }],
      commands: ["chmod +x /app/custom"],
    });
  },
};

export default defineConfig({
  project: "my-project",
  build: {
    extensions: [customExtension],
  },
});
```

## Advanced Configuration

### Telemetry

```ts
import { PrismaInstrumentation } from "@prisma/instrumentation";
import { OpenAIInstrumentation } from "@langfuse/openai";

export default defineConfig({
  // ... other config
  telemetry: {
    instrumentations: [new PrismaInstrumentation(), new OpenAIInstrumentation()],
    exporters: [customExporter], // Optional custom exporters
  },
});
```

### Machine & Performance

```ts
export default defineConfig({
  // ... other config
  defaultMachine: "large-1x", // Default machine for all tasks
  maxDuration: 300, // Default max duration (seconds)
  enableConsoleLogging: true, // Console logging in development
});
```

## Common Extension Combinations

### Full-Stack Web App

```ts
extensions: [
  prismaExtension({ schema: "prisma/schema.prisma", migrate: true }),
  additionalFiles({ files: ["./public/**", "./assets/**"] }),
  syncEnvVars(async (ctx) => [...envVars]),
];
```

### AI/ML Processing

```ts
extensions: [
  pythonExtension({
    scripts: ["./ai/**/*.py"],
    requirementsFile: "./requirements.txt",
  }),
  ffmpeg({ version: "7" }),
  additionalPackages({ packages: ["wrangler"] }),
];
```

### Web Scraping

```ts
extensions: [
  playwright({ browsers: ["chromium"] }),
  puppeteer(),
  additionalFiles({ files: ["./selectors.json", "./proxies.txt"] }),
];
```

## Best Practices

- **Use specific versions**: Pin extension versions for reproducible builds
- **External packages**: Add modules with native addons to the `build.external` array
- **Environment sync**: Use `syncEnvVars` for dynamic secrets
- **File paths**: Use glob patterns for flexible file inclusion
- **Debug builds**: Use `--log-level debug --dry-run` for troubleshooting

Extensions only affect deployment, not local development. Use `external` array for packages that shouldn't be bundled.

<!-- TRIGGER.DEV config END -->

<!-- TRIGGER.DEV realtime START -->
# Trigger.dev Realtime (v4)

**Real-time monitoring and updates for runs**

## Core Concepts

Realtime allows you to:

- Subscribe to run status changes, metadata updates, and streams
- Build real-time dashboards and UI updates
- Monitor task progress from frontend and backend

## Authentication

### Public Access Tokens

```ts
import { auth } from "@trigger.dev/sdk";

// Read-only token for specific runs
const publicToken = await auth.createPublicToken({
  scopes: {
    read: {
      runs: ["run_123", "run_456"],
      tasks: ["my-task-1", "my-task-2"],
    },
  },
  expirationTime: "1h", // Default: 15 minutes
});
```

### Trigger Tokens (Frontend only)

```ts
// Single-use token for triggering tasks
const triggerToken = await auth.createTriggerPublicToken("my-task", {
  expirationTime: "30m",
});
```

## Backend Usage

### Subscribe to Runs

```ts
import { runs, tasks } from "@trigger.dev/sdk";

// Trigger and subscribe
const handle = await tasks.trigger("my-task", { data: "value" });

// Subscribe to specific run
for await (const run of runs.subscribeToRun<typeof myTask>(handle.id)) {
  console.log(`Status: ${run.status}, Progress: ${run.metadata?.progress}`);
  if (run.status === "COMPLETED") break;
}

// Subscribe to runs with tag
for await (const run of runs.subscribeToRunsWithTag("user-123")) {
  console.log(`Tagged run ${run.id}: ${run.status}`);
}

// Subscribe to batch
for await (const run of runs.subscribeToBatch(batchId)) {
  console.log(`Batch run ${run.id}: ${run.status}`);
}
```

### Realtime Streams v2 (Recommended)

```ts
import { streams, InferStreamType } from "@trigger.dev/sdk";

// 1. Define streams (shared location)
export const aiStream = streams.define<string>({
  id: "ai-output",
});

export type AIStreamPart = InferStreamType<typeof aiStream>;

// 2. Pipe from task
export const streamingTask = task({
  id: "streaming-task",
  run: async (payload) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: payload.prompt }],
      stream: true,
    });

    const { waitUntilComplete } = aiStream.pipe(completion);
    await waitUntilComplete();
  },
});

// 3. Read from backend
const stream = await aiStream.read(runId, {
  timeoutInSeconds: 300,
  startIndex: 0, // Resume from specific chunk
});

for await (const chunk of stream) {
  console.log("Chunk:", chunk); // Fully typed
}
```

Enable v2 by upgrading to 4.1.0 or later.

## React Frontend Usage

### Installation

```bash
npm add @trigger.dev/react-hooks
```

### Triggering Tasks

```tsx
"use client";
import { useTaskTrigger, useRealtimeTaskTrigger } from "@trigger.dev/react-hooks";
import type { myTask } from "../trigger/tasks";

function TriggerComponent({ accessToken }: { accessToken: string }) {
  // Basic trigger
  const { submit, handle, isLoading } = useTaskTrigger<typeof myTask>("my-task", {
    accessToken,
  });

  // Trigger with realtime updates
  const {
    submit: realtimeSubmit,
    run,
    isLoading: isRealtimeLoading,
  } = useRealtimeTaskTrigger<typeof myTask>("my-task", { accessToken });

  return (
    <div>
      <button onClick={() => submit({ data: "value" })} disabled={isLoading}>
        Trigger Task
      </button>

      <button onClick={() => realtimeSubmit({ data: "realtime" })} disabled={isRealtimeLoading}>
        Trigger with Realtime
      </button>

      {run && <div>Status: {run.status}</div>}
    </div>
  );
}
```

### Subscribing to Runs

```tsx
"use client";
import { useRealtimeRun, useRealtimeRunsWithTag } from "@trigger.dev/react-hooks";
import type { myTask } from "../trigger/tasks";

function SubscribeComponent({ runId, accessToken }: { runId: string; accessToken: string }) {
  // Subscribe to specific run
  const { run, error } = useRealtimeRun<typeof myTask>(runId, {
    accessToken,
    onComplete: (run) => {
      console.log("Task completed:", run.output);
    },
  });

  // Subscribe to tagged runs
  const { runs } = useRealtimeRunsWithTag("user-123", { accessToken });

  if (error) return <div>Error: {error.message}</div>;
  if (!run) return <div>Loading...</div>;

  return (
    <div>
      <div>Status: {run.status}</div>
      <div>Progress: {run.metadata?.progress || 0}%</div>
      {run.output && <div>Result: {JSON.stringify(run.output)}</div>}

      <h3>Tagged Runs:</h3>
      {runs.map((r) => (
        <div key={r.id}>
          {r.id}: {r.status}
        </div>
      ))}
    </div>
  );
}
```

### Realtime Streams with React

```tsx
"use client";
import { useRealtimeStream } from "@trigger.dev/react-hooks";
import { aiStream } from "../trigger/streams";

function StreamComponent({ runId, accessToken }: { runId: string; accessToken: string }) {
  // Pass defined stream directly for type safety
  const { parts, error } = useRealtimeStream(aiStream, runId, {
    accessToken,
    timeoutInSeconds: 300,
    throttleInMs: 50, // Control re-render frequency
  });

  if (error) return <div>Error: {error.message}</div>;
  if (!parts) return <div>Loading...</div>;

  const text = parts.join(""); // parts is typed as AIStreamPart[]

  return <div>Streamed Text: {text}</div>;
}
```

### Wait Tokens

```tsx
"use client";
import { useWaitToken } from "@trigger.dev/react-hooks";

function WaitTokenComponent({ tokenId, accessToken }: { tokenId: string; accessToken: string }) {
  const { complete } = useWaitToken(tokenId, { accessToken });

  return <button onClick={() => complete({ approved: true })}>Approve Task</button>;
}
```

### SWR Hooks (Fetch Once)

```tsx
"use client";
import { useRun } from "@trigger.dev/react-hooks";
import type { myTask } from "../trigger/tasks";

function SWRComponent({ runId, accessToken }: { runId: string; accessToken: string }) {
  const { run, error, isLoading } = useRun<typeof myTask>(runId, {
    accessToken,
    refreshInterval: 0, // Disable polling (recommended)
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <div>Run: {run?.status}</div>;
}
```

## Run Object Properties

Key properties available in run subscriptions:

- `id`: Unique run identifier
- `status`: `QUEUED`, `EXECUTING`, `COMPLETED`, `FAILED`, `CANCELED`, etc.
- `payload`: Task input data (typed)
- `output`: Task result (typed, when completed)
- `metadata`: Real-time updatable data
- `createdAt`, `updatedAt`: Timestamps
- `costInCents`: Execution cost

## Best Practices

- **Use Realtime over SWR**: Recommended for most use cases due to rate limits
- **Scope tokens properly**: Only grant necessary read/trigger permissions
- **Handle errors**: Always check for errors in hooks and subscriptions
- **Type safety**: Use task types for proper payload/output typing
- **Cleanup subscriptions**: Backend subscriptions auto-complete, frontend hooks auto-cleanup

<!-- TRIGGER.DEV realtime END -->