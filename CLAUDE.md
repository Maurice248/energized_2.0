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
| 16 | AI / LLM Integration | Vercel AI SDK + Claude |
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
│   │   ├── ai.ts                # Vercel AI SDK + Claude wrapper
│   │   └── utils.ts             # cn(), formatters, etc.
│   ├── emails/                  # React Email templates
│   ├── jobs/                    # Trigger.dev task definitions
│   ├── middleware.ts            # Edge auth + rate-limit
│   ├── env.ts                   # Typed env (zod)
│   └── styles/globals.css
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
- `@/app/*`, `@/components/*`, `@/server/*`, `@/lib/*`, `@/emails/*`, `@/jobs/*`

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
// src/jobs/send-application-email.ts
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

## 18. Layer 16 — AI / LLM Integration (Vercel AI SDK + Claude)

**Primary AI use cases**
1. **Profile Polish** — rewrite bullet points to highlight measurable impact ("Reduced flare gas volume by 18% at Site-14").
2. **Job Match Scoring** — score a candidate ↔ listing fit and explain it.
3. **Cover Note Generator** — draft a short, sector-aware note.
4. **Posting Assistant** — help employers write inclusive, clear job posts.

```ts
// src/lib/ai.ts
import { anthropic } from "@ai-sdk/anthropic";
import { generateText, streamText } from "ai";
import { env } from "@/env";

export const claude = anthropic("claude-opus-4-6");

export async function scoreJobMatch(input: { profile: string; job: string }) {
  const { text } = await generateText({
    model: claude,
    system: "You are an energy-sector recruiter. Score 0-100 and explain briefly.",
    prompt: `PROFILE:\n${input.profile}\n\nJOB:\n${input.job}\n\nReturn JSON {score, reason}.`,
    maxTokens: 400,
  });
  return JSON.parse(text) as { score: number; reason: string };
}
```

```tsx
// src/app/api/ai/cover-note/route.ts — streaming endpoint
import { streamText } from "ai";
import { claude } from "@/lib/ai";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { profile, job } = await req.json();
  const result = streamText({
    model: claude,
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
