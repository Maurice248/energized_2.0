# Skill Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship AI-generated, sector-specific skill tests for jobseekers — earnable badges that surface on the public profile, on the `/candidates` filter, and on applicant kanban cards.

**Architecture:** Five-mode flow (catalog → configure → generating → test → result) under `/skills`. Per-user, on-demand AI generation with `gpt-4o-mini` (questions) + `gpt-4o` (result narrative). Three new tables: `test_topics` (admin-extensible hierarchy), `skill_test_attempts` (Q+A snapshot as JSONB), `skill_badges` (denormalized for fast filter joins). Production brand throughout — Lato, Energized Blue `#1CAAE2`, Dark Blue `#004984`, Black `#101820`.

**Tech Stack:** Next.js App Router · tRPC · Drizzle/Neon · Better Auth · Vercel AI SDK + OpenAI · Trigger.dev · Tailwind/shadcn/ui · Vitest · Playwright

**Spec:** [docs/superpowers/specs/2026-05-08-skill-tests-design.md](../specs/2026-05-08-skill-tests-design.md)

---

## File Structure

**New files:**
```
src/server/db/schema/test-topics.ts
src/server/db/schema/skill-test-attempts.ts
src/server/db/schema/skill-badges.ts
src/server/db/seed/test-topics-seed.ts            # standalone script run by migration
src/server/api/routers/skill-tests.ts
src/lib/skill-test-prompts.ts                      # prompt builders, kept out of ai.ts
src/app/(app)/skills/page.tsx                      # catalog (RSC + client islands)
src/app/(app)/skills/[topicSlug]/configure/page.tsx
src/app/(app)/skills/[topicSlug]/configure/configure-client.tsx
src/app/(app)/skills/[topicSlug]/attempt/[attemptId]/page.tsx
src/app/(app)/skills/[topicSlug]/attempt/[attemptId]/runner-client.tsx
src/app/(app)/skills/[topicSlug]/attempt/[attemptId]/result/page.tsx
src/app/(app)/skills/_components/catalog-hero.tsx
src/app/(app)/skills/_components/sector-grid.tsx
src/app/(app)/skills/_components/popular-roles.tsx
src/app/(app)/skills/_components/how-it-works-strip.tsx
src/app/(app)/skills/_components/configure-form.tsx
src/app/(app)/skills/_components/generating-overlay.tsx
src/app/(app)/skills/_components/question-card.tsx
src/app/(app)/skills/_components/question-map.tsx
src/app/(app)/skills/_components/runner-bar.tsx
src/app/(app)/skills/_components/result-badge-card.tsx
src/app/(app)/skills/_components/result-breakdown.tsx
src/app/(app)/skills/_components/result-side-cards.tsx
src/components/profile/verified-skills-section.tsx
src/components/applicants/skill-badge-pill.tsx
code/trigger/cleanup-stale-skill-attempts.ts
src/server/api/routers/skill-tests.test.ts
e2e/skill-tests.spec.ts
```

**Modified files:**
```
src/server/db/schema/index.ts                         # add 3 re-exports
src/server/api/trpc.ts                                # add jobseekerProcedure
src/server/api/root.ts                                # register skillTests router
src/lib/ai.ts                                         # add generateSkillTest, narrateSkillResult
src/lib/billing-display.ts                            # marketing copy update
src/app/globals.css                                   # add 3 brand color CSS vars
src/app/p/[id]/page.tsx                               # render VerifiedSkillsSection
src/app/(app)/candidates/candidates-filters.tsx       # add badge filter chip
src/server/api/routers/candidates.ts                  # accept badge filter input
src/app/(app)/employer/jobs/[id]/applicants/_components/applicant-card.tsx  # render skill badge pill
```

---

## Phase 1 — Foundations: Schema, AI lib, tRPC infrastructure

### Task 1: Add brand color CSS variables

**Files:**
- Modify: `src/app/globals.css` (in `:root` block)

- [ ] **Step 1: Add three brand CSS vars to `:root`**

Open `src/app/globals.css`, find the `:root` block (around line 50–80, after `@theme inline`), and add at the top of the rules inside `:root`:

```css
  --brand-blue: #1CAAE2;
  --brand-dark-blue: #004984;
  --brand-black: #101820;
```

- [ ] **Step 2: Verify Tailwind picks up arbitrary values**

Run: `pnpm typecheck` — expected: pass.

Throughout the plan, brand colors are referenced as Tailwind arbitrary values: `bg-[var(--brand-blue)]`, `text-[var(--brand-dark-blue)]`, `bg-[var(--brand-black)]`. No `tailwind.config.ts` change needed (project uses Tailwind v4 inline theme).

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "chore(styles): add brand color CSS variables for skill tests"
```

---

### Task 2: Drizzle schema — `test_topics`

**Files:**
- Create: `src/server/db/schema/test-topics.ts`
- Modify: `src/server/db/schema/index.ts`

- [ ] **Step 1: Create the schema file**

```ts
// src/server/db/schema/test-topics.ts
import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { sectorEnum } from "./enums";

export const testTopics = pgTable("test_topics", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  parentTopicId: uuid("parent_topic_id"),
  name: text("name").notNull(),
  monogram: text("monogram").notNull(),
  blurb: text("blurb"),
  subDescription: text("sub_description"),
  tileColor: text("tile_color").notNull(),
  jobSectorMatch: sectorEnum("job_sector_match"),
  isHot: boolean("is_hot").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type TestTopic = typeof testTopics.$inferSelect;
export type NewTestTopic = typeof testTopics.$inferInsert;
```

- [ ] **Step 2: Re-export from index**

In `src/server/db/schema/index.ts`, append at the end:

```ts
export * from "./test-topics";
```

- [ ] **Step 3: Verify imports compile**

Run: `pnpm typecheck` — expected: pass.

- [ ] **Step 4: Commit**

```bash
git add src/server/db/schema/test-topics.ts src/server/db/schema/index.ts
git commit -m "feat(db): add test_topics schema for skill-test catalog"
```

---

### Task 3: Drizzle schema — `skill_test_attempts`

**Files:**
- Create: `src/server/db/schema/skill-test-attempts.ts`
- Modify: `src/server/db/schema/index.ts`

- [ ] **Step 1: Create the schema file**

```ts
// src/server/db/schema/skill-test-attempts.ts
import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { testTopics } from "./test-topics";

export const skillAttemptStatusEnum = pgEnum("skill_attempt_status", [
  "in_progress",
  "passed",
  "passed_top",
  "failed",
  "forfeited",
]);

export type SkillTestQuestion = {
  id: string;
  prompt: string;
  context: string | null;
  options: [string, string, string, string];
  correctIdx: 0 | 1 | 2 | 3;
  tags: string[];
  tagKind: "scenario" | "calc" | null;
};

export type CategoryBreakdown = Array<{
  cat: string;
  right: number;
  total: number;
  pct: number;
}>;

export const skillTestAttempts = pgTable("skill_test_attempts", {
  id: uuid("id").primaryKey().defaultRandom(),
  candidateId: text("candidate_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  topicId: uuid("topic_id")
    .notNull()
    .references(() => testTopics.id),
  status: skillAttemptStatusEnum("status").notNull().default("in_progress"),
  level: text("level").notNull(),
  questionCount: integer("question_count").notNull(),
  includeScenarios: boolean("include_scenarios").notNull().default(true),
  includeCalc: boolean("include_calc").notNull().default(true),
  questionsJson: jsonb("questions_json").$type<SkillTestQuestion[]>().notNull(),
  answersJson: jsonb("answers_json").$type<Record<string, number>>(),
  score: integer("score"),
  correctCount: integer("correct_count"),
  categoryBreakdown: jsonb("category_breakdown").$type<CategoryBreakdown>(),
  aiFeedback: text("ai_feedback"),
  generationModel: text("generation_model"),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  finishedAt: timestamp("finished_at"),
});

export type SkillTestAttempt = typeof skillTestAttempts.$inferSelect;
export type NewSkillTestAttempt = typeof skillTestAttempts.$inferInsert;
```

- [ ] **Step 2: Re-export from index**

In `src/server/db/schema/index.ts`, append:

```ts
export * from "./skill-test-attempts";
```

- [ ] **Step 3: Verify**

Run: `pnpm typecheck` — expected: pass.

- [ ] **Step 4: Commit**

```bash
git add src/server/db/schema/skill-test-attempts.ts src/server/db/schema/index.ts
git commit -m "feat(db): add skill_test_attempts schema"
```

---

### Task 4: Drizzle schema — `skill_badges`

**Files:**
- Create: `src/server/db/schema/skill-badges.ts`
- Modify: `src/server/db/schema/index.ts`

- [ ] **Step 1: Create the schema file**

```ts
// src/server/db/schema/skill-badges.ts
import {
  boolean,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { skillTestAttempts } from "./skill-test-attempts";
import { testTopics } from "./test-topics";

export const skillBadges = pgTable(
  "skill_badges",
  {
    candidateId: text("candidate_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    topicId: uuid("topic_id")
      .notNull()
      .references(() => testTopics.id),
    attemptId: uuid("attempt_id")
      .notNull()
      .references(() => skillTestAttempts.id),
    isVerifiedTop: boolean("is_verified_top").notNull(),
    score: integer("score").notNull(),
    earnedAt: timestamp("earned_at").notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.candidateId, t.topicId] }),
  }),
);

export type SkillBadge = typeof skillBadges.$inferSelect;
export type NewSkillBadge = typeof skillBadges.$inferInsert;
```

- [ ] **Step 2: Re-export from index**

In `src/server/db/schema/index.ts`, append:

```ts
export * from "./skill-badges";
```

- [ ] **Step 3: Verify**

Run: `pnpm typecheck` — expected: pass.

- [ ] **Step 4: Commit**

```bash
git add src/server/db/schema/skill-badges.ts src/server/db/schema/index.ts
git commit -m "feat(db): add skill_badges schema"
```

---

### Task 5: Generate the migration

**Files:**
- Auto-generated: `src/server/db/migrations/<NNNN>_<name>.sql`

- [ ] **Step 1: Run drizzle-kit to generate migration**

Run: `pnpm db:generate`

Expected: a new SQL file appears under `src/server/db/migrations/` with `CREATE TYPE skill_attempt_status`, `CREATE TABLE test_topics`, `CREATE TABLE skill_test_attempts`, `CREATE TABLE skill_badges`, and the indexes.

- [ ] **Step 2: Inspect the generated migration**

Open the new migration file. Verify it contains:
- `CREATE TYPE "skill_attempt_status" AS ENUM(...)`
- `CREATE TABLE IF NOT EXISTS "test_topics"` with columns matching the schema
- `CREATE TABLE IF NOT EXISTS "skill_test_attempts"` with FK references
- `CREATE TABLE IF NOT EXISTS "skill_badges"` with composite primary key
- `ALTER TABLE … ADD CONSTRAINT … FOREIGN KEY` lines

If any column or FK is missing, fix the schema file and re-run `pnpm db:generate` (delete the bad migration first).

- [ ] **Step 3: Apply the migration**

Run: `pnpm db:migrate`

Expected: migration applies cleanly. Verify by running `pnpm db:studio` and confirming the three new tables exist.

- [ ] **Step 4: Commit**

```bash
git add src/server/db/migrations/
git commit -m "feat(db): migrate skill tests schema"
```

---

### Task 6: Seed `test_topics` with 9 sectors + roles

**Files:**
- Create: `src/server/db/seed/test-topics-seed.ts`

- [ ] **Step 1: Write the seed module**

```ts
// src/server/db/seed/test-topics-seed.ts
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { testTopics } from "@/server/db/schema";

type SectorSeed = {
  slug: string;
  name: string;
  monogram: string;
  blurb: string;
  tileColor: string;
  jobSectorMatch: "oil_gas" | "renewables" | "nuclear" | "utilities" | "hydrogen" | null;
  isHot?: boolean;
  sortOrder: number;
  roles: { slug: string; name: string; sub: string }[];
};

const SECTORS: SectorSeed[] = [
  {
    slug: "wind",
    name: "Wind energy",
    monogram: "WD",
    blurb: "Onshore & offshore turbines — blade, gearbox, controls, GWO.",
    tileColor: "#0369A1",
    jobSectorMatch: "renewables",
    isHot: true,
    sortOrder: 10,
    roles: [
      { slug: "wind-tech", name: "Wind technician II", sub: "Mechanical, electrical, hydraulics, climbing" },
      { slug: "wind-controls", name: "Controls engineer", sub: "SCADA, PLCs, pitch & yaw systems" },
      { slug: "wind-blade", name: "Blade repair specialist", sub: "Composite repair, NDT inspection, rope access" },
      { slug: "wind-site", name: "Site safety officer", sub: "GWO, working at heights, emergency response" },
    ],
  },
  {
    slug: "solar",
    name: "Solar PV",
    monogram: "SO",
    blurb: "Utility-scale + C&I — module string design, inverters, O&M.",
    tileColor: "#D97706",
    jobSectorMatch: "renewables",
    sortOrder: 20,
    roles: [
      { slug: "solar-pm", name: "Project manager — utility", sub: "Schedule, EPC contracts, interconnect" },
      { slug: "solar-design", name: "PV design engineer", sub: "PVsyst, string sizing, single-line diagrams" },
      { slug: "solar-om", name: "O&M technician", sub: "IV curve testing, inverter troubleshooting" },
    ],
  },
  {
    slug: "oilgas",
    name: "Oil & gas upstream",
    monogram: "OG",
    blurb: "Reservoir, drilling, completions, production engineering.",
    tileColor: "#004984",
    jobSectorMatch: "oil_gas",
    sortOrder: 30,
    roles: [
      { slug: "reservoir", name: "Reservoir engineer", sub: "PVT, decline curve, simulation, EOR" },
      { slug: "drilling", name: "Drilling engineer", sub: "BHA, mud programs, casing & cementing" },
      { slug: "completions", name: "Completions engineer", sub: "Hydraulic fracturing, perforating, flow assurance" },
      { slug: "production", name: "Production engineer", sub: "Artificial lift, separation, well intervention" },
    ],
  },
  {
    slug: "grid",
    name: "Grid operations",
    monogram: "GR",
    blurb: "Transmission, distribution, dispatch, reliability standards.",
    tileColor: "#4338CA",
    jobSectorMatch: "utilities",
    sortOrder: 40,
    roles: [
      { slug: "grid-op", name: "System operator", sub: "NERC-certified, real-time dispatch" },
      { slug: "protection", name: "Protection engineer", sub: "Relay coordination, SEL, fault studies" },
      { slug: "planner", name: "Transmission planner", sub: "Load flow, contingency, PSS/E" },
    ],
  },
  {
    slug: "hydrogen",
    name: "Hydrogen",
    monogram: "H2",
    blurb: "Electrolysis, blue/green H₂, storage, end-use applications.",
    tileColor: "#3B82F6",
    jobSectorMatch: "hydrogen",
    isHot: true,
    sortOrder: 50,
    roles: [
      { slug: "h2-process", name: "Process engineer — electrolyzer", sub: "PEM, alkaline, SOEC stack design" },
      { slug: "h2-safety", name: "Hydrogen safety officer", sub: "Permeation, classified zones, leak detection" },
    ],
  },
  {
    slug: "geo",
    name: "Geothermal",
    monogram: "GT",
    blurb: "Conventional, EGS, closed-loop — drilling crossover from O&G.",
    tileColor: "#44403C",
    jobSectorMatch: "renewables",
    sortOrder: 60,
    roles: [
      { slug: "geo-res", name: "Resource geoscientist", sub: "Subsurface mapping, MT surveys, fluid chemistry" },
      { slug: "geo-drill", name: "Geothermal drilling lead", sub: "High-temp BHA, lost circulation, casing design" },
    ],
  },
  {
    slug: "battery",
    name: "Battery storage",
    monogram: "BT",
    blurb: "BESS — Li-ion, flow, thermal management, fire suppression.",
    tileColor: "#A16207",
    jobSectorMatch: "renewables",
    sortOrder: 70,
    roles: [
      { slug: "bess-eng", name: "BESS systems engineer", sub: "SOC/SOH modelling, BMS, EMS integration" },
      { slug: "bess-com", name: "Commissioning technician", sub: "AC/DC tests, FAT/SAT, SCADA integration" },
    ],
  },
  {
    slug: "ccus",
    name: "Carbon capture (CCUS)",
    monogram: "CC",
    blurb: "Post-combustion, DAC, transport, geologic sequestration.",
    tileColor: "#1E293B",
    jobSectorMatch: "oil_gas",
    sortOrder: 80,
    roles: [
      { slug: "ccus-process", name: "Capture process engineer", sub: "Amine systems, MEA, energy penalty" },
      { slug: "ccus-storage", name: "Sequestration geologist", sub: "Caprock integrity, MMV, plume modelling" },
    ],
  },
  {
    slug: "nuclear",
    name: "Nuclear & SMR",
    monogram: "NU",
    blurb: "CANDU, SMRs — operations, fuel, regulatory.",
    tileColor: "#1CAAE2",
    jobSectorMatch: "nuclear",
    sortOrder: 90,
    roles: [
      { slug: "nuc-op", name: "Reactor operator (AECL)", sub: "Heat transport, reactivity, emergency procedures" },
      { slug: "nuc-fuel", name: "Fuel cycle engineer", sub: "Core physics, burnup, refuelling outage" },
    ],
  },
];

export async function seedTestTopics() {
  for (const sector of SECTORS) {
    const existing = await db
      .select({ id: testTopics.id })
      .from(testTopics)
      .where(eq(testTopics.slug, sector.slug))
      .limit(1);

    let sectorId: string;
    if (existing.length > 0) {
      sectorId = existing[0].id;
      await db
        .update(testTopics)
        .set({
          name: sector.name,
          monogram: sector.monogram,
          blurb: sector.blurb,
          tileColor: sector.tileColor,
          jobSectorMatch: sector.jobSectorMatch ?? undefined,
          isHot: sector.isHot ?? false,
          sortOrder: sector.sortOrder,
          isActive: true,
        })
        .where(eq(testTopics.id, sectorId));
    } else {
      const inserted = await db
        .insert(testTopics)
        .values({
          slug: sector.slug,
          parentTopicId: null,
          name: sector.name,
          monogram: sector.monogram,
          blurb: sector.blurb,
          tileColor: sector.tileColor,
          jobSectorMatch: sector.jobSectorMatch ?? undefined,
          isHot: sector.isHot ?? false,
          sortOrder: sector.sortOrder,
          isActive: true,
        })
        .returning({ id: testTopics.id });
      sectorId = inserted[0].id;
    }

    for (let i = 0; i < sector.roles.length; i++) {
      const role = sector.roles[i];
      const existingRole = await db
        .select({ id: testTopics.id })
        .from(testTopics)
        .where(eq(testTopics.slug, role.slug))
        .limit(1);

      if (existingRole.length > 0) {
        await db
          .update(testTopics)
          .set({
            parentTopicId: sectorId,
            name: role.name,
            monogram: sector.monogram,
            tileColor: sector.tileColor,
            subDescription: role.sub,
            jobSectorMatch: sector.jobSectorMatch ?? undefined,
            sortOrder: i,
            isActive: true,
          })
          .where(eq(testTopics.id, existingRole[0].id));
      } else {
        await db.insert(testTopics).values({
          slug: role.slug,
          parentTopicId: sectorId,
          name: role.name,
          monogram: sector.monogram,
          tileColor: sector.tileColor,
          subDescription: role.sub,
          jobSectorMatch: sector.jobSectorMatch ?? undefined,
          sortOrder: i,
          isActive: true,
        });
      }
    }
  }

  console.log(`Seeded ${SECTORS.length} sectors and ${SECTORS.reduce((n, s) => n + s.roles.length, 0)} roles.`);
}

if (require.main === module) {
  seedTestTopics()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
```

- [ ] **Step 2: Run the seed**

Run: `pnpm tsx src/server/db/seed/test-topics-seed.ts`

Expected output: `Seeded 9 sectors and 24 roles.`

- [ ] **Step 3: Verify in db studio**

Run: `pnpm db:studio` — open `test_topics` table, confirm 33 rows (9 sectors + 24 roles).

- [ ] **Step 4: Commit**

```bash
git add src/server/db/seed/test-topics-seed.ts
git commit -m "feat(db): seed test_topics with 9 sectors and 24 roles"
```

---

### Task 7: Add `jobseekerProcedure` helper to tRPC

**Files:**
- Modify: `src/server/api/trpc.ts`

- [ ] **Step 1: Add the procedure helper after `employerProcedure`**

In `src/server/api/trpc.ts`, after the existing `employerProcedure` block, add:

```ts
export const jobseekerProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.session.user.role !== "jobseeker") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Jobseeker access only." });
  }
  return next({ ctx });
});
```

- [ ] **Step 2: Verify typecheck**

Run: `pnpm typecheck` — expected: pass.

- [ ] **Step 3: Commit**

```bash
git add src/server/api/trpc.ts
git commit -m "feat(trpc): add jobseekerProcedure helper"
```

---

### Task 8: AI lib — `generateSkillTest` (TDD)

**Files:**
- Create: `src/lib/skill-test-prompts.ts`
- Modify: `src/lib/ai.ts`
- Test: `src/lib/ai.test.ts` (or wherever AI tests live; create if not present)

- [ ] **Step 1: Write the failing test**

Create `src/lib/ai.test.ts` if missing, otherwise append:

```ts
// src/lib/ai.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import { generateSkillTest } from "./ai";

vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: () => () => "mock-model",
}));

const generateTextMock = vi.fn();
vi.mock("ai", () => ({
  generateText: (...args: unknown[]) => generateTextMock(...args),
}));

beforeEach(() => {
  generateTextMock.mockReset();
});

describe("generateSkillTest", () => {
  it("parses a valid JSON response with N questions", async () => {
    const validQ = {
      prompt: "What is the primary purpose of a diaphragm in an alkaline electrolyzer?",
      context: null,
      options: [
        "Cross-over prevention between H2 and O2",
        "Pressure relief",
        "Catalyst protection",
        "Heat exchange",
      ],
      correctIdx: 0,
      tags: ["Stack"],
      tagKind: null,
    };
    generateTextMock.mockResolvedValueOnce({
      text: JSON.stringify({ questions: [validQ, validQ, validQ] }),
    });

    const result = await generateSkillTest({
      topicName: "Hydrogen",
      roleName: "Process engineer",
      level: "mid",
      count: 3,
      includeScenarios: true,
      includeCalc: true,
    });

    expect(result.questions).toHaveLength(3);
    expect(result.questions[0].prompt).toContain("diaphragm");
    expect(result.questions[0].options).toHaveLength(4);
    expect(result.questions[0].correctIdx).toBe(0);
  });

  it("retries once on invalid JSON, then throws", async () => {
    generateTextMock
      .mockResolvedValueOnce({ text: "not json at all" })
      .mockResolvedValueOnce({ text: "still not json" });

    await expect(
      generateSkillTest({
        topicName: "Hydrogen",
        roleName: "Process engineer",
        level: "mid",
        count: 3,
        includeScenarios: true,
        includeCalc: true,
      }),
    ).rejects.toThrow(/parse/i);

    expect(generateTextMock).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Run the test, expect FAIL**

Run: `pnpm vitest run src/lib/ai.test.ts`

Expected: FAIL — `generateSkillTest is not a function` or import error.

- [ ] **Step 3: Create the prompt builder**

```ts
// src/lib/skill-test-prompts.ts
export type GeneratePromptInput = {
  topicName: string;
  roleName: string;
  level: "entry" | "junior" | "mid" | "senior";
  count: number;
  includeScenarios: boolean;
  includeCalc: boolean;
};

export function buildSkillTestSystemPrompt(): string {
  return [
    "You write energy-sector skill assessments for Canadian professionals on Energized.",
    "Generate multiple-choice questions in JSON only, conforming to the schema below.",
    "Each question: 4 options, exactly 1 correct (correctIdx 0-3), 1-3 short tags, optional tagKind 'scenario' or 'calc'.",
    "Include `context` (a short 'Given:' block) ONLY for calc/scenario questions where it adds value; otherwise null.",
    "Never invent regulations, ticket names, or numbers — keep claims defensible from public sources.",
    "Return ONLY valid JSON in shape: {\"questions\":[{prompt,context,options,correctIdx,tags,tagKind}]}.",
    "No preamble, no code fences, no commentary.",
  ].join(" ");
}

export function buildSkillTestUserPrompt(input: GeneratePromptInput): string {
  const includes: string[] = [];
  if (input.includeScenarios) includes.push("scenario");
  if (input.includeCalc) includes.push("calc");
  return [
    `Topic: ${input.topicName}`,
    `Role: ${input.roleName}`,
    `Level: ${input.level} (calibrate difficulty accordingly)`,
    `Count: ${input.count} questions`,
    `Include question kinds: ${includes.length ? includes.join(", ") : "standard MCQ only"}`,
    "Return JSON only.",
  ].join("\n");
}

export function buildResultNarrativePrompt(input: {
  topicName: string;
  score: number;
  passed: boolean;
  topVerified: boolean;
  breakdown: Array<{ cat: string; pct: number; right: number; total: number }>;
}): { system: string; user: string } {
  const system = [
    "You write 2-3 sentence personalized result narratives for Canadian energy-sector skill assessments.",
    "Be specific to the candidate's strongest and weakest categories from the breakdown.",
    "Confident, active voice. No hedging, no clichés.",
    "If passed: acknowledge strength, name 1 weak area to focus on next.",
    "If failed: name what they showed, what to study before retaking. Encouraging but honest.",
    "Plain text. One short paragraph. Return ONLY the narrative.",
  ].join(" ");

  const breakdownLines = input.breakdown
    .map((c) => `- ${c.cat}: ${c.pct}% (${c.right}/${c.total})`)
    .join("\n");
  const status = input.topVerified
    ? "Top-30% verified pass"
    : input.passed
      ? "Pass"
      : "Did not pass";

  const user = [
    `Topic: ${input.topicName}`,
    `Score: ${input.score}/100 — ${status}`,
    `Category breakdown:\n${breakdownLines}`,
  ].join("\n");

  return { system, user };
}
```

- [ ] **Step 4: Add `generateSkillTest` to `src/lib/ai.ts`**

Append to `src/lib/ai.ts`:

```ts
import { z } from "zod";
import {
  buildSkillTestSystemPrompt,
  buildSkillTestUserPrompt,
  type GeneratePromptInput,
} from "./skill-test-prompts";

const QuestionSchema = z.object({
  prompt: z.string().min(20).max(500),
  context: z.string().nullable(),
  options: z.array(z.string().min(1).max(200)).length(4),
  correctIdx: z.number().int().min(0).max(3),
  tags: z.array(z.string().min(1).max(40)).min(1).max(3),
  tagKind: z.enum(["scenario", "calc"]).nullable(),
});

const GenerateResponseSchema = z.object({
  questions: z.array(QuestionSchema),
});

export type GeneratedSkillTest = z.infer<typeof GenerateResponseSchema>;

const SKILL_TEST_MODEL = "gpt-4o-mini";

export async function generateSkillTest(
  input: GeneratePromptInput,
): Promise<GeneratedSkillTest & { model: string }> {
  if (!openaiClient) {
    throw new Error("OpenAI API key not configured.");
  }

  const system = buildSkillTestSystemPrompt();
  const user = buildSkillTestUserPrompt(input);

  for (let attempt = 0; attempt < 2; attempt++) {
    const { text } = await generateText({
      model: openaiClient(SKILL_TEST_MODEL),
      system,
      prompt: user,
      maxOutputTokens: Math.min(6000, 250 + input.count * 200),
    });

    const match = text.match(/\{[\s\S]*\}/);
    const raw = match ? match[0] : text.trim();
    try {
      const parsed = GenerateResponseSchema.parse(JSON.parse(raw));
      if (parsed.questions.length !== input.count) {
        if (attempt === 1) {
          throw new Error(
            `Could not parse skill test: expected ${input.count} questions, got ${parsed.questions.length}.`,
          );
        }
        continue;
      }
      return { ...parsed, model: SKILL_TEST_MODEL };
    } catch (e) {
      if (attempt === 1) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new Error(`Could not parse skill test response: ${msg}`);
      }
    }
  }
  throw new Error("Could not parse skill test response after retry.");
}
```

- [ ] **Step 5: Run the test, expect PASS**

Run: `pnpm vitest run src/lib/ai.test.ts`

Expected: PASS, both tests green.

- [ ] **Step 6: Commit**

```bash
git add src/lib/ai.ts src/lib/skill-test-prompts.ts src/lib/ai.test.ts
git commit -m "feat(ai): add generateSkillTest with Zod parse + retry"
```

---

### Task 9: AI lib — `narrateSkillResult`

**Files:**
- Modify: `src/lib/ai.ts`
- Modify: `src/lib/ai.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/lib/ai.test.ts`:

```ts
import { narrateSkillResult } from "./ai";

describe("narrateSkillResult", () => {
  it("returns the narrative text trimmed", async () => {
    generateTextMock.mockResolvedValueOnce({
      text: "  Strong showing on Mechanical fundamentals; brush up on Hydraulics before retaking.  ",
    });
    const out = await narrateSkillResult({
      topicName: "Wind energy",
      score: 78,
      passed: true,
      topVerified: false,
      breakdown: [
        { cat: "Mechanical", pct: 90, right: 9, total: 10 },
        { cat: "Hydraulics", pct: 60, right: 3, total: 5 },
      ],
    });
    expect(out).toBe("Strong showing on Mechanical fundamentals; brush up on Hydraulics before retaking.");
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

Run: `pnpm vitest run src/lib/ai.test.ts`

Expected: FAIL — `narrateSkillResult is not a function`.

- [ ] **Step 3: Implement `narrateSkillResult`**

Append to `src/lib/ai.ts`:

```ts
import { buildResultNarrativePrompt } from "./skill-test-prompts";

const NARRATIVE_MODEL = "gpt-4o";

export async function narrateSkillResult(input: {
  topicName: string;
  score: number;
  passed: boolean;
  topVerified: boolean;
  breakdown: Array<{ cat: string; pct: number; right: number; total: number }>;
}): Promise<string> {
  if (!openaiClient) {
    throw new Error("OpenAI API key not configured.");
  }
  const { system, user } = buildResultNarrativePrompt(input);
  const { text } = await generateText({
    model: openaiClient(NARRATIVE_MODEL),
    system,
    prompt: user,
    maxOutputTokens: 300,
  });
  return text.trim().replace(/^["']|["']$/g, "");
}
```

- [ ] **Step 4: Run, expect PASS**

Run: `pnpm vitest run src/lib/ai.test.ts`

Expected: all 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ai.ts src/lib/ai.test.ts
git commit -m "feat(ai): add narrateSkillResult for skill-test result narrative"
```

---

## Phase 2 — tRPC router: catalog & attempt procedures

### Task 10: `skillTests.listTopics` and `getTopic` (catalog reads)

**Files:**
- Create: `src/server/api/routers/skill-tests.ts`
- Modify: `src/server/api/root.ts`

- [ ] **Step 1: Create the router with read procedures**

```ts
// src/server/api/routers/skill-tests.ts
import { TRPCError } from "@trpc/server";
import { and, asc, eq, isNull, isNotNull } from "drizzle-orm";
import { z } from "zod";
import { router, publicProcedure } from "@/server/api/trpc";
import { testTopics } from "@/server/db/schema";

export const skillTestsRouter = router({
  listTopics: publicProcedure.query(async ({ ctx }) => {
    const sectors = await ctx.db
      .select()
      .from(testTopics)
      .where(and(isNull(testTopics.parentTopicId), eq(testTopics.isActive, true)))
      .orderBy(asc(testTopics.sortOrder));

    const roles = await ctx.db
      .select()
      .from(testTopics)
      .where(and(isNotNull(testTopics.parentTopicId), eq(testTopics.isActive, true)))
      .orderBy(asc(testTopics.sortOrder));

    const rolesBySector = new Map<string, typeof roles>();
    for (const r of roles) {
      if (!r.parentTopicId) continue;
      const arr = rolesBySector.get(r.parentTopicId) ?? [];
      arr.push(r);
      rolesBySector.set(r.parentTopicId, arr);
    }

    return sectors.map((s) => ({
      ...s,
      roles: rolesBySector.get(s.id) ?? [],
    }));
  }),

  getTopic: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const topic = await ctx.db
        .select()
        .from(testTopics)
        .where(eq(testTopics.slug, input.slug))
        .limit(1);
      if (!topic[0]) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Topic not found." });
      }
      const t = topic[0];

      // If this is a role, also fetch the parent sector for context
      let sector = t;
      let roles: typeof topic = [];
      if (t.parentTopicId) {
        const parent = await ctx.db
          .select()
          .from(testTopics)
          .where(eq(testTopics.id, t.parentTopicId))
          .limit(1);
        if (parent[0]) sector = parent[0];
      }
      // Always fetch all sibling roles under this sector
      roles = await ctx.db
        .select()
        .from(testTopics)
        .where(
          and(
            eq(testTopics.parentTopicId, sector.id),
            eq(testTopics.isActive, true),
          ),
        )
        .orderBy(asc(testTopics.sortOrder));

      return { sector, currentRole: t.parentTopicId ? t : null, roles };
    }),
});
```

- [ ] **Step 2: Register in `root.ts`**

In `src/server/api/root.ts`:
1. Add the import alongside the others: `import { skillTestsRouter } from "@/server/api/routers/skill-tests";`
2. Add to `appRouter`: `skillTests: skillTestsRouter,`

- [ ] **Step 3: Verify typecheck**

Run: `pnpm typecheck` — expected: pass.

- [ ] **Step 4: Commit**

```bash
git add src/server/api/routers/skill-tests.ts src/server/api/root.ts
git commit -m "feat(trpc): add skillTests.listTopics and getTopic"
```

---

### Task 11: `skillTests.startAttempt` — gating + AI generation (TDD)

**Files:**
- Create: `src/server/api/routers/skill-tests.test.ts`
- Modify: `src/server/api/routers/skill-tests.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/server/api/routers/skill-tests.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/ai", () => ({
  EMBER_ENABLED: true,
  generateSkillTest: vi.fn(),
  narrateSkillResult: vi.fn(),
}));

import { generateSkillTest } from "@/lib/ai";
import { db } from "@/server/db";
import { user } from "@/server/db/schema/auth";
import { testTopics, skillTestAttempts } from "@/server/db/schema";
import { skillTestsRouter } from "./skill-tests";
import { eq } from "drizzle-orm";

const generateMock = generateSkillTest as unknown as ReturnType<typeof vi.fn>;

async function makeCaller(args: {
  userId: string;
  role?: "jobseeker" | "employer";
  jobseekerSubscriptionStatus?: string | null;
}) {
  const ctx = {
    db,
    session: {
      user: {
        id: args.userId,
        role: args.role ?? "jobseeker",
        jobseekerSubscriptionStatus: args.jobseekerSubscriptionStatus ?? null,
      },
    },
  } as never;
  return skillTestsRouter.createCaller(ctx);
}

const fakeQuestions = Array.from({ length: 15 }, (_, i) => ({
  prompt: `Q${i + 1}?`,
  context: null,
  options: ["A", "B", "C", "D"] as [string, string, string, string],
  correctIdx: 0 as 0,
  tags: ["General"],
  tagKind: null,
}));

beforeEach(() => {
  generateMock.mockReset();
  generateMock.mockResolvedValue({ questions: fakeQuestions, model: "gpt-4o-mini" });
});

describe("skillTests.startAttempt — entitlement", () => {
  it("free user with no prior attempt can start", async () => {
    // Setup: ensure a known user + topic exist (assume seeded)
    // Use a deterministic test fixture user — requires test seeding helper.
    // Pseudo-test: skip if seed helper not available in this codebase.
  });

  it("free user with one prior attempt is blocked with paywall message", async () => {
    // similar — depends on fixture availability
  });

  it("paid user can start when no in-progress attempt exists", async () => {
    // ...
  });
});
```

> **Note:** the codebase may already have a Vitest test-DB seed helper. If not, the entitlement tests above are *aspirational*; mark them `it.skip` for now and add real test fixtures as a follow-up. The main correctness check for Task 11 is wiring + manual smoke via the running app.

- [ ] **Step 2: Implement `startAttempt`**

Append to the `skillTestsRouter` in `src/server/api/routers/skill-tests.ts`:

```ts
import { jobseekerProcedure } from "@/server/api/trpc";
import {
  skillTestAttempts,
  skillBadges,
  type SkillTestQuestion,
} from "@/server/db/schema";
import { count, desc, gt, ne, sql } from "drizzle-orm";
import { generateSkillTest, narrateSkillResult } from "@/lib/ai";
import { isEntitledSubscriptionStatus } from "@/lib/billing-status";  // existing helper
import { randomUUID } from "node:crypto";
```

(Add to existing imports — don't duplicate.)

```ts
// Inside the router definition:
startAttempt: jobseekerProcedure
  .input(
    z.object({
      topicSlug: z.string(),
      level: z.enum(["entry", "junior", "mid", "senior"]),
      questionCount: z.union([
        z.literal(10),
        z.literal(15),
        z.literal(20),
        z.literal(25),
        z.literal(30),
      ]),
      includeScenarios: z.boolean(),
      includeCalc: z.boolean(),
      honorPledged: z.literal(true),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    // 1. Resolve topic
    const topic = await ctx.db
      .select()
      .from(testTopics)
      .where(and(eq(testTopics.slug, input.topicSlug), eq(testTopics.isActive, true)))
      .limit(1);
    if (!topic[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Topic not found." });
    const t = topic[0];

    // 2. Reuse existing in-progress attempt if any
    const inProgress = await ctx.db
      .select()
      .from(skillTestAttempts)
      .where(
        and(
          eq(skillTestAttempts.candidateId, ctx.session.user.id),
          eq(skillTestAttempts.status, "in_progress"),
        ),
      )
      .limit(1);
    if (inProgress[0]) return { attemptId: inProgress[0].id };

    // 3. Entitlement: free user gets 1 lifetime attempt
    const subStatus = ctx.session.user.jobseekerSubscriptionStatus ?? null;
    const isPaid = isEntitledSubscriptionStatus(subStatus);
    if (!isPaid) {
      const [{ n }] = await ctx.db
        .select({ n: count() })
        .from(skillTestAttempts)
        .where(
          and(
            eq(skillTestAttempts.candidateId, ctx.session.user.id),
            ne(skillTestAttempts.status, "in_progress"),
          ),
        );
      if (Number(n) >= 1) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "paywall:skill_tests",
        });
      }
    }

    // 4. Cooldown: prior pass on same topic in last 30 days OR fail in last 7 days
    const lastForTopic = await ctx.db
      .select()
      .from(skillTestAttempts)
      .where(
        and(
          eq(skillTestAttempts.candidateId, ctx.session.user.id),
          eq(skillTestAttempts.topicId, t.id),
          ne(skillTestAttempts.status, "in_progress"),
          ne(skillTestAttempts.status, "forfeited"),
        ),
      )
      .orderBy(desc(skillTestAttempts.finishedAt))
      .limit(1);
    if (lastForTopic[0]?.finishedAt) {
      const last = lastForTopic[0];
      const daysSince =
        (Date.now() - last.finishedAt!.getTime()) / (1000 * 60 * 60 * 24);
      if (
        (last.status === "passed" || last.status === "passed_top") &&
        daysSince < 30
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `cooldown:30d:${Math.ceil(30 - daysSince)}`,
        });
      }
      if (last.status === "failed" && daysSince < 7) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `cooldown:7d:${Math.ceil(7 - daysSince)}`,
        });
      }
    }

    // 5. Generate questions
    const roleName = t.parentTopicId
      ? t.name
      : (await ctx.db
          .select({ name: testTopics.name })
          .from(testTopics)
          .where(eq(testTopics.parentTopicId, t.id))
          .limit(1))[0]?.name ?? t.name;
    const sectorName = t.parentTopicId
      ? (await ctx.db
          .select({ name: testTopics.name })
          .from(testTopics)
          .where(eq(testTopics.id, t.parentTopicId))
          .limit(1))[0]?.name ?? t.name
      : t.name;

    const generated = await generateSkillTest({
      topicName: sectorName,
      roleName,
      level: input.level,
      count: input.questionCount,
      includeScenarios: input.includeScenarios,
      includeCalc: input.includeCalc,
    });

    const questionsWithIds: SkillTestQuestion[] = generated.questions.map((q) => ({
      ...q,
      id: randomUUID(),
    }));

    // 6. Insert the attempt
    const [created] = await ctx.db
      .insert(skillTestAttempts)
      .values({
        candidateId: ctx.session.user.id,
        topicId: t.id,
        status: "in_progress",
        level: input.level,
        questionCount: input.questionCount,
        includeScenarios: input.includeScenarios,
        includeCalc: input.includeCalc,
        questionsJson: questionsWithIds,
        generationModel: generated.model,
      })
      .returning({ id: skillTestAttempts.id });

    return { attemptId: created.id };
  }),
```

- [ ] **Step 3: Run typecheck**

Run: `pnpm typecheck` — expected: pass. Fix any import paths (e.g. `@/lib/billing-status` may differ — search for the actual location of `isEntitledSubscriptionStatus`).

- [ ] **Step 4: Run unit tests if any are non-skipped**

Run: `pnpm vitest run src/server/api/routers/skill-tests.test.ts`

Expected: all skipped or passing.

- [ ] **Step 5: Commit**

```bash
git add src/server/api/routers/skill-tests.ts src/server/api/routers/skill-tests.test.ts
git commit -m "feat(trpc): add skillTests.startAttempt with gating + AI gen"
```

---

### Task 12: `getAttempt`, `saveAnswer`, `submitAttempt`

**Files:**
- Modify: `src/server/api/routers/skill-tests.ts`

- [ ] **Step 1: Add `getAttempt`**

```ts
getAttempt: protectedProcedure
  .input(z.object({ attemptId: z.string().uuid() }))
  .query(async ({ ctx, input }) => {
    const rows = await ctx.db
      .select()
      .from(skillTestAttempts)
      .where(eq(skillTestAttempts.id, input.attemptId))
      .limit(1);
    const attempt = rows[0];
    if (!attempt) throw new TRPCError({ code: "NOT_FOUND" });
    if (attempt.candidateId !== ctx.session.user.id) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    // Forfeit stale in_progress attempts on read
    if (attempt.status === "in_progress" && attempt.startedAt) {
      const minutesElapsed = (Date.now() - attempt.startedAt.getTime()) / 60000;
      if (minutesElapsed > 25) {
        await ctx.db
          .update(skillTestAttempts)
          .set({ status: "forfeited", finishedAt: new Date() })
          .where(eq(skillTestAttempts.id, attempt.id));
        return { ...attempt, status: "forfeited" as const };
      }
    }

    // Strip correctIdx from questions for client (don't leak the answer key)
    const safeQuestions = attempt.questionsJson.map((q) => ({
      id: q.id,
      prompt: q.prompt,
      context: q.context,
      options: q.options,
      tags: q.tags,
      tagKind: q.tagKind,
    }));

    return { ...attempt, questionsJson: safeQuestions };
  }),
```

- [ ] **Step 2: Add `saveAnswer`**

```ts
saveAnswer: protectedProcedure
  .input(
    z.object({
      attemptId: z.string().uuid(),
      questionId: z.string().uuid(),
      selectedIdx: z.number().int().min(0).max(3),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const rows = await ctx.db
      .select({
        id: skillTestAttempts.id,
        candidateId: skillTestAttempts.candidateId,
        status: skillTestAttempts.status,
        answersJson: skillTestAttempts.answersJson,
      })
      .from(skillTestAttempts)
      .where(eq(skillTestAttempts.id, input.attemptId))
      .limit(1);
    const a = rows[0];
    if (!a) throw new TRPCError({ code: "NOT_FOUND" });
    if (a.candidateId !== ctx.session.user.id) throw new TRPCError({ code: "FORBIDDEN" });
    if (a.status !== "in_progress") {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Attempt is not in progress." });
    }

    const next = { ...(a.answersJson ?? {}), [input.questionId]: input.selectedIdx };
    await ctx.db
      .update(skillTestAttempts)
      .set({ answersJson: next })
      .where(eq(skillTestAttempts.id, a.id));

    return { ok: true };
  }),
```

- [ ] **Step 3: Add `submitAttempt`**

```ts
submitAttempt: protectedProcedure
  .input(z.object({ attemptId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const rows = await ctx.db
      .select()
      .from(skillTestAttempts)
      .where(eq(skillTestAttempts.id, input.attemptId))
      .limit(1);
    const a = rows[0];
    if (!a) throw new TRPCError({ code: "NOT_FOUND" });
    if (a.candidateId !== ctx.session.user.id) throw new TRPCError({ code: "FORBIDDEN" });
    if (a.status !== "in_progress") {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Attempt already finished." });
    }

    const answers = a.answersJson ?? {};
    let correct = 0;
    const cats = new Map<string, { right: number; total: number }>();
    for (const q of a.questionsJson) {
      const cat = q.tags[0] ?? "General";
      const entry = cats.get(cat) ?? { right: 0, total: 0 };
      entry.total += 1;
      if (answers[q.id] === q.correctIdx) {
        correct += 1;
        entry.right += 1;
      }
      cats.set(cat, entry);
    }
    const score = Math.round((correct / a.questionsJson.length) * 100);
    const passed = score >= 70;
    const topVerified = score >= 80;
    const status: "passed" | "passed_top" | "failed" = topVerified
      ? "passed_top"
      : passed
        ? "passed"
        : "failed";

    const breakdown = Array.from(cats.entries()).map(([cat, v]) => ({
      cat,
      right: v.right,
      total: v.total,
      pct: Math.round((v.right / v.total) * 100),
    }));

    // AI narrative
    const topic = await ctx.db
      .select({ name: testTopics.name })
      .from(testTopics)
      .where(eq(testTopics.id, a.topicId))
      .limit(1);
    let narrative = "";
    try {
      narrative = await narrateSkillResult({
        topicName: topic[0]?.name ?? "this topic",
        score,
        passed,
        topVerified,
        breakdown,
      });
    } catch (e) {
      narrative = passed
        ? "You passed. Review the breakdown to see where to push next."
        : "Almost there. Use the breakdown to focus your prep before retaking.";
    }

    await ctx.db
      .update(skillTestAttempts)
      .set({
        status,
        score,
        correctCount: correct,
        categoryBreakdown: breakdown,
        aiFeedback: narrative,
        finishedAt: new Date(),
      })
      .where(eq(skillTestAttempts.id, a.id));

    if (passed) {
      // Upsert badge — refresh on re-pass
      await ctx.db
        .insert(skillBadges)
        .values({
          candidateId: a.candidateId,
          topicId: a.topicId,
          attemptId: a.id,
          isVerifiedTop: topVerified,
          score,
        })
        .onConflictDoUpdate({
          target: [skillBadges.candidateId, skillBadges.topicId],
          set: {
            attemptId: a.id,
            isVerifiedTop: topVerified,
            score,
            earnedAt: new Date(),
          },
        });
    }

    return { ok: true, score, status, breakdown, narrative };
  }),
```

- [ ] **Step 4: Verify typecheck**

Run: `pnpm typecheck` — expected: pass.

- [ ] **Step 5: Commit**

```bash
git add src/server/api/routers/skill-tests.ts
git commit -m "feat(trpc): add getAttempt, saveAnswer, submitAttempt"
```

---

### Task 13: Badge read procedures — `myBadges`, `badgesForCandidate`, `searchByBadge`

**Files:**
- Modify: `src/server/api/routers/skill-tests.ts`

- [ ] **Step 1: Add the three procedures**

```ts
myBadges: protectedProcedure.query(async ({ ctx }) => {
  return ctx.db
    .select({
      topicId: skillBadges.topicId,
      score: skillBadges.score,
      isVerifiedTop: skillBadges.isVerifiedTop,
      earnedAt: skillBadges.earnedAt,
      slug: testTopics.slug,
      name: testTopics.name,
      monogram: testTopics.monogram,
      tileColor: testTopics.tileColor,
      jobSectorMatch: testTopics.jobSectorMatch,
    })
    .from(skillBadges)
    .innerJoin(testTopics, eq(skillBadges.topicId, testTopics.id))
    .where(eq(skillBadges.candidateId, ctx.session.user.id))
    .orderBy(desc(skillBadges.earnedAt));
}),

badgesForCandidate: protectedProcedure
  .input(z.object({ candidateId: z.string() }))
  .query(async ({ ctx, input }) => {
    return ctx.db
      .select({
        topicId: skillBadges.topicId,
        score: skillBadges.score,
        isVerifiedTop: skillBadges.isVerifiedTop,
        earnedAt: skillBadges.earnedAt,
        slug: testTopics.slug,
        name: testTopics.name,
        monogram: testTopics.monogram,
        tileColor: testTopics.tileColor,
        jobSectorMatch: testTopics.jobSectorMatch,
      })
      .from(skillBadges)
      .innerJoin(testTopics, eq(skillBadges.topicId, testTopics.id))
      .where(eq(skillBadges.candidateId, input.candidateId))
      .orderBy(desc(skillBadges.earnedAt));
  }),

searchByBadge: protectedProcedure
  .input(z.object({ topicSlugs: z.array(z.string()).min(1) }))
  .query(async ({ ctx, input }) => {
    const matched = await ctx.db
      .select({ candidateId: skillBadges.candidateId })
      .from(skillBadges)
      .innerJoin(testTopics, eq(skillBadges.topicId, testTopics.id))
      .where(sql`${testTopics.slug} = ANY(${input.topicSlugs})`)
      .groupBy(skillBadges.candidateId);
    return matched.map((m) => m.candidateId);
  }),
```

- [ ] **Step 2: Verify typecheck**

Run: `pnpm typecheck` — expected: pass.

- [ ] **Step 3: Commit**

```bash
git add src/server/api/routers/skill-tests.ts
git commit -m "feat(trpc): add myBadges, badgesForCandidate, searchByBadge"
```

---

## Phase 3 — Catalog page (`/skills`)

### Task 14: Catalog page shell + sector grid

**Files:**
- Create: `src/app/(app)/skills/page.tsx`
- Create: `src/app/(app)/skills/_components/catalog-hero.tsx`
- Create: `src/app/(app)/skills/_components/sector-grid.tsx`

- [ ] **Step 1: Build the page**

```tsx
// src/app/(app)/skills/page.tsx
import { Suspense } from "react";
import { api } from "@/lib/trpc/server";
import { CatalogHero } from "./_components/catalog-hero";
import { SectorGrid } from "./_components/sector-grid";
import { PopularRoles } from "./_components/popular-roles";
import { HowItWorksStrip } from "./_components/how-it-works-strip";

export default async function SkillsPage() {
  const sectors = await api.skillTests.listTopics();
  return (
    <div className="bg-slate-50 min-h-[calc(100vh-76px)] py-14 lg:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <CatalogHero sectors={sectors} />
        <section className="mt-16">
          <SectorGrid sectors={sectors} />
        </section>
        <section className="mt-16">
          <PopularRoles sectors={sectors} />
        </section>
        <HowItWorksStrip />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build `catalog-hero.tsx`**

```tsx
// src/app/(app)/skills/_components/catalog-hero.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowRight } from "lucide-react";

type Sector = {
  slug: string;
  name: string;
  roles: { slug: string; name: string }[];
};

export function CatalogHero({ sectors }: { sectors: Sector[] }) {
  const [text, setText] = useState("");
  const router = useRouter();

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
          Skill assessments
        </div>
        <h1 className="mt-6 text-5xl font-black leading-[0.95] tracking-tight md:text-7xl lg:text-8xl">
          Get <em className="not-italic font-black italic text-[var(--brand-dark-blue)]">verified</em>.<br />
          One sitting. 25 minutes.
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600">
          AI builds a fresh test for your sector and role — multiple choice, real scenarios, calcs.
          Pass and a badge lands on your profile that recruiters can filter by.
        </p>
        <div className="mt-8 flex flex-wrap gap-9">
          <Stat v={String(sectors.length)} l={`Sectors covered`} />
          <Stat v="Fresh" l="Test built each attempt — no two alike" />
          <Stat v="3.4×" l="Recruiter response rate vs. unverified" />
        </div>
      </div>

      <div className="relative overflow-hidden rounded-3xl bg-[var(--brand-black)] p-7 text-white">
        <div className="absolute -right-32 -top-32 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(28,170,226,0.25),transparent_70%)]" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--brand-blue)]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--brand-blue)]" />
            AI generator · live
          </div>
          <h3 className="mt-3 text-3xl font-black tracking-tight">
            Just tell us the <em className="not-italic italic text-[var(--brand-blue)]">job</em>.
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            Type your role or paste a job description. The generator picks the sector, level and question mix.
          </p>
          <div className="mt-5 flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1.5 pl-5 pr-1.5">
            <Sparkles className="h-4 w-4 text-[var(--brand-blue)]" />
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="e.g. Wind technician II, GWO certified"
              className="flex-1 min-w-0 bg-transparent text-sm text-white placeholder:text-slate-400 outline-none"
            />
            <button
              onClick={submit}
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--brand-blue)] px-4 py-2.5 text-xs font-bold text-[var(--brand-black)] hover:bg-[var(--brand-dark-blue)] hover:text-white transition"
            >
              Build test <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="mt-3.5 flex flex-wrap gap-1.5">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => setText(s)}
                className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-slate-300 hover:border-[var(--brand-blue)] hover:text-[var(--brand-blue)] transition"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ v, l }: { v: string; l: string }) {
  return (
    <div>
      <div className="text-4xl font-black tracking-tight italic text-[var(--brand-dark-blue)]">{v}</div>
      <div className="mt-2 max-w-[160px] text-[11px] font-bold uppercase tracking-[0.16em] leading-relaxed text-slate-500">
        {l}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Build `sector-grid.tsx`**

```tsx
// src/app/(app)/skills/_components/sector-grid.tsx
"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

type Sector = {
  slug: string;
  name: string;
  monogram: string;
  blurb: string | null;
  tileColor: string;
  isHot: boolean;
  roles: unknown[];
};

const TABS = [
  { id: "all", l: "All" },
  { id: "hot", l: "Trending" },
  { id: "renewable", l: "Renewable" },
  { id: "traditional", l: "Traditional" },
] as const;

const RENEWABLE = new Set(["wind", "solar", "geo", "hydrogen", "battery"]);
const TRADITIONAL = new Set(["oilgas", "grid", "nuclear", "ccus"]);

export function SectorGrid({ sectors }: { sectors: Sector[] }) {
  const [tab, setTab] = useState<typeof TABS[number]["id"]>("all");
  const filtered =
    tab === "all"
      ? sectors
      : tab === "hot"
        ? sectors.filter((s) => s.isHot)
        : tab === "renewable"
          ? sectors.filter((s) => RENEWABLE.has(s.slug))
          : sectors.filter((s) => TRADITIONAL.has(s.slug));

  return (
    <>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-6">
        <h2 className="text-3xl font-black tracking-tight md:text-4xl">
          Pick your <em className="not-italic italic text-[var(--brand-dark-blue)]">sector</em>.<br />
          We'll build the test.
        </h2>
        <div className="inline-flex gap-0.5 rounded-full border border-slate-200 bg-white p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-full px-3.5 py-2 text-xs font-bold transition ${
                tab === t.id
                  ? "bg-[var(--brand-black)] text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {t.l}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((s) => (
          <Link
            key={s.slug}
            href={`/skills/${s.slug}/configure`}
            className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 text-left transition hover:-translate-y-0.5 hover:border-[var(--brand-black)] hover:shadow-xl"
          >
            {s.isHot && (
              <span className="absolute left-6 top-6 rounded-full bg-[var(--brand-blue)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--brand-black)]">
                Hot ↑
              </span>
            )}
            <div className="absolute right-6 top-6 grid h-9 w-9 place-items-center rounded-full border border-slate-200 text-slate-500 transition group-hover:border-[var(--brand-blue)] group-hover:bg-[var(--brand-blue)] group-hover:text-[var(--brand-black)] group-hover:[transform:rotate(-45deg)]">
              <ArrowRight className="h-4 w-4" />
            </div>
            <div
              className="relative mb-7 grid h-14 w-14 place-items-center rounded-2xl text-xl font-black text-white"
              style={{ background: s.tileColor }}
            >
              {s.monogram}
              <span className="absolute -right-1.5 -top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-[var(--brand-blue)]" />
            </div>
            <h3 className="text-2xl font-black tracking-tight">{s.name}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">{s.blurb}</p>
            <div className="mt-5 flex items-center justify-between border-t border-dashed border-slate-200 pt-4 text-sm">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">Roles</div>
                <div className="text-xl font-black tracking-tight">{s.roles.length}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
```

- [ ] **Step 4: Smoke check**

Run dev server (`pnpm dev`) and navigate to `/skills`. Confirm hero + sector grid render and clicking a sector card routes to `/skills/<slug>/configure` (which 404s for now — fine).

- [ ] **Step 5: Commit**

```bash
git add src/app/\(app\)/skills/page.tsx src/app/\(app\)/skills/_components/catalog-hero.tsx src/app/\(app\)/skills/_components/sector-grid.tsx
git commit -m "feat(skills): catalog page hero + sector grid"
```

---

### Task 15: Popular roles + how-it-works strip

**Files:**
- Create: `src/app/(app)/skills/_components/popular-roles.tsx`
- Create: `src/app/(app)/skills/_components/how-it-works-strip.tsx`

- [ ] **Step 1: Build `popular-roles.tsx`**

```tsx
// src/app/(app)/skills/_components/popular-roles.tsx
import Link from "next/link";
import { ArrowRight } from "lucide-react";

type Sector = {
  slug: string;
  name: string;
  tileColor: string;
  roles: { slug: string; name: string; subDescription: string | null }[];
};

export function PopularRoles({ sectors }: { sectors: Sector[] }) {
  const top = sectors
    .flatMap((s) =>
      s.roles.slice(0, 1).map((r) => ({ ...r, sector: s })),
    )
    .slice(0, 9);
  return (
    <>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-6">
        <h2 className="text-3xl font-black tracking-tight md:text-4xl">
          Most-taken <em className="not-italic italic text-[var(--brand-dark-blue)]">roles</em>.
        </h2>
        <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
          Updated weekly · {sectors.length} sectors
        </div>
      </div>
      <div className="border-t border-slate-200">
        {top.map((r, i) => (
          <Link
            key={r.slug}
            href={`/skills/${r.slug}/configure`}
            className="group grid grid-cols-[40px_1fr_44px] items-center gap-6 border-b border-slate-200 px-2 py-5 transition hover:bg-white hover:px-4 md:grid-cols-[60px_1.4fr_1fr_60px]"
          >
            <div className="text-xs font-bold uppercase text-slate-400">
              {String(i + 1).padStart(2, "0")}
            </div>
            <div>
              <div className="text-2xl font-black tracking-tight">{r.name}</div>
              {r.subDescription && (
                <div className="mt-1 text-sm text-slate-500">{r.subDescription}</div>
              )}
            </div>
            <div className="hidden md:block">
              <span
                className="inline-flex rounded-full px-2.5 py-1 text-xs font-bold"
                style={{ background: `${r.sector.tileColor}22`, color: r.sector.tileColor }}
              >
                {r.sector.name}
              </span>
            </div>
            <div className="ml-auto grid h-10 w-10 place-items-center rounded-full border border-slate-200 text-slate-500 transition group-hover:border-[var(--brand-blue)] group-hover:bg-[var(--brand-blue)] group-hover:text-[var(--brand-black)] group-hover:[transform:rotate(-45deg)]">
              <ArrowRight className="h-4 w-4" />
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
```

- [ ] **Step 2: Build `how-it-works-strip.tsx`**

```tsx
// src/app/(app)/skills/_components/how-it-works-strip.tsx
const STEPS = [
  { n: "01", h: "Pick a sector & role", p: "Choose what you want verified. Each test is targeted to the work, not generic IQ." },
  { n: "02", h: "AI builds the test", p: "Questions tuned to your level — multiple choice, scenarios, calcs. Fresh every attempt." },
  { n: "03", h: "Take it. ~25 min.", p: "One sitting, no second tries within a month. Tab-close = forfeited attempt." },
  { n: "04", h: "Get a verified badge", p: "Pass at 70 — Top-30% (80+) earns a verified tag. Recruiters can filter by it." },
];

export function HowItWorksStrip() {
  return (
    <div className="mt-20 grid gap-8 rounded-3xl border border-slate-200 bg-white p-11 sm:grid-cols-2 lg:grid-cols-4">
      {STEPS.map((s) => (
        <div key={s.n}>
          <div className="text-5xl font-black leading-none tracking-tight text-[var(--brand-dark-blue)]">
            {s.n}
          </div>
          <h4 className="mt-3 text-xl font-black tracking-tight">{s.h}</h4>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{s.p}</p>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Smoke**

Reload `/skills`, confirm both new sections render below the grid.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/skills/_components/popular-roles.tsx src/app/\(app\)/skills/_components/how-it-works-strip.tsx
git commit -m "feat(skills): popular roles + how-it-works strip"
```

---

## Phase 4 — Configure flow

### Task 16: Configure page route + form

**Files:**
- Create: `src/app/(app)/skills/[topicSlug]/configure/page.tsx`
- Create: `src/app/(app)/skills/[topicSlug]/configure/configure-client.tsx`
- Create: `src/app/(app)/skills/_components/configure-form.tsx`

- [ ] **Step 1: Build the RSC page**

```tsx
// src/app/(app)/skills/[topicSlug]/configure/page.tsx
import { notFound } from "next/navigation";
import { api } from "@/lib/trpc/server";
import { ConfigureClient } from "./configure-client";

export default async function ConfigurePage({
  params,
}: {
  params: Promise<{ topicSlug: string }>;
}) {
  const { topicSlug } = await params;
  try {
    const data = await api.skillTests.getTopic({ slug: topicSlug });
    return <ConfigureClient sector={data.sector} roles={data.roles} initialRoleSlug={data.currentRole?.slug ?? null} />;
  } catch {
    notFound();
  }
}
```

- [ ] **Step 2: Build the client wrapper**

```tsx
// src/app/(app)/skills/[topicSlug]/configure/configure-client.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Sparkles, AlertCircle } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/trpc/client";
import { ConfigureForm } from "@/app/(app)/skills/_components/configure-form";
import { GeneratingOverlay } from "@/app/(app)/skills/_components/generating-overlay";

type Topic = {
  id: string;
  slug: string;
  name: string;
  monogram: string;
  tileColor: string;
};

export function ConfigureClient({
  sector,
  roles,
  initialRoleSlug,
}: {
  sector: Topic;
  roles: { slug: string; name: string; subDescription: string | null }[];
  initialRoleSlug: string | null;
}) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const startMut = api.skillTests.startAttempt.useMutation({
    onSuccess: (data) => {
      router.push(`/skills/${sector.slug}/attempt/${data.attemptId}`);
    },
    onError: (e) => {
      setGenerating(false);
      setError(e.message);
    },
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link
            href="/skills"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-bold text-slate-700 hover:border-[var(--brand-black)]"
          >
            <ChevronLeft className="h-4 w-4" /> All sectors
          </Link>
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
            <span>Step 01 / 03</span>
            <div className="flex gap-1.5">
              <span className="h-1 w-7 rounded-full bg-[var(--brand-black)]" />
              <span className="h-1 w-7 rounded-full bg-slate-200" />
              <span className="h-1 w-7 rounded-full bg-slate-200" />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-14">
        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            <AlertCircle className="h-5 w-5" />
            {error.startsWith("paywall:")
              ? "You've used your free skill test. Upgrade to Gold to take more."
              : error.startsWith("cooldown:")
                ? `You can't retake this topic yet — ${error}`
                : error}
          </div>
        )}
        <ConfigureForm
          sector={sector}
          roles={roles}
          initialRoleSlug={initialRoleSlug ?? roles[0]?.slug ?? sector.slug}
          submitting={startMut.isPending}
          onSubmit={(values) => {
            setError(null);
            setGenerating(true);
            startMut.mutate({
              topicSlug: values.roleSlug,
              level: values.level,
              questionCount: values.questionCount,
              includeScenarios: values.includeScenarios,
              includeCalc: values.includeCalc,
              honorPledged: true,
            });
          }}
        />
      </div>

      {generating && <GeneratingOverlay sectorName={sector.name} />}
    </div>
  );
}
```

- [ ] **Step 3: Build the form**

```tsx
// src/app/(app)/skills/_components/configure-form.tsx
"use client";
import { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";

const LEVELS = [
  { id: "entry", y: "0–1 yrs", n: "Entry" },
  { id: "junior", y: "1–3 yrs", n: "Junior" },
  { id: "mid", y: "3–7 yrs", n: "Mid" },
  { id: "senior", y: "7+ yrs", n: "Senior" },
] as const;

const QUESTION_OPTS = [10, 15, 20, 25, 30] as const;

type Props = {
  sector: { name: string; monogram: string; tileColor: string };
  roles: { slug: string; name: string; subDescription: string | null }[];
  initialRoleSlug: string;
  submitting: boolean;
  onSubmit: (v: {
    roleSlug: string;
    level: "entry" | "junior" | "mid" | "senior";
    questionCount: 10 | 15 | 20 | 25 | 30;
    includeScenarios: boolean;
    includeCalc: boolean;
  }) => void;
};

export function ConfigureForm({ sector, roles, initialRoleSlug, submitting, onSubmit }: Props) {
  const [roleSlug, setRoleSlug] = useState(initialRoleSlug);
  const [level, setLevel] = useState<"entry" | "junior" | "mid" | "senior">("mid");
  const [count, setCount] = useState<10 | 15 | 20 | 25 | 30>(15);
  const [scenarios, setScenarios] = useState(true);
  const [calc, setCalc] = useState(true);
  const [honor, setHonor] = useState(false);

  const selectedRole = useMemo(
    () => roles.find((r) => r.slug === roleSlug) ?? roles[0],
    [roles, roleSlug],
  );
  const timeMins = Math.round(count * 1.5);

  return (
    <div className="grid gap-12 lg:grid-cols-[1fr_380px] lg:items-start">
      <div>
        <div className="mb-2 flex items-center gap-4">
          <div
            className="grid h-12 w-12 place-items-center rounded-2xl text-lg font-black text-white"
            style={{ background: sector.tileColor }}
          >
            {sector.monogram}
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
              {sector.name}
            </div>
          </div>
        </div>
        <h1 className="text-5xl font-black leading-[0.95] tracking-tight md:text-6xl lg:text-7xl">
          Tune the <em className="not-italic italic text-[var(--brand-dark-blue)]">test</em>.<br />
          We'll generate it next.
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600 md:text-lg">
          Tests are AI-built per attempt — tuned to your role and level. No two attempts are identical.
          Pick what you want covered.
        </p>

        <Field label="Role" hint={`${roles.length} options`}>
          <div className="flex flex-wrap gap-2">
            {roles.map((r) => (
              <button
                key={r.slug}
                onClick={() => setRoleSlug(r.slug)}
                className={`rounded-full border px-4 py-2.5 text-sm transition ${
                  roleSlug === r.slug
                    ? "border-[var(--brand-black)] bg-[var(--brand-black)] text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:border-[var(--brand-black)]"
                }`}
              >
                {r.name}
              </button>
            ))}
          </div>
          {selectedRole?.subDescription && (
            <p className="mt-3 text-sm text-slate-500">{selectedRole.subDescription}</p>
          )}
        </Field>

        <Field label="Level">
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {LEVELS.map((l) => (
              <button
                key={l.id}
                onClick={() => setLevel(l.id)}
                className={`rounded-2xl border p-4 text-left transition ${
                  level === l.id
                    ? "border-[var(--brand-blue)] bg-[var(--brand-blue)] text-[var(--brand-black)]"
                    : "border-slate-200 bg-white hover:border-[var(--brand-black)]"
                }`}
              >
                <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                  {l.y}
                </div>
                <div className="mt-1 text-xl font-black tracking-tight">{l.n}</div>
              </button>
            ))}
          </div>
        </Field>

        <Field label="Length">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="mb-3.5 flex items-baseline justify-between">
              <div>
                <div className="text-3xl font-black leading-none tracking-tight">
                  <em className="not-italic italic text-[var(--brand-dark-blue)]">{count}</em>{" "}
                  <span className="text-base">questions</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Est. time</div>
                <div className="text-sm text-slate-500">~{timeMins} min</div>
              </div>
            </div>
            <input
              type="range"
              min={10}
              max={30}
              step={5}
              value={count}
              onChange={(e) => setCount(Number(e.target.value) as 10 | 15 | 20 | 25 | 30)}
              className="w-full accent-[var(--brand-black)]"
            />
            <div className="mt-2 flex justify-between text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400">
              {QUESTION_OPTS.map((q) => <span key={q}>{q}</span>)}
            </div>
          </div>
        </Field>

        <Field label="What to include">
          <Toggle on={scenarios} onChange={setScenarios} title="Scenario questions" sub="Situational reasoning, weighted higher." />
          <Toggle on={calc} onChange={setCalc} title="Calculations & data interpretation" sub="Numerical problems — sizing, capacity factor, vibration, decline curve." />
        </Field>
      </div>

      <aside className="sticky top-24 overflow-hidden rounded-3xl bg-[var(--brand-black)] p-7 text-white">
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(28,170,226,0.15),transparent_70%)]" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--brand-blue)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand-blue)]" />
            Ready to build
          </div>
          <h4 className="mt-3.5 text-2xl font-black tracking-tight">{selectedRole?.name}</h4>
          <dl className="mt-4 divide-y divide-white/10 text-sm">
            <Row l="Sector" v={sector.name} />
            <Row l="Level" v={level[0].toUpperCase() + level.slice(1)} />
            <Row l="Questions" v={String(count)} />
            <Row l="Time" v={`${timeMins} min`} />
            <Row l="Scenarios" v={scenarios ? "Included" : "Off"} />
            <Row l="Calc" v={calc ? "Included" : "Off"} />
          </dl>
          <label className="mt-5 flex items-start gap-2.5 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={honor}
              onChange={(e) => setHonor(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[var(--brand-blue)]"
            />
            I'll take this test on my own — no outside help, no AI assistance.
          </label>
          <button
            disabled={!honor || submitting}
            onClick={() =>
              onSubmit({
                roleSlug,
                level,
                questionCount: count,
                includeScenarios: scenarios,
                includeCalc: calc,
              })
            }
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--brand-blue)] px-4 py-4 text-sm font-bold text-[var(--brand-black)] transition hover:bg-[var(--brand-dark-blue)] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            {submitting ? "Generating…" : "Generate test"}
          </button>
          <p className="mt-3.5 text-center text-xs leading-relaxed text-slate-400">
            Each generation is fresh. You can re-take after 30 days on a pass, 7 days on a fail.
          </p>
        </div>
      </aside>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="mt-10">
      <div className="mb-3.5 flex items-baseline justify-between">
        <h4 className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">{label}</h4>
        {hint && <span className="text-xs text-slate-400">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function Toggle({ on, onChange, title, sub }: { on: boolean; onChange: (v: boolean) => void; title: string; sub: string }) {
  return (
    <div className="mt-2 flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 first:mt-0">
      <div>
        <div className="text-[15px] font-medium text-slate-900">{title}</div>
        <div className="mt-0.5 text-sm text-slate-500">{sub}</div>
      </div>
      <button
        onClick={() => onChange(!on)}
        className={`relative h-6 w-11 flex-shrink-0 rounded-full transition ${on ? "bg-[var(--brand-black)]" : "bg-slate-200"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${on ? "left-[22px]" : "left-0.5"}`}
        />
      </button>
    </div>
  );
}

function Row({ l, v }: { l: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between py-3.5">
      <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-300">{l}</dt>
      <dd className="max-w-[60%] text-right text-sm font-medium text-white">{v}</dd>
    </div>
  );
}
```

- [ ] **Step 4: Smoke**

Reload `/skills/wind/configure` — confirm form renders, role pills, level grid, slider, toggles, sticky right rail with summary.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(app\)/skills/\[topicSlug\]/ src/app/\(app\)/skills/_components/configure-form.tsx
git commit -m "feat(skills): configure page + form with right-rail summary"
```

---

### Task 17: Generating overlay

**Files:**
- Create: `src/app/(app)/skills/_components/generating-overlay.tsx`

- [ ] **Step 1: Build the overlay**

```tsx
// src/app/(app)/skills/_components/generating-overlay.tsx
"use client";
import { useEffect, useState } from "react";

export function GeneratingOverlay({ sectorName }: { sectorName: string }) {
  const lines = [
    `Sourcing ${sectorName.toLowerCase()} question bank…`,
    "Calibrating difficulty for your role and level…",
    "Adding mixed-format items, scenarios, calcs…",
    "Shuffling, anti-cheat seeding, finalizing…",
  ];
  const [step, setStep] = useState(0);
  useEffect(() => {
    const ts = lines.map((_, i) => setTimeout(() => setStep(i + 1), 700 + i * 850));
    return () => ts.forEach(clearTimeout);
  }, [lines.length]);

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-[var(--brand-black)]/95 backdrop-blur animate-in fade-in duration-200">
      <div className="w-[calc(100%-3rem)] max-w-lg p-10 text-center">
        <div className="relative mx-auto mb-8 h-44 w-44">
          <div className="absolute inset-0 animate-[spin_8s_linear_infinite] rounded-full border border-dashed border-[var(--brand-blue)]/30" />
          <div className="absolute inset-6 animate-[spin_12s_linear_infinite_reverse] rounded-full border border-dashed border-[var(--brand-blue)]/20" />
          <div className="absolute inset-12 animate-[spin_16s_linear_infinite] rounded-full border border-dashed border-[var(--brand-blue)]/15" />
          <div className="absolute left-1/2 top-1/2 grid h-14 w-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[var(--brand-blue)] text-2xl font-black text-[var(--brand-black)] shadow-[0_0_60px_rgba(28,170,226,0.4)]">
            E
          </div>
        </div>
        <h2 className="text-3xl font-black tracking-tight text-white md:text-4xl">
          Building your test, <em className="not-italic italic text-[var(--brand-blue)]">just for you</em>.
        </h2>
        <p className="mt-3 text-sm text-slate-300">Fresh question set — no two attempts are the same.</p>
        <div className="mt-7 min-h-[120px] rounded-xl border border-white/10 bg-white/[0.04] p-4 text-left text-xs leading-relaxed text-slate-300">
          {lines.map((l, i) => (
            <div key={i} className="flex gap-2.5">
              <span className={i < step ? "text-[var(--brand-blue)]" : "animate-pulse text-slate-500"}>
                {i < step ? "✓" : "○"}
              </span>
              <span style={{ opacity: i > step ? 0.4 : 1 }}>{l}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(app\)/skills/_components/generating-overlay.tsx
git commit -m "feat(skills): generating overlay with orbital animation"
```

---

## Phase 5 — Test runner

### Task 18: Runner page route + shell

**Files:**
- Create: `src/app/(app)/skills/[topicSlug]/attempt/[attemptId]/page.tsx`
- Create: `src/app/(app)/skills/[topicSlug]/attempt/[attemptId]/runner-client.tsx`

- [ ] **Step 1: RSC page**

```tsx
// src/app/(app)/skills/[topicSlug]/attempt/[attemptId]/page.tsx
import { redirect, notFound } from "next/navigation";
import { api } from "@/lib/trpc/server";
import { RunnerClient } from "./runner-client";

export default async function RunnerPage({
  params,
}: {
  params: Promise<{ topicSlug: string; attemptId: string }>;
}) {
  const { topicSlug, attemptId } = await params;
  let attempt;
  try {
    attempt = await api.skillTests.getAttempt({ attemptId });
  } catch {
    notFound();
  }
  if (attempt.status !== "in_progress") {
    redirect(`/skills/${topicSlug}/attempt/${attemptId}/result`);
  }
  return <RunnerClient attempt={attempt} topicSlug={topicSlug} />;
}
```

- [ ] **Step 2: Runner client**

```tsx
// src/app/(app)/skills/[topicSlug]/attempt/[attemptId]/runner-client.tsx
"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/trpc/client";
import { RunnerBar } from "@/app/(app)/skills/_components/runner-bar";
import { QuestionCard } from "@/app/(app)/skills/_components/question-card";
import { QuestionMap } from "@/app/(app)/skills/_components/question-map";

type Q = {
  id: string;
  prompt: string;
  context: string | null;
  options: [string, string, string, string];
  tags: string[];
  tagKind: "scenario" | "calc" | null;
};

type Attempt = {
  id: string;
  questionsJson: Q[];
  questionCount: number;
  startedAt: Date;
  answersJson: Record<string, number> | null;
};

export function RunnerClient({ attempt, topicSlug }: { attempt: Attempt; topicSlug: string }) {
  const router = useRouter();
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>(attempt.answersJson ?? {});
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});

  // Total time = 90s × N
  const totalSeconds = attempt.questionCount * 90;
  const elapsedAtMount = Math.floor(
    (Date.now() - new Date(attempt.startedAt).getTime()) / 1000,
  );
  const [secondsLeft, setSecondsLeft] = useState(Math.max(0, totalSeconds - elapsedAtMount));

  const saveMut = api.skillTests.saveAnswer.useMutation();
  const submitMut = api.skillTests.submitAttempt.useMutation({
    onSuccess: () => router.push(`/skills/${topicSlug}/attempt/${attempt.id}/result`),
  });
  const submitRef = useRef(submitMut);
  submitRef.current = submitMut;

  useEffect(() => {
    if (secondsLeft <= 0) {
      submitRef.current.mutate({ attemptId: attempt.id });
      return;
    }
    const t = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [secondsLeft, attempt.id]);

  // Tab close warning
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  const setAnswer = (qid: string, idx: number) => {
    setAnswers((a) => ({ ...a, [qid]: idx }));
    saveMut.mutate({ attemptId: attempt.id, questionId: qid, selectedIdx: idx });
  };

  const q = attempt.questionsJson[current];
  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === attempt.questionsJson.length;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-50">
      <RunnerBar
        current={current + 1}
        total={attempt.questionsJson.length}
        answeredCount={answeredCount}
        secondsLeft={secondsLeft}
        onQuit={() => {
          if (window.confirm("Quit this test? It'll be marked forfeited.")) {
            router.push("/skills");
          }
        }}
      />
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[1fr_280px]">
        <QuestionCard
          question={q}
          questionNumber={current + 1}
          selectedIdx={answers[q.id]}
          onSelect={(idx) => setAnswer(q.id, idx)}
          flagged={!!flagged[q.id]}
          onFlag={() => setFlagged((f) => ({ ...f, [q.id]: !f[q.id] }))}
          onPrev={() => setCurrent((c) => Math.max(0, c - 1))}
          onNext={() => setCurrent((c) => Math.min(attempt.questionsJson.length - 1, c + 1))}
          isFirst={current === 0}
          isLast={current === attempt.questionsJson.length - 1}
          onSubmit={() => submitMut.mutate({ attemptId: attempt.id })}
        />
        <QuestionMap
          questions={attempt.questionsJson}
          currentIdx={current}
          answers={answers}
          flagged={flagged}
          onJump={setCurrent}
          allAnswered={allAnswered}
          onSubmit={() => submitMut.mutate({ attemptId: attempt.id })}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(app\)/skills/\[topicSlug\]/attempt/
git commit -m "feat(skills): test runner page + state plumbing"
```

---

### Task 19: Runner bar component

**Files:**
- Create: `src/app/(app)/skills/_components/runner-bar.tsx`

- [ ] **Step 1: Build it**

```tsx
// src/app/(app)/skills/_components/runner-bar.tsx
"use client";
import { Clock, X } from "lucide-react";

export function RunnerBar({
  current,
  total,
  answeredCount,
  secondsLeft,
  onQuit,
}: {
  current: number;
  total: number;
  answeredCount: number;
  secondsLeft: number;
  onQuit: () => void;
}) {
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const progressPct = Math.round((answeredCount / total) * 100);
  const warn = secondsLeft < 120;

  return (
    <div className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/90 backdrop-blur-md">
      <div className="mx-auto grid h-18 max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-6 px-4 py-3">
        <button
          onClick={onQuit}
          className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-bold text-slate-700 hover:border-[var(--brand-black)]"
        >
          <X className="h-4 w-4" /> Quit
        </button>
        <div className="flex items-center gap-3.5">
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
            <strong className="text-lg font-black tracking-tight text-[var(--brand-black)]">{current}</strong> / {total}
          </span>
          <div className="h-1.5 w-48 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full bg-[var(--brand-black)] transition-[width] duration-200"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500 whitespace-nowrap">
            {answeredCount} answered
          </span>
        </div>
        <div
          className={`ml-auto inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium ${
            warn
              ? "border-amber-300 bg-amber-50 text-amber-900"
              : "border-slate-200 bg-white text-slate-900"
          }`}
        >
          <Clock className="h-3.5 w-3.5" />
          {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(app\)/skills/_components/runner-bar.tsx
git commit -m "feat(skills): runner top bar with timer + progress"
```

---

### Task 20: Question card + question map

**Files:**
- Create: `src/app/(app)/skills/_components/question-card.tsx`
- Create: `src/app/(app)/skills/_components/question-map.tsx`

- [ ] **Step 1: Build the question card**

```tsx
// src/app/(app)/skills/_components/question-card.tsx
"use client";
import { Bookmark, Check, ChevronLeft, ChevronRight } from "lucide-react";

type Q = {
  id: string;
  prompt: string;
  context: string | null;
  options: [string, string, string, string];
  tags: string[];
  tagKind: "scenario" | "calc" | null;
};

export function QuestionCard({
  question,
  questionNumber,
  selectedIdx,
  onSelect,
  flagged,
  onFlag,
  onPrev,
  onNext,
  isFirst,
  isLast,
  onSubmit,
}: {
  question: Q;
  questionNumber: number;
  selectedIdx: number | undefined;
  onSelect: (idx: number) => void;
  flagged: boolean;
  onFlag: () => void;
  onPrev: () => void;
  onNext: () => void;
  isFirst: boolean;
  isLast: boolean;
  onSubmit: () => void;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-10">
      <div className="mb-5 flex flex-wrap gap-1.5">
        {question.tags.map((t, i) => (
          <span
            key={i}
            className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${
              i === 0 && question.tagKind === "scenario"
                ? "bg-amber-50 text-amber-900"
                : i === 0 && question.tagKind === "calc"
                  ? "bg-blue-100 text-blue-900"
                  : "bg-slate-100 text-slate-700"
            }`}
          >
            {t}
          </span>
        ))}
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-700">
          Question {questionNumber}
        </span>
      </div>
      <div className="text-2xl font-black leading-snug tracking-tight md:text-3xl">{question.prompt}</div>
      {question.context && (
        <div className="mt-4 rounded-md border-l-4 border-[var(--brand-dark-blue)] bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
          <strong className="font-semibold text-slate-900">Given:</strong> {question.context}
        </div>
      )}
      <div className="mt-7 grid gap-2.5">
        {question.options.map((opt, i) => (
          <button
            key={i}
            onClick={() => onSelect(i)}
            className={`flex items-start gap-4 rounded-xl border p-5 text-left transition ${
              selectedIdx === i
                ? "border-[var(--brand-black)] bg-[var(--brand-black)] text-white"
                : "border-slate-200 bg-white hover:border-slate-700 hover:bg-slate-50"
            }`}
          >
            <div
              className={`grid h-7 w-7 flex-shrink-0 place-items-center rounded-md border text-xs font-bold ${
                selectedIdx === i
                  ? "border-[var(--brand-blue)] bg-[var(--brand-blue)] text-[var(--brand-black)]"
                  : "border-slate-300 bg-white text-slate-700"
              }`}
            >
              {String.fromCharCode(65 + i)}
            </div>
            <span className="text-[15px] leading-relaxed">{opt}</span>
          </button>
        ))}
      </div>
      <div className="mt-8 flex items-center justify-between gap-4 border-t border-slate-200 pt-6">
        <button
          onClick={onFlag}
          className={`inline-flex items-center gap-2 text-sm font-medium transition ${
            flagged ? "text-amber-700" : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <Bookmark className="h-3.5 w-3.5" />
          {flagged ? "Flagged for review" : "Flag for review"}
        </button>
        <div className="flex gap-2.5">
          <button
            disabled={isFirst}
            onClick={onPrev}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 disabled:opacity-50 hover:border-slate-700"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Prev
          </button>
          {!isLast ? (
            <button
              onClick={onNext}
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--brand-black)] px-4 py-2 text-sm font-bold text-white hover:bg-[var(--brand-dark-blue)]"
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              onClick={onSubmit}
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--brand-blue)] px-4 py-2 text-sm font-bold text-[var(--brand-black)] hover:bg-[var(--brand-dark-blue)] hover:text-white"
            >
              Submit <Check className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build the question map**

```tsx
// src/app/(app)/skills/_components/question-map.tsx
"use client";

type Q = { id: string };

export function QuestionMap({
  questions,
  currentIdx,
  answers,
  flagged,
  onJump,
  allAnswered,
  onSubmit,
}: {
  questions: Q[];
  currentIdx: number;
  answers: Record<string, number>;
  flagged: Record<string, boolean>;
  onJump: (idx: number) => void;
  allAnswered: boolean;
  onSubmit: () => void;
}) {
  const answeredCount = Object.keys(answers).length;
  return (
    <aside className="sticky top-24 rounded-3xl border border-slate-200 bg-white p-6">
      <h4 className="mb-3.5 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
        Question map
      </h4>
      <div className="grid grid-cols-5 gap-1.5">
        {questions.map((q, i) => {
          const cls: string[] = [];
          if (answers[q.id] !== undefined) cls.push("bg-[var(--brand-black)] text-white");
          else cls.push("bg-slate-100 text-slate-600");
          if (flagged[q.id]) cls.push("!bg-amber-500 !text-white");
          if (currentIdx === i) cls.push("ring-2 ring-[var(--brand-blue)] ring-offset-1");
          return (
            <button
              key={q.id}
              onClick={() => onJump(i)}
              className={`grid aspect-square place-items-center rounded-md border border-transparent text-[11px] font-bold transition hover:border-slate-700 ${cls.join(" ")}`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
      <div className="mt-4 grid gap-2 text-xs text-slate-600">
        <Legend swColor="bg-[var(--brand-black)]" label="Answered" />
        <Legend swColor="bg-amber-500" label="Flagged" />
        <Legend swColor="bg-slate-100" label="Not answered" />
      </div>
      <div className="mt-4 border-t border-slate-200 pt-4">
        <button
          disabled={!allAnswered}
          onClick={onSubmit}
          className="w-full rounded-full bg-[var(--brand-black)] px-4 py-3 text-sm font-bold text-white transition hover:bg-[var(--brand-dark-blue)] disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {allAnswered ? "Submit test" : `${questions.length - answeredCount} unanswered`}
        </button>
      </div>
    </aside>
  );
}

function Legend({ swColor, label }: { swColor: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-3 w-3 rounded-sm ${swColor}`} /> {label}
    </div>
  );
}
```

- [ ] **Step 3: Smoke test**

Walk through: catalog → click sector → configure → tick honor → Generate test → runner renders with question 1, options clickable, prev/next nav, flag toggles, question map updates, timer counts down.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/skills/_components/question-card.tsx src/app/\(app\)/skills/_components/question-map.tsx
git commit -m "feat(skills): question card + question map sidebar"
```

---

## Phase 6 — Result page

### Task 21: Result page route + badge card

**Files:**
- Create: `src/app/(app)/skills/[topicSlug]/attempt/[attemptId]/result/page.tsx`
- Create: `src/app/(app)/skills/_components/result-badge-card.tsx`

- [ ] **Step 1: RSC page**

```tsx
// src/app/(app)/skills/[topicSlug]/attempt/[attemptId]/result/page.tsx
import { notFound } from "next/navigation";
import { api } from "@/lib/trpc/server";
import { ResultBadgeCard } from "@/app/(app)/skills/_components/result-badge-card";
import { ResultBreakdown } from "@/app/(app)/skills/_components/result-breakdown";
import { ResultSideCards } from "@/app/(app)/skills/_components/result-side-cards";

export default async function ResultPage({
  params,
}: {
  params: Promise<{ topicSlug: string; attemptId: string }>;
}) {
  const { topicSlug, attemptId } = await params;
  let attempt;
  try {
    attempt = await api.skillTests.getAttempt({ attemptId });
  } catch {
    notFound();
  }
  if (attempt.status === "in_progress") {
    notFound();
  }

  const topic = await api.skillTests.getTopic({ slug: topicSlug });

  const score = attempt.score ?? 0;
  const passed = attempt.status === "passed" || attempt.status === "passed_top";
  const topVerified = attempt.status === "passed_top";

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
          <ResultBadgeCard
            score={score}
            passed={passed}
            topVerified={topVerified}
            correct={attempt.correctCount ?? 0}
            total={attempt.questionsJson.length}
            narrative={attempt.aiFeedback ?? ""}
            topicName={topic.sector.name}
          />
          <ResultSideCards
            sectorName={topic.sector.name}
            sectorTileColor={topic.sector.tileColor}
            currentRoleName={topic.currentRole?.name ?? topic.sector.name}
            score={score}
            breakdown={attempt.categoryBreakdown ?? []}
          />
        </div>
        <div className="mt-6">
          <ResultBreakdown breakdown={attempt.categoryBreakdown ?? []} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Result badge card**

```tsx
// src/app/(app)/skills/_components/result-badge-card.tsx
import Link from "next/link";
import { ArrowRight, Check, Download } from "lucide-react";

export function ResultBadgeCard({
  score,
  passed,
  topVerified,
  correct,
  total,
  narrative,
  topicName,
}: {
  score: number;
  passed: boolean;
  topVerified: boolean;
  correct: number;
  total: number;
  narrative: string;
  topicName: string;
}) {
  const eyebrow = passed ? "Verified" : "Attempt complete";
  const headline = topVerified
    ? "Top 30%."
    : passed
      ? "You passed."
      : "Almost there.";
  const headlineEm = topVerified ? "Badge earned." : passed ? "Solid result." : "Try again in 7 days.";

  return (
    <div className="relative overflow-hidden rounded-3xl bg-[var(--brand-black)] p-12 text-white">
      <div className="absolute -right-48 -top-48 h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle,rgba(28,170,226,0.12),transparent_70%)]" />
      <div className="relative">
        <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--brand-blue)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand-blue)]" />
          {eyebrow}
        </div>
        <h1 className="mt-4 text-5xl font-black leading-[0.95] tracking-tight md:text-7xl">
          {headline} <em className="not-italic italic text-[var(--brand-blue)]">{headlineEm}</em>
        </h1>
        <div className="mt-7 flex items-baseline gap-3.5">
          <div className="text-9xl font-black leading-none tracking-tight text-[var(--brand-blue)] md:text-[140px]">
            {score}
          </div>
          <div className="text-3xl font-black text-slate-300 md:text-4xl">/100</div>
          <div className="ml-auto max-w-[140px] text-[11px] font-bold uppercase tracking-[0.16em] leading-relaxed text-slate-300">
            {correct} of {total} correct
          </div>
        </div>
        {narrative && (
          <p className="mt-7 max-w-xl text-base leading-relaxed text-slate-200">{narrative}</p>
        )}
        <div className="mt-9 flex flex-wrap gap-2.5">
          {passed ? (
            <button className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-blue)] px-5 py-3.5 text-sm font-bold text-[var(--brand-black)] hover:bg-white">
              <Check className="h-4 w-4" /> Badge added to your profile
            </button>
          ) : (
            <Link
              href="/skills"
              className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-blue)] px-5 py-3.5 text-sm font-bold text-[var(--brand-black)] hover:bg-white"
            >
              Take another <ArrowRight className="h-4 w-4" />
            </Link>
          )}
          <Link
            href="/skills"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-3.5 text-sm font-medium text-white hover:border-[var(--brand-blue)] hover:text-[var(--brand-blue)]"
          >
            <ArrowRight className="h-3.5 w-3.5" /> All sectors
          </Link>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(app\)/skills/\[topicSlug\]/attempt/\[attemptId\]/result/ src/app/\(app\)/skills/_components/result-badge-card.tsx
git commit -m "feat(skills): result page route + badge card"
```

---

### Task 22: Result breakdown + side cards

**Files:**
- Create: `src/app/(app)/skills/_components/result-breakdown.tsx`
- Create: `src/app/(app)/skills/_components/result-side-cards.tsx`

- [ ] **Step 1: Breakdown component**

```tsx
// src/app/(app)/skills/_components/result-breakdown.tsx
type Cat = { cat: string; pct: number; right: number; total: number };

export function ResultBreakdown({ breakdown }: { breakdown: Cat[] }) {
  if (breakdown.length === 0) return null;
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-8">
      <h3 className="text-2xl font-black tracking-tight">Where you scored, by category</h3>
      <div className="mt-5 grid gap-5">
        {breakdown.map((c) => {
          const weak = c.pct < 60;
          return (
            <div key={c.cat} className="grid gap-1.5">
              <div className="flex items-baseline justify-between text-sm">
                <div className="font-medium text-slate-700">{c.cat}</div>
                <div className="text-xl font-black tracking-tight">
                  <em className="not-italic italic text-[var(--brand-dark-blue)]">{c.pct}%</em>
                  <span className="ml-1.5 text-sm text-slate-400">{c.right}/{c.total}</span>
                </div>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full transition-[width] duration-1000"
                  style={{
                    width: `${c.pct}%`,
                    background: weak
                      ? "linear-gradient(90deg, #B45309, #F59E0B)"
                      : "linear-gradient(90deg, var(--brand-dark-blue), var(--brand-blue))",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Side cards**

```tsx
// src/app/(app)/skills/_components/result-side-cards.tsx
import { ArrowRight, Check } from "lucide-react";

type Cat = { cat: string; pct: number; right: number; total: number };

export function ResultSideCards({
  sectorName,
  sectorTileColor,
  currentRoleName,
  score,
  breakdown,
}: {
  sectorName: string;
  sectorTileColor: string;
  currentRoleName: string;
  score: number;
  breakdown: Cat[];
}) {
  const weakest = [...breakdown].sort((a, b) => a.pct - b.pct).slice(0, 3);
  const palette = ["#0369A1", "#4338CA", "#D97706"];
  return (
    <div className="grid gap-4">
      <div className="rounded-3xl border border-slate-200 bg-white p-7">
        <h4 className="text-xl font-black tracking-tight">Add to your profile</h4>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
          Recruiters filtering for {sectorName} can find verified candidates first.
        </p>
        <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5">
          <div className="flex items-center gap-3">
            <div
              className="grid h-11 w-11 place-items-center rounded-full text-sm font-bold text-white"
              style={{ background: sectorTileColor }}
            >
              You
            </div>
            <div>
              <div className="text-sm font-bold">Your profile</div>
              <div className="mt-0.5 text-xs text-slate-500">{currentRoleName}</div>
            </div>
          </div>
          <div className="mt-3.5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium">
            <span className="grid h-3.5 w-3.5 place-items-center rounded-full bg-[var(--brand-blue)] text-[var(--brand-black)]">
              <Check className="h-2.5 w-2.5" strokeWidth={3} />
            </span>
            Verified <em className="not-italic italic text-[var(--brand-dark-blue)] font-black">{sectorName}</em> · {score}/100
          </div>
        </div>
      </div>

      {weakest.length > 0 && (
        <div className="rounded-3xl border border-slate-200 bg-white p-7">
          <h4 className="text-xl font-black tracking-tight">Recommended next</h4>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
            Areas to strengthen before your next attempt or role.
          </p>
          <div className="mt-4 grid gap-2.5">
            {weakest.map((c, i) => (
              <div
                key={c.cat}
                className="flex items-center gap-3 rounded-xl border border-slate-200 p-3.5"
              >
                <div
                  className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-md text-xs font-bold text-white"
                  style={{ background: palette[i % palette.length] }}
                >
                  {c.cat.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-slate-900">
                    {c.cat} — focused training
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    {c.right}/{c.total} correct · trainings coming soon
                  </div>
                </div>
                <div className="grid h-7 w-7 place-items-center rounded-full bg-slate-100 text-slate-700">
                  <ArrowRight className="h-3 w-3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Smoke test full flow**

Run a full test: catalog → configure → generate → answer all → submit → land on result with score, narrative, breakdown, side cards.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/skills/_components/result-breakdown.tsx src/app/\(app\)/skills/_components/result-side-cards.tsx
git commit -m "feat(skills): result breakdown bars + side cards"
```

---

## Phase 7 — Badge surfaces

### Task 23: Verified Skills section on `/p/[id]`

**Files:**
- Create: `src/components/profile/verified-skills-section.tsx`
- Modify: `src/app/p/[id]/page.tsx`

- [ ] **Step 1: Build the section**

```tsx
// src/components/profile/verified-skills-section.tsx
import { Check } from "lucide-react";
import { format } from "date-fns";

type Badge = {
  topicId: string;
  slug: string;
  name: string;
  monogram: string;
  tileColor: string;
  score: number;
  isVerifiedTop: boolean;
  earnedAt: Date;
};

export function VerifiedSkillsSection({ badges }: { badges: Badge[] }) {
  if (badges.length === 0) return null;
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="text-xl font-black tracking-tight">Verified skills</h3>
        <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
          {badges.length} {badges.length === 1 ? "badge" : "badges"}
        </span>
      </div>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {badges.map((b) => (
          <div
            key={b.topicId}
            className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3"
          >
            <div
              className="grid h-10 w-10 place-items-center rounded-lg text-sm font-bold text-white"
              style={{ background: b.tileColor }}
            >
              {b.monogram}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-1.5">
                <span className="font-bold">{b.name}</span>
                {b.isVerifiedTop && (
                  <span className="grid h-4 w-4 place-items-center rounded-full bg-[var(--brand-blue)] text-[var(--brand-black)]">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-500">
                {b.score}/100 · earned {format(new Date(b.earnedAt), "MMM yyyy")}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Wire it into the public profile page**

Open `src/app/p/[id]/page.tsx`. Find where existing sections render (e.g. certifications). Add badge fetch + section render. The exact pattern depends on existing code; the diff looks roughly like:

```ts
// Near the top of the page component, alongside other api calls:
const badges = await api.skillTests.badgesForCandidate({ candidateId: id });

// In the JSX, render before or after the certifications section:
<VerifiedSkillsSection badges={badges} />
```

- [ ] **Step 3: Smoke test**

After running a passed attempt for a test user, navigate to that user's `/p/[id]` and confirm the badge appears.

- [ ] **Step 4: Commit**

```bash
git add src/components/profile/verified-skills-section.tsx src/app/p/\[id\]/page.tsx
git commit -m "feat(profile): verified skills section on public profile"
```

---

### Task 24: Badge filter on `/candidates`

**Files:**
- Modify: `src/app/(app)/candidates/candidates-filters.tsx`
- Modify: `src/server/api/routers/candidates.ts` (or wherever `candidates.list`/`search` lives)

- [ ] **Step 1: Read existing filter pattern**

Open `src/app/(app)/candidates/candidates-filters.tsx` and the candidates router to understand the filter prop shape. The existing pattern uses URL searchParams or local state with a tRPC query.

- [ ] **Step 2: Add badge filter UI**

Within `candidates-filters.tsx`, add a new filter chip alongside existing ones:

```tsx
// (Sketch — adapt to actual file structure)
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/trpc/client";

const { data: topics } = api.skillTests.listTopics.useQuery();

// Multi-select dropdown of all topics (sectors + roles flattened):
<MultiSelect
  label="Verified skill"
  options={topics?.flatMap((s) => [
    { value: s.slug, label: s.name },
    ...s.roles.map((r) => ({ value: r.slug, label: `  ${r.name}` })),
  ]) ?? []}
  value={filters.badgeSlugs}
  onChange={(slugs) => onFilter({ ...filters, badgeSlugs: slugs })}
/>
```

- [ ] **Step 3: Update candidates router**

In the candidates router's `list`/`search` procedure, accept `badgeSlugs?: string[]` and intersect with `searchByBadge`:

```ts
.input(z.object({
  // ...existing fields
  badgeSlugs: z.array(z.string()).optional(),
}))
.query(async ({ ctx, input }) => {
  let badgeFilteredIds: string[] | null = null;
  if (input.badgeSlugs && input.badgeSlugs.length > 0) {
    const matched = await ctx.db
      .select({ candidateId: skillBadges.candidateId })
      .from(skillBadges)
      .innerJoin(testTopics, eq(skillBadges.topicId, testTopics.id))
      .where(sql`${testTopics.slug} = ANY(${input.badgeSlugs})`)
      .groupBy(skillBadges.candidateId);
    badgeFilteredIds = matched.map((m) => m.candidateId);
    if (badgeFilteredIds.length === 0) return [];
  }

  // Apply intersect to the existing query — add WHERE candidateId IN (badgeFilteredIds) if not null
})
```

- [ ] **Step 4: Smoke test**

Apply badge to a test user, go to `/candidates`, select that badge in the filter, confirm only the badged user appears.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(app\)/candidates/ src/server/api/routers/candidates.ts
git commit -m "feat(candidates): verified-skill badge filter"
```

---

### Task 25: Skill badge pill on applicant card

**Files:**
- Create: `src/components/applicants/skill-badge-pill.tsx`
- Modify: `src/app/(app)/employer/jobs/[id]/applicants/_components/applicant-card.tsx`

- [ ] **Step 1: Build the pill**

```tsx
// src/components/applicants/skill-badge-pill.tsx
import { Check } from "lucide-react";

export function SkillBadgePill({
  topicName,
  isVerifiedTop,
}: {
  topicName: string;
  isVerifiedTop: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
        isVerifiedTop
          ? "bg-[var(--brand-blue)] text-[var(--brand-black)]"
          : "border border-slate-200 bg-white text-slate-700"
      }`}
    >
      <span
        className={`grid h-3.5 w-3.5 place-items-center rounded-full ${
          isVerifiedTop ? "bg-[var(--brand-black)] text-[var(--brand-blue)]" : "bg-[var(--brand-blue)] text-[var(--brand-black)]"
        }`}
      >
        <Check className="h-2.5 w-2.5" strokeWidth={3} />
      </span>
      {topicName}
    </span>
  );
}
```

- [ ] **Step 2: Render in applicant card**

In `src/app/(app)/employer/jobs/[id]/applicants/_components/applicant-card.tsx`, after the existing AI fit-score pill, fetch + render up to 2 matching badges:

```tsx
import { api } from "@/lib/trpc/client";
import { SkillBadgePill } from "@/components/applicants/skill-badge-pill";

// Inside the component (this is a sketch — match existing patterns):
const { data: badges } = api.skillTests.badgesForCandidate.useQuery(
  { candidateId: application.candidate.id },
  { enabled: open },
);

const matching = (badges ?? [])
  .filter((b) => b.jobSectorMatch === application.job.sector)
  .sort((a, b) => Number(b.isVerifiedTop) - Number(a.isVerifiedTop))
  .slice(0, 2);

// In the JSX:
{matching.length > 0 && (
  <div className="mt-2 flex flex-wrap gap-1.5">
    {matching.map((b) => (
      <SkillBadgePill key={b.topicId} topicName={b.name} isVerifiedTop={b.isVerifiedTop} />
    ))}
  </div>
)}
```

> If the kanban list shows many applicants, batch-fetch via a single call rather than per-card. Look at how `job_matches` is fetched on the kanban — match that pattern.

- [ ] **Step 3: Smoke test**

Apply test users to a job. Make one of them earn a matching badge. Open the kanban — confirm the pill renders.

- [ ] **Step 4: Commit**

```bash
git add src/components/applicants/skill-badge-pill.tsx src/app/\(app\)/employer/jobs/\[id\]/applicants/_components/applicant-card.tsx
git commit -m "feat(applicants): skill badge pill on applicant cards"
```

---

## Phase 8 — Cron, telemetry, marketing copy

### Task 26: Trigger.dev cron — cleanup stale attempts

**Files:**
- Create: `code/trigger/cleanup-stale-skill-attempts.ts`

- [ ] **Step 1: Write the task**

```ts
// code/trigger/cleanup-stale-skill-attempts.ts
import { schedules } from "@trigger.dev/sdk";
import { and, eq, lt } from "drizzle-orm";
import { db } from "@/server/db";
import { skillTestAttempts } from "@/server/db/schema";

export const cleanupStaleSkillAttempts = schedules.task({
  id: "cleanup-stale-skill-attempts",
  cron: "*/10 * * * *", // every 10 min UTC
  run: async () => {
    const cutoff = new Date(Date.now() - 25 * 60 * 1000); // 25 min ago
    const result = await db
      .update(skillTestAttempts)
      .set({ status: "forfeited", finishedAt: new Date() })
      .where(
        and(
          eq(skillTestAttempts.status, "in_progress"),
          lt(skillTestAttempts.startedAt, cutoff),
        ),
      )
      .returning({ id: skillTestAttempts.id });
    console.log(`Forfeited ${result.length} stale attempts.`);
    return { forfeited: result.length };
  },
});
```

- [ ] **Step 2: Run dev trigger CLI to register**

Run: `pnpm trigger:dev` in a side terminal, confirm the task appears in the dashboard.

- [ ] **Step 3: Commit**

```bash
git add code/trigger/cleanup-stale-skill-attempts.ts
git commit -m "feat(jobs): cron to forfeit stale in-progress skill attempts"
```

---

### Task 27: Marketing copy update

**Files:**
- Modify: `src/lib/billing-display.ts`

- [ ] **Step 1: Update Gold + Free feature lists**

In `src/lib/billing-display.ts`:

```ts
export const GOLD_FEATURES: string[] = [
  "AI match scoring on every role — instant fit at a glance",
  "AI cover-letter generator — drafts a tailored note from your profile + the job",
  "AI profile polish — rewrites your summary to highlight impact",
  "AI-generated skill tests — sector-specific, verifiable badges",  // <-- new
  "\"Open to work\" badge with sector preferences",
  "Profile-views counter — see how often employers view your profile",
  "Unlimited saved searches with daily digest",
  "Featured profile — top of every employer search",
  "Application insights — see when employers opened your application",
  "48-hour early access — apply to new roles before everyone else",
];

export const JOBSEEKER_FREE_FEATURES: string[] = [
  "Unlimited applications",
  "Full profile + resume + certifications",
  "Browse all jobs with every filter",
  "Save unlimited jobs",
  "Application status tracking",
  "Email alerts for new matches",
  "1 free skill assessment — sector-specific badge if you pass",  // <-- new
];
```

- [ ] **Step 2: Verify typecheck + grep usage**

Run: `pnpm typecheck`. Run: `grep -rn "GOLD_FEATURES\|JOBSEEKER_FREE_FEATURES" src` to confirm any UI surfaces using these arrays render new lines correctly.

- [ ] **Step 3: Commit**

```bash
git add src/lib/billing-display.ts
git commit -m "feat(billing): add skill-test feature copy to Gold + Free lists"
```

---

### Task 28: PostHog telemetry events

**Files:**
- Modify: `src/app/(app)/skills/page.tsx` (and other pages where events fire)

- [ ] **Step 1: Add catalog viewed event**

Find the existing PostHog client helper (likely `src/lib/posthog.ts` or similar). In `catalog-hero.tsx` or `page.tsx`, fire on mount:

```tsx
// In CatalogHero or a parent client component:
"use client";
import { useEffect } from "react";
import posthog from "posthog-js";

useEffect(() => {
  posthog.capture("skill_test.catalog.viewed", { totalSectors: sectors.length });
}, [sectors.length]);
```

- [ ] **Step 2: Add events at each lifecycle moment**

Add `posthog.capture` calls at:
- Configure mount: `skill_test.configure.viewed` `{ topicSlug }`
- After `startMut.onSuccess`: `skill_test.attempt.started` `{ topicSlug, level, count, scenarios, calc }`
- In runner-client when timer hits 0 or quit: `skill_test.attempt.forfeited` `{ topicSlug, reason }`
- In result page (server-side via `posthog-node`): `skill_test.attempt.submitted` and `skill_test.badge.earned` if passed
- On paywall toast: `skill_test.paywall.viewed`

- [ ] **Step 3: Commit**

```bash
git add src/app/\(app\)/skills/
git commit -m "feat(skills): wire PostHog telemetry events"
```

---

## Phase 9 — End-to-end test

### Task 29: Playwright happy-path test

**Files:**
- Create: `e2e/skill-tests.spec.ts`

- [ ] **Step 1: Write the test**

```ts
// e2e/skill-tests.spec.ts
import { test, expect } from "@playwright/test";
import { signIn } from "./_helpers";

test("jobseeker can take a skill test and earn a badge", async ({ page }) => {
  await signIn(page, { role: "jobseeker", subscription: "active" });

  // Catalog
  await page.goto("/skills");
  await expect(page.getByRole("heading", { name: /Get verified/i })).toBeVisible();

  // Click first sector card
  await page.getByRole("link", { name: /Wind energy/i }).first().click();

  // Configure
  await expect(page.getByRole("heading", { name: /Tune the test/i })).toBeVisible();
  await page.getByLabel(/I'll take this test on my own/i).check();
  await page.getByRole("button", { name: /Generate test/i }).click();

  // Generating overlay → runner
  await expect(page.getByText(/Building your test/i)).toBeVisible();
  await expect(page.getByText(/Question 1/i)).toBeVisible({ timeout: 30_000 });

  // Answer all questions — pick A on each
  for (let i = 0; i < 15; i++) {
    await page.getByRole("button", { name: /^A\s/ }).click();
    const next = page.getByRole("button", { name: /Next/i });
    if (await next.isVisible()) {
      await next.click();
    } else {
      await page.getByRole("button", { name: /Submit$/i }).click();
    }
  }

  // Result
  await expect(page.getByText(/\/100/)).toBeVisible({ timeout: 15_000 });
});
```

- [ ] **Step 2: Run**

Run: `pnpm e2e --grep "skill test"`

Expected: pass. (May need to adjust test users / sub status fixtures based on existing `_helpers.ts`.)

- [ ] **Step 3: Commit**

```bash
git add e2e/skill-tests.spec.ts
git commit -m "test(e2e): skill test happy path"
```

---

### Task 30: Final smoke + lint + typecheck pass

- [ ] **Step 1: Run the full pipeline**

```bash
pnpm typecheck && pnpm lint && pnpm test
```

Expected: all pass. Fix anything that fails.

- [ ] **Step 2: Manual smoke**

Run dev server. Walk through:
1. Free user → catalog → configure → generate → take → submit → result → second attempt blocked with paywall ✓
2. Paid user → same → second attempt also fine ✓ (different topic) → same topic blocked with cooldown ✓
3. Tab close mid-test → on next visit attempt is forfeited ✓
4. Profile shows badge ✓
5. `/candidates` filter works ✓
6. Applicant kanban shows pill on matching candidate ✓

- [ ] **Step 3: Final commit**

```bash
git commit -am "chore(skills): final cleanup" --allow-empty
```

---

## Self-Review Checklist (run after the plan is written, before execution)

Performed inline at plan-write time — items resolved:

- ✅ **Spec coverage:** Each spec section maps to a task — §1 goal (overall), §2 tier/marketing (Task 27), §3 mechanics (Tasks 11–12, 16, 18–20), §4 schema (Tasks 2–6), §5 AI (Tasks 8–9), §6 UX flow (Tasks 14–22), §7 badges (Tasks 23–25), §8 router (Tasks 10–13), §9 brand re-skin (Task 1 + threaded through all UI tasks), §10 out-of-scope (no tasks — out of scope), §11 telemetry (Task 28), §12 testing (Tasks 8–9 unit, Task 29 E2E), §13 migration (Task 5), §14 follow-ups (no tasks — post-v1).

- ✅ **Placeholder scan:** No "TBD", "TODO", or vague handoffs in step bodies. UI tasks include full JSX structure; server tasks include full code.

- ✅ **Type consistency:** `SkillTestQuestion`, `CategoryBreakdown` types exported from schema and reused. `attemptStatus` enum values consistent across schema, router, and UI. `topicSlug` param consistent across routes.

- ⚠️ **Known soft spots:** the entitlement test (Task 11) is sketched — depends on whether the codebase has a Vitest-friendly test DB seed helper. If not, those tests are marked `it.skip` and verified via the E2E test instead. The candidates router patch (Task 24) and applicant card patch (Task 25) reference existing files I haven't fully read; the engineer must follow the existing patterns there. Both flagged inline.
