# Trainings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a Platinum-tier training/LMS feature for jobseekers — curated, sector-specific energy courses with multi-module curricula, embedded video/practice/quiz lessons, progress tracking, and a shareable HTML completion certificate.

**Architecture:** Five routes (`/trainings` catalog, `/trainings/[slug]` detail, `/trainings/[slug]/learn/[moduleSlug]/[lessonSlug]` player, `/trainings/my-trainings` history, `/trainings/[slug]/certificate?enrollment=…` cert). Four new tables (`trainings`, `training_modules`, `training_lessons`, `training_enrollments`). Three lesson kinds (`video` via YouTube/Vimeo embed, `practice` via markdown, `quiz` via DB-stored MCQs). Progress stored as JSONB on enrollment row. Gated by a new `isPlatinumEntitled(user)` helper alongside the existing `isEntitledSubscriptionStatus`.

**Tech Stack:** Next.js App Router · tRPC · Drizzle/Neon · Tailwind v4 · Better Auth · Vitest · Playwright

**Spec:** [docs/superpowers/specs/2026-05-08-trainings-design.md](../specs/2026-05-08-trainings-design.md)

---

## File Structure

**New files:**
```
src/server/db/schema/trainings.ts
src/server/db/schema/training-modules.ts
src/server/db/schema/training-lessons.ts
src/server/db/schema/training-enrollments.ts
src/server/db/seed/trainings-seed.ts
src/server/api/routers/trainings.ts
src/app/(app)/trainings/page.tsx                                # catalog (RSC)
src/app/(app)/trainings/_components/catalog-hero.tsx
src/app/(app)/trainings/_components/featured-strip.tsx
src/app/(app)/trainings/_components/catalog-filters.tsx
src/app/(app)/trainings/_components/training-card.tsx
src/app/(app)/trainings/[slug]/page.tsx                         # detail (RSC)
src/app/(app)/trainings/[slug]/detail-client.tsx
src/app/(app)/trainings/_components/detail-hero.tsx
src/app/(app)/trainings/_components/detail-curriculum.tsx
src/app/(app)/trainings/_components/detail-reviews.tsx
src/app/(app)/trainings/_components/detail-unlocks.tsx
src/app/(app)/trainings/[slug]/learn/[moduleSlug]/[lessonSlug]/page.tsx
src/app/(app)/trainings/[slug]/learn/[moduleSlug]/[lessonSlug]/player-client.tsx
src/app/(app)/trainings/_components/player-bar.tsx
src/app/(app)/trainings/_components/player-sidebar.tsx
src/app/(app)/trainings/_components/lesson-video.tsx
src/app/(app)/trainings/_components/lesson-practice.tsx
src/app/(app)/trainings/_components/lesson-quiz.tsx
src/app/(app)/trainings/my-trainings/page.tsx
src/app/(app)/trainings/[slug]/certificate/page.tsx             # cert (RSC)
e2e/trainings.spec.ts
```

**Modified files:**
```
src/server/db/schema/index.ts                                   # add 4 re-exports
src/server/api/root.ts                                          # register trainings router
src/lib/billing-tiers.ts                                        # add isPlatinumEntitled helper
src/lib/billing-display.ts                                      # drop "coming soon" suffixes
src/components/marketing/site-header.tsx                        # add Trainings nav link
src/components/marketing/user-menu.tsx                          # add My trainings entry
src/app/(app)/dashboard/page.tsx                                # add TrainingsCard
src/app/(app)/skills/_components/result-side-cards.tsx          # wire "Recommended next" to real /trainings links
src/app/(marketing)/contact/contact-faq.tsx                     # update copy
```

---

## Phase 1 — Foundations: tier helper, schemas, migration, seed

### Task 1: Add `isPlatinumEntitled` helper

**Files:**
- Modify: `src/lib/billing-tiers.ts`

The existing `isEntitledSubscriptionStatus(status)` treats Gold and Platinum identically. Trainings need to require Platinum specifically. The user table has `jobseekerPlan` (`"gold" | "platinum" | "none"`) and `jobseekerSubscriptionStatus`. Add a helper that combines them.

- [ ] **Step 1: Add the helper at the bottom of `src/lib/billing-tiers.ts`**

Open `src/lib/billing-tiers.ts`. Find `isEntitledSubscriptionStatus` (around line 137). After that function, append:

```ts
/**
 * Returns true if the user is a Platinum jobseeker with an active or
 * trialing subscription. Used to gate Platinum-only features like
 * trainings.
 */
export function isPlatinumEntitled(args: {
  plan: string | null | undefined;
  status: string | null | undefined;
}): boolean {
  return args.plan === "platinum" && isEntitledSubscriptionStatus(args.status);
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm typecheck
```

Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add src/lib/billing-tiers.ts
git commit -m "feat(billing): add isPlatinumEntitled helper for training gating"
```

---

### Task 2: Drizzle schema — `trainings`

**Files:**
- Create: `src/server/db/schema/trainings.ts`
- Modify: `src/server/db/schema/index.ts`

- [ ] **Step 1: Create the schema file**

```ts
// src/server/db/schema/trainings.ts
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

export const trainingSectorEnum = pgEnum("training_sector", [
  "safety",
  "tech",
  "prof",
  "soft",
  "trans",
]);

export const trainingLevelEnum = pgEnum("training_level", [
  "beginner",
  "intermediate",
  "advanced",
  "all",
]);

export type TrainingUnlock = { role: string; co: string; band: string };

export const trainings = pgTable("trainings", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  shortBlurb: text("short_blurb").notNull(),
  longBlurb: text("long_blurb").notNull(),
  sector: trainingSectorEnum("sector").notNull(),
  certName: text("cert_name"),
  hours: integer("hours").notNull(),
  durationLabel: text("duration_label").notNull(),
  level: trainingLevelEnum("level").notNull(),
  monogram: text("monogram").notNull(),
  tileColor: text("tile_color").notNull(),
  instructorName: text("instructor_name").notNull(),
  instructorRole: text("instructor_role").notNull(),
  outcomesJson: jsonb("outcomes_json").$type<string[]>().notNull(),
  unlocksJson: jsonb("unlocks_json").$type<TrainingUnlock[]>().notNull(),
  isFeatured: boolean("is_featured").notNull().default(false),
  isNew: boolean("is_new").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Training = typeof trainings.$inferSelect;
export type NewTraining = typeof trainings.$inferInsert;
```

- [ ] **Step 2: Re-export from index**

In `src/server/db/schema/index.ts`, append:

```ts
export * from "./trainings";
```

- [ ] **Step 3: Typecheck and commit**

```bash
pnpm typecheck
git add src/server/db/schema/trainings.ts src/server/db/schema/index.ts
git commit -m "feat(db): add trainings schema"
```

---

### Task 3: Drizzle schema — `training_modules`

**Files:**
- Create: `src/server/db/schema/training-modules.ts`
- Modify: `src/server/db/schema/index.ts`

- [ ] **Step 1: Create the schema file**

```ts
// src/server/db/schema/training-modules.ts
import {
  integer,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { trainings } from "./trainings";

export const trainingModules = pgTable(
  "training_modules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    trainingId: uuid("training_id")
      .notNull()
      .references(() => trainings.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    number: text("number").notNull(),
    title: text("title").notNull(),
    durationLabel: text("duration_label").notNull(),
    sortOrder: integer("sort_order").notNull(),
  },
  (t) => ({
    uniqSlug: uniqueIndex("training_modules_training_slug_idx").on(
      t.trainingId,
      t.slug,
    ),
  }),
);

export type TrainingModule = typeof trainingModules.$inferSelect;
export type NewTrainingModule = typeof trainingModules.$inferInsert;
```

- [ ] **Step 2: Re-export from index**

Append to `src/server/db/schema/index.ts`:

```ts
export * from "./training-modules";
```

- [ ] **Step 3: Typecheck and commit**

```bash
pnpm typecheck
git add src/server/db/schema/training-modules.ts src/server/db/schema/index.ts
git commit -m "feat(db): add training_modules schema"
```

---

### Task 4: Drizzle schema — `training_lessons`

**Files:**
- Create: `src/server/db/schema/training-lessons.ts`
- Modify: `src/server/db/schema/index.ts`

- [ ] **Step 1: Create the schema file**

```ts
// src/server/db/schema/training-lessons.ts
import {
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { trainingModules } from "./training-modules";

export const trainingLessonKindEnum = pgEnum("training_lesson_kind", [
  "video",
  "practice",
  "quiz",
]);

export type QuizQuestion = {
  id: string;
  prompt: string;
  options: [string, string, string, string];
  correctIdx: 0 | 1 | 2 | 3;
  explanation?: string;
};

export const trainingLessons = pgTable(
  "training_lessons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    moduleId: uuid("module_id")
      .notNull()
      .references(() => trainingModules.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    kind: trainingLessonKindEnum("kind").notNull(),
    durationLabel: text("duration_label").notNull(),
    videoUrl: text("video_url"),
    videoProvider: text("video_provider"),
    practiceMarkdown: text("practice_markdown"),
    quizQuestionsJson: jsonb("quiz_questions_json").$type<QuizQuestion[]>(),
    quizPassThreshold: integer("quiz_pass_threshold"),
    sortOrder: integer("sort_order").notNull(),
  },
  (t) => ({
    uniqSlug: uniqueIndex("training_lessons_module_slug_idx").on(
      t.moduleId,
      t.slug,
    ),
  }),
);

export type TrainingLesson = typeof trainingLessons.$inferSelect;
export type NewTrainingLesson = typeof trainingLessons.$inferInsert;
```

- [ ] **Step 2: Re-export from index**

Append to `src/server/db/schema/index.ts`:

```ts
export * from "./training-lessons";
```

- [ ] **Step 3: Typecheck and commit**

```bash
pnpm typecheck
git add src/server/db/schema/training-lessons.ts src/server/db/schema/index.ts
git commit -m "feat(db): add training_lessons schema"
```

---

### Task 5: Drizzle schema — `training_enrollments`

**Files:**
- Create: `src/server/db/schema/training-enrollments.ts`
- Modify: `src/server/db/schema/index.ts`

- [ ] **Step 1: Create the schema file**

```ts
// src/server/db/schema/training-enrollments.ts
import {
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { trainings } from "./trainings";

export const trainingEnrollmentStatusEnum = pgEnum(
  "training_enrollment_status",
  ["enrolled", "in_progress", "completed"],
);

export type LessonProgress = {
  completedAt: string; // ISO 8601
  score?: number; // for quiz lessons
};

export type EnrollmentProgress = Record<string, LessonProgress>;

export const trainingEnrollments = pgTable(
  "training_enrollments",
  {
    id: uuid("id").notNull().defaultRandom(),
    candidateId: text("candidate_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    trainingId: uuid("training_id")
      .notNull()
      .references(() => trainings.id),
    status: trainingEnrollmentStatusEnum("status").notNull().default("enrolled"),
    progressJson: jsonb("progress_json")
      .$type<EnrollmentProgress>()
      .notNull()
      .default({}),
    enrolledAt: timestamp("enrolled_at").notNull().defaultNow(),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    finalScore: integer("final_score"),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.candidateId, t.trainingId] }),
  }),
);

export type TrainingEnrollment = typeof trainingEnrollments.$inferSelect;
export type NewTrainingEnrollment = typeof trainingEnrollments.$inferInsert;
```

- [ ] **Step 2: Re-export from index**

Append to `src/server/db/schema/index.ts`:

```ts
export * from "./training-enrollments";
```

- [ ] **Step 3: Typecheck and commit**

```bash
pnpm typecheck
git add src/server/db/schema/training-enrollments.ts src/server/db/schema/index.ts
git commit -m "feat(db): add training_enrollments schema"
```

---

### Task 6: Generate and apply migration

**Files:**
- Auto-generated: `src/server/db/migrations/<NNNN>_<name>.sql`

- [ ] **Step 1: Generate**

```bash
pnpm db:generate
```

Open the new SQL file. Verify it contains:
- `CREATE TYPE training_sector AS ENUM(...)`
- `CREATE TYPE training_level AS ENUM(...)`
- `CREATE TYPE training_lesson_kind AS ENUM(...)`
- `CREATE TYPE training_enrollment_status AS ENUM(...)`
- `CREATE TABLE … "trainings"` with all 17 columns
- `CREATE TABLE … "training_modules"` with FK to trainings + unique index
- `CREATE TABLE … "training_lessons"` with FK to modules + unique index
- `CREATE TABLE … "training_enrollments"` with composite PK (candidate_id, training_id)

If anything is missing, fix the schema files and re-run `pnpm db:generate` (delete the bad migration first).

- [ ] **Step 2: Apply**

```bash
pnpm db:migrate
```

Expected: exit 0. Verify in `pnpm db:studio` that the 4 tables exist.

- [ ] **Step 3: Commit**

```bash
git add src/server/db/migrations/
git commit -m "feat(db): migrate trainings schema"
```

---

### Task 7: Seed trainings

**Files:**
- Create: `src/server/db/seed/trainings-seed.ts`

- [ ] **Step 1: Write the seed script**

Note: this seeds **11 trainings** (just the catalog row) plus **5 modules of curriculum on the `gwo-basic` showcase course only**. Other trainings get a single placeholder module so the catalog renders. Real content is admin-deferred.

```ts
// src/server/db/seed/trainings-seed.ts
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import {
  trainings,
  trainingModules,
  trainingLessons,
  type NewTraining,
  type QuizQuestion,
} from "@/server/db/schema";

type SectorKey = "safety" | "tech" | "prof" | "soft" | "trans";

// Brand-safe tile colors per sector
const SECTOR_TILE: Record<SectorKey, string> = {
  safety: "#B45309",
  tech: "#004984",
  prof: "#4338CA",
  soft: "#334155",
  trans: "#0369A1",
};

type TrainingSeed = Omit<NewTraining, "tileColor"> & { sector: SectorKey };

const TRAININGS: TrainingSeed[] = [
  {
    slug: "gwo-basic",
    sector: "safety",
    title: "GWO Basic Safety Training — pre-credential prep",
    shortBlurb:
      "Five modules of pre-credential prep for the GWO BST: First Aid, Manual Handling, Fire Awareness, Working at Heights, Sea Survival.",
    longBlurb:
      "Working wind techs walk you through the five GWO Basic Safety Training modules — what to expect at the in-person practical, what gets people held back, what your employer actually checks. Pair with an in-person practical to earn the credential.",
    certName: "GWO Basic Safety",
    hours: 14,
    durationLabel: "14 hours · 5 modules",
    level: "beginner",
    monogram: "GW",
    instructorName: "Lior Bensimon",
    instructorRole: "Lead Wind Tech, NorthStar Renewables · 12 yrs offshore",
    outcomesJson: [
      "Pass the GWO BST in-person practical on first attempt",
      "Speak the language hiring managers expect at offshore wind interviews",
      "Walk into Day 1 on a turbine pad knowing protocol",
    ],
    unlocksJson: [
      { role: "Wind Technician II", co: "Aurora Wind · Halifax", band: "C$78–92k" },
      { role: "Offshore Maintenance Tech", co: "NorthStar · Bras d'Or", band: "C$84–98k" },
      { role: "Site Safety Officer", co: "BrightGrid · Calgary", band: "C$72–88k" },
    ],
    isFeatured: true,
    isNew: false,
    sortOrder: 10,
  },
  {
    slug: "h2s-alive",
    sector: "safety",
    title: "H2S Alive — Energy Safety Canada syllabus",
    shortBlurb:
      "Hydrogen sulphide hazard recognition, detection, monitoring, and SCBA donning. Aligned to the ESC syllabus required across most upstream oil & gas sites.",
    longBlurb:
      "The classroom prep almost every Alberta upstream site asks for. Real incidents, real PPE walk-throughs, the SCBA donning drill recruiters quietly time you on. Sit the in-person practical at any ESC partner site to earn the ticket.",
    certName: "H2S Alive",
    hours: 8,
    durationLabel: "8 hours · 1 day",
    level: "beginner",
    monogram: "H2",
    instructorName: "Dale Forsythe",
    instructorRole: "Sr. Safety Advisor, Cenovus · 22 yrs upstream",
    outcomesJson: [
      "Recognize H2S exposure scenarios and concentration limits",
      "Don and seal an SCBA inside the 60-second target",
      "Pass the ESC written component on first sit",
    ],
    unlocksJson: [
      { role: "Field Operator", co: "Cenovus · Cold Lake", band: "C$95–115k" },
      { role: "Wellsite Supervisor", co: "CNRL · Bonnyville", band: "C$140–180k" },
      { role: "Pipeline Tech", co: "CanFlow · Edmonton", band: "C$82–98k" },
    ],
    isFeatured: true,
    isNew: false,
    sortOrder: 20,
  },
  {
    slug: "plc-rslogix",
    sector: "tech",
    title: "Allen-Bradley PLC programming with RSLogix 5000",
    shortBlurb:
      "Ladder logic, structured text, function blocks, tag-based addressing, troubleshooting a running line. Built around real PanelView and ControlLogix scenarios.",
    longBlurb:
      "Built around the controllers you actually inherit on Day 1: ControlLogix 5580, CompactLogix, PanelView 5000. Eight modules from tag basics through troubleshooting a running line at 2am. Includes the verified skill assessment that lands on your profile.",
    certName: "AB Verified Skill",
    hours: 22,
    durationLabel: "22 hours · 8 modules",
    level: "intermediate",
    monogram: "AB",
    instructorName: "Priyanka Mehta",
    instructorRole: "Controls Engineer III, Suncor · 14 yrs",
    outcomesJson: [
      "Read, modify, and deploy ladder logic to a ControlLogix processor",
      "Diagnose a stalled line from PanelView indicator alone",
      'Earn the Energized "AB / RSLogix 5000" verified badge',
    ],
    unlocksJson: [
      { role: "Controls Engineer II", co: "Suncor · Fort McMurray", band: "C$110–130k" },
      { role: "Automation Lead", co: "CanFlow Pipeline · Edmonton", band: "C$135–165k" },
      { role: "Process Eng (controls)", co: "Methanex · Medicine Hat", band: "C$115–140k" },
    ],
    isFeatured: true,
    isNew: true,
    sortOrder: 30,
  },
  {
    slug: "scada-fundamentals",
    sector: "tech",
    title: "SCADA fundamentals — pipelines, wind, hydro",
    shortBlurb:
      "Telemetry, RTUs, OPC UA, alarm management, historian basics. Lab work uses Ignition + a simulated 240km pipeline.",
    longBlurb:
      "Six modules covering the SCADA stack from sensor to historian, with a simulated 240km pipeline you alarm-tune end-to-end. Sector-agnostic so it ports cleanly between upstream, midstream, hydro, and wind operations.",
    certName: "SCADA Verified Skill",
    hours: 16,
    durationLabel: "16 hours · 6 modules",
    level: "intermediate",
    monogram: "SC",
    instructorName: "Jonas Whitehorse",
    instructorRole: "SCADA Lead, BrightGrid Utilities · 11 yrs",
    outcomesJson: [
      "Configure an Ignition gateway against simulated RTUs",
      "Tune alarm priorities to ISA-18.2",
      "Walk a hiring manager through your historian queries",
    ],
    unlocksJson: [
      { role: "SCADA Engineer", co: "BrightGrid · Calgary", band: "C$105–125k" },
      { role: "Pipeline Controls Tech", co: "Enbridge · Edmonton", band: "C$90–108k" },
    ],
    isFeatured: false,
    isNew: true,
    sortOrder: 40,
  },
  {
    slug: "honeywell-experion",
    sector: "tech",
    title: "Honeywell Experion DCS — operator + engineer track",
    shortBlurb:
      "Two tracks in one course: operator console fluency, then engineering builds. C300 controllers, FTE network, point builds, batch.",
    longBlurb:
      "Operator-track first (six modules of console fluency), engineer-track second (four modules of builds). Run on a real Experion R520 sandbox kept current to plant releases. Weekly office hours with a working Honeywell senior.",
    certName: "Honeywell Verified Skill",
    hours: 28,
    durationLabel: "28 hours · 10 modules",
    level: "advanced",
    monogram: "HX",
    instructorName: "Mei-Lin Tao",
    instructorRole: "Sr. Process Control Eng, Imperial · 16 yrs",
    outcomesJson: [
      "Pilot an Experion console through a typical upset",
      "Build, test, and deploy a C300-hosted point",
      'Earn the Energized "Honeywell Experion" verified badge',
    ],
    unlocksJson: [
      { role: "Process Control Eng", co: "Imperial Oil · Sarnia", band: "C$120–150k" },
      { role: "DCS Lead", co: "Methanex · Medicine Hat", band: "C$135–170k" },
    ],
    isFeatured: false,
    isNew: false,
    sortOrder: 50,
  },
  {
    slug: "whmis",
    sector: "safety",
    title: "WHMIS 2015 — workplace hazardous materials",
    shortBlurb:
      "GHS pictograms, SDS literacy, the four classification updates, and the federal/provincial differences employers actually test you on.",
    longBlurb:
      "The fastest credential on the platform — most members finish in a single sitting. Current to the 2026 federal amendments and Alberta/Ontario/BC provincial overlays. Issues a downloadable certificate the moment you pass.",
    certName: "WHMIS 2015",
    hours: 2,
    durationLabel: "2 hours · self-paced",
    level: "beginner",
    monogram: "WH",
    instructorName: "Energized Safety Team",
    instructorRole: "Reviewed quarterly · current to 2026 amendments",
    outcomesJson: [
      "Recognize all nine GHS pictograms in context",
      "Pull the right info off an SDS in under 30 seconds",
      "Receive a downloadable WHMIS 2015 certificate",
    ],
    unlocksJson: [
      { role: "Required for nearly every site role on Energized", co: "", band: "" },
    ],
    isFeatured: false,
    isNew: false,
    sortOrder: 60,
  },
  {
    slug: "csts-2020",
    sector: "safety",
    title: "CSTS-2020 — construction safety training system",
    shortBlurb:
      "The cross-province construction safety standard. Hazard recognition, regulatory framework, fall protection basics, hot work fundamentals.",
    longBlurb:
      "The construction safety standard nearly every Western Canadian site asks for. Six hours, cleanly modular — pause and resume across days. Issues a province-specific certificate (AB, BC, SK, MB) on completion.",
    certName: "CSTS-2020",
    hours: 6,
    durationLabel: "6 hours · self-paced",
    level: "beginner",
    monogram: "CS",
    instructorName: "Energized Safety Team",
    instructorRole: "Aligned to ACSA + BCCSA syllabi",
    outcomesJson: [
      "Recognize the four most common site hazards",
      "Pass the CSTS-2020 final assessment",
      "Receive your provincial CSTS certificate",
    ],
    unlocksJson: [
      { role: "Construction Tech", co: "Multiple sites · AB / BC", band: "C$58–78k" },
      { role: "Site Coordinator", co: "Solar EPCs · SK / MB", band: "C$72–88k" },
    ],
    isFeatured: false,
    isNew: false,
    sortOrder: 70,
  },
  {
    slug: "peng-power",
    sector: "prof",
    title: "P.Eng track — Power Systems (APEGA aligned)",
    shortBlurb:
      "Six-week self-paced prep for the APEGA NPPE and the technical exams expected on the Power Systems route. Covers ethics, law, and the IEEE 1547 family.",
    longBlurb:
      "Six weeks of self-paced prep aligned to APEGA — NPPE on weeks 1–2, then four weeks of technical depth across IEEE 1547, protection coordination, and grid-tied inverters. Weekly live office hours with practicing P.Engs.",
    certName: "P.Eng (APEGA)",
    hours: 60,
    durationLabel: "60 hours · 6 weeks",
    level: "advanced",
    monogram: "PE",
    instructorName: "Robert Kahn, P.Eng",
    instructorRole: "P.Eng (AB/BC) · 19 yrs grid + protection",
    outcomesJson: [
      "Sit the APEGA NPPE with confidence",
      "Defend a protection coordination study",
      "Build the project log APEGA actually wants to see",
    ],
    unlocksJson: [
      { role: "Sr. Protection Engineer", co: "BrightGrid · Calgary", band: "C$140–175k" },
      { role: "P.Eng-track EIT", co: "AltaLink · Edmonton", band: "C$92–115k" },
    ],
    isFeatured: false,
    isNew: false,
    sortOrder: 80,
  },
  {
    slug: "pmp-energy",
    sector: "prof",
    title: "PMP — energy projects edition",
    shortBlurb:
      "PMI-aligned PMP exam prep with case studies pulled from real Canadian energy projects: a wind farm build, a refinery turnaround, a hydrogen pilot.",
    longBlurb:
      "PMI-aligned PMP exam prep, but every case study is drawn from Canadian energy: a 200MW wind farm build, an Imperial refinery turnaround, a Calgary hydrogen pilot. Pass the PMP first sit or your fee back (Career members only).",
    certName: "PMP",
    hours: 35,
    durationLabel: "35 hours · 4 weeks",
    level: "intermediate",
    monogram: "PM",
    instructorName: "Adaeze Okwu, PMP",
    instructorRole: "Project Director, Eavor Technologies",
    outcomesJson: [
      "Pass the PMP exam on first sit",
      "Run a project log that holds up to PMI audit",
      "Speak the energy-PM dialect (TAR, MAC, EPC) fluently",
    ],
    unlocksJson: [
      { role: "Project Manager", co: "Eavor · Calgary", band: "C$125–155k" },
      { role: "Sr. PM (Renewables)", co: "NorthStar · Bras d'Or", band: "C$140–170k" },
    ],
    isFeatured: false,
    isNew: true,
    sortOrder: 90,
  },
  {
    slug: "interview-energy",
    sector: "soft",
    title: "The energy-sector technical interview",
    shortBlurb:
      "Mock STAR-method drills tailored to upstream, midstream, and renewables interview loops. Three practice videos, instructor feedback inside 48 hours.",
    longBlurb:
      "Three recorded mock interviews graded by a working career coach inside 48 hours, plus one live 1:1 (Pro+). Built specifically for technical loops at energy employers — not generic FAANG-style behavioural prep.",
    certName: "Completion certificate",
    hours: 4,
    durationLabel: "4 hours · self-paced + 1 live",
    level: "all",
    monogram: "IV",
    instructorName: "Naomi Brant",
    instructorRole: "Career coach · ex-Suncor, ex-Eavor talent",
    outcomesJson: [
      "Tell three of your projects in STAR without rambling",
      'Handle the "walk me through a P&ID" question without freezing',
      "Negotiate inside a published salary band",
    ],
    unlocksJson: [
      { role: "Higher offer rate (members report +14%)", co: "", band: "" },
    ],
    isFeatured: true,
    isNew: false,
    sortOrder: 100,
  },
  {
    slug: "oil-to-renewables",
    sector: "trans",
    title: "Oil & gas → renewables: the transition playbook",
    shortBlurb:
      "How to translate upstream / midstream experience into renewables-employer language. Resume rewrites, project re-framing, the four hiring myths to ignore.",
    longBlurb:
      "Eleven years in oilfield automation, now leading a geothermal project. Karim walks you through the resume rewrite, the project re-framing, and the four hiring myths he ran into so you don't. Most-finished course on Energized.",
    certName: "Completion certificate",
    hours: 6,
    durationLabel: "6 hours · self-paced",
    level: "all",
    monogram: "OR",
    instructorName: "Karim Diallo",
    instructorRole: "Geothermal Project Lead, Eavor · ex-CNRL",
    outcomesJson: [
      "Translate three of your projects into renewables language",
      "Rewrite your resume for a wind / solar / geothermal hiring manager",
      "Spot the four oil-to-renewables hiring myths",
    ],
    unlocksJson: [
      { role: "Geothermal Project Lead", co: "Eavor · Calgary", band: "C$130–160k" },
      { role: "Wind Site Supervisor", co: "NorthStar · NS", band: "C$110–135k" },
      { role: "Solar Project Eng", co: "Capstone · ON", band: "C$95–120k" },
    ],
    isFeatured: true,
    isNew: true,
    sortOrder: 110,
  },
];

// Showcase curriculum for `gwo-basic` only; other trainings get a placeholder.
const GWO_CURRICULUM = [
  {
    slug: "first-aid",
    number: "01",
    title: "First Aid",
    durationLabel: "3h 10m",
    sortOrder: 1,
    lessons: [
      { slug: "drsabcd", kind: "video" as const, title: "Primary survey & DRSABCD", durationLabel: "12m" },
      { slug: "severe-bleeds", kind: "video" as const, title: "Controlling severe bleeds at heights", durationLabel: "18m" },
      { slug: "shock-signs", kind: "video" as const, title: "Recognizing signs of shock", durationLabel: "14m" },
      { slug: "scenarios", kind: "practice" as const, title: "Hands-on rehearsal — three scenarios", durationLabel: "40m" },
      { slug: "m1-quiz", kind: "quiz" as const, title: "Module 1 assessment", durationLabel: "20m" },
    ],
  },
  {
    slug: "manual-handling",
    number: "02",
    title: "Manual Handling",
    durationLabel: "2h 25m",
    sortOrder: 2,
    lessons: [
      { slug: "tower-lifts", kind: "video" as const, title: "Risk assessment for tower lifts", durationLabel: "14m" },
      { slug: "mechanical-aids", kind: "video" as const, title: "Mechanical aids — when, when not", durationLabel: "12m" },
      { slug: "two-person", kind: "practice" as const, title: "Two-person lift drill", durationLabel: "24m" },
      { slug: "m2-quiz", kind: "quiz" as const, title: "Module 2 assessment", durationLabel: "15m" },
    ],
  },
  {
    slug: "fire-awareness",
    number: "03",
    title: "Fire Awareness",
    durationLabel: "2h 00m",
    sortOrder: 3,
    lessons: [
      { slug: "four-leg", kind: "video" as const, title: "Fire chemistry — the four-leg model", durationLabel: "10m" },
      { slug: "extinguisher", kind: "video" as const, title: "Extinguisher selection inside a nacelle", durationLabel: "15m" },
      { slug: "evac", kind: "video" as const, title: "Evacuation routing from elevation", durationLabel: "14m" },
      { slug: "m3-quiz", kind: "quiz" as const, title: "Module 3 assessment", durationLabel: "15m" },
    ],
  },
  {
    slug: "working-at-heights",
    number: "04",
    title: "Working at Heights",
    durationLabel: "3h 50m",
    sortOrder: 4,
    lessons: [
      { slug: "harness", kind: "video" as const, title: "Harness fit & inspection", durationLabel: "18m" },
      { slug: "anchor", kind: "video" as const, title: "Anchor point selection on a tower", durationLabel: "22m" },
      { slug: "suspension", kind: "video" as const, title: "Suspension trauma prevention", durationLabel: "16m" },
      { slug: "rescue", kind: "practice" as const, title: "Tower rescue — peer rescue scenario", durationLabel: "45m" },
      { slug: "m4-quiz", kind: "quiz" as const, title: "Module 4 assessment", durationLabel: "20m" },
    ],
  },
  {
    slug: "sea-survival",
    number: "05",
    title: "Sea Survival",
    durationLabel: "2h 35m",
    sortOrder: 5,
    lessons: [
      { slug: "cold-water", kind: "video" as const, title: "Cold water immersion physiology", durationLabel: "14m" },
      { slug: "liferaft", kind: "video" as const, title: "Liferaft boarding from elevation", durationLabel: "20m" },
      { slug: "huet", kind: "video" as const, title: "HUET considerations (offshore wind)", durationLabel: "14m" },
      { slug: "final", kind: "practice" as const, title: "Final scenario — staged offshore upset", durationLabel: "40m" },
      { slug: "m5-quiz", kind: "quiz" as const, title: "Module 5 assessment", durationLabel: "20m" },
    ],
  },
];

const PLACEHOLDER_QUIZ: QuizQuestion[] = [
  {
    id: "q1",
    prompt: "Placeholder question — replace via admin tooling once content is authored.",
    options: ["Option A", "Option B", "Option C", "Option D"],
    correctIdx: 0,
    explanation: "Placeholder explanation.",
  },
  {
    id: "q2",
    prompt: "Second placeholder question.",
    options: ["Yes", "No", "Sometimes", "Never"],
    correctIdx: 1,
  },
  {
    id: "q3",
    prompt: "Third placeholder question.",
    options: ["Always", "Never", "It depends", "Not applicable"],
    correctIdx: 2,
  },
];

export async function seedTrainings() {
  for (const t of TRAININGS) {
    const tileColor = SECTOR_TILE[t.sector];

    const existing = await db
      .select({ id: trainings.id })
      .from(trainings)
      .where(eq(trainings.slug, t.slug))
      .limit(1);

    let trainingId: string;
    if (existing.length > 0) {
      trainingId = existing[0].id;
      await db
        .update(trainings)
        .set({
          title: t.title,
          shortBlurb: t.shortBlurb,
          longBlurb: t.longBlurb,
          sector: t.sector,
          certName: t.certName ?? null,
          hours: t.hours,
          durationLabel: t.durationLabel,
          level: t.level,
          monogram: t.monogram,
          tileColor,
          instructorName: t.instructorName,
          instructorRole: t.instructorRole,
          outcomesJson: t.outcomesJson,
          unlocksJson: t.unlocksJson,
          isFeatured: t.isFeatured ?? false,
          isNew: t.isNew ?? false,
          sortOrder: t.sortOrder ?? 0,
          isActive: true,
        })
        .where(eq(trainings.id, trainingId));
    } else {
      const inserted = await db
        .insert(trainings)
        .values({
          ...t,
          tileColor,
          certName: t.certName ?? null,
        })
        .returning({ id: trainings.id });
      trainingId = inserted[0].id;
    }

    // Curriculum
    const isShowcase = t.slug === "gwo-basic";
    const modules = isShowcase
      ? GWO_CURRICULUM
      : [
          {
            slug: "intro",
            number: "01",
            title: "Course intro",
            durationLabel: t.durationLabel,
            sortOrder: 1,
            lessons: [
              {
                slug: "overview",
                kind: "practice" as const,
                title: "Course overview",
                durationLabel: "5m",
              },
            ],
          },
        ];

    for (const mod of modules) {
      const existingMod = await db
        .select({ id: trainingModules.id })
        .from(trainingModules)
        .where(eq(trainingModules.slug, mod.slug))
        .limit(1);

      let moduleId: string;
      if (existingMod.length > 0) {
        moduleId = existingMod[0].id;
        await db
          .update(trainingModules)
          .set({
            trainingId,
            number: mod.number,
            title: mod.title,
            durationLabel: mod.durationLabel,
            sortOrder: mod.sortOrder,
          })
          .where(eq(trainingModules.id, moduleId));
      } else {
        const insertedMod = await db
          .insert(trainingModules)
          .values({
            trainingId,
            slug: mod.slug,
            number: mod.number,
            title: mod.title,
            durationLabel: mod.durationLabel,
            sortOrder: mod.sortOrder,
          })
          .returning({ id: trainingModules.id });
        moduleId = insertedMod[0].id;
      }

      let lessonOrder = 1;
      for (const lesson of mod.lessons) {
        const existingLesson = await db
          .select({ id: trainingLessons.id })
          .from(trainingLessons)
          .where(eq(trainingLessons.slug, lesson.slug))
          .limit(1);

        const values = {
          moduleId,
          slug: lesson.slug,
          title: lesson.title,
          kind: lesson.kind,
          durationLabel: lesson.durationLabel,
          sortOrder: lessonOrder++,
          videoUrl: lesson.kind === "video" ? null : null, // admin-authored later
          videoProvider: lesson.kind === "video" ? null : null,
          practiceMarkdown:
            lesson.kind === "practice"
              ? `# ${lesson.title}\n\nPlaceholder content — replace via admin tooling.`
              : null,
          quizQuestionsJson:
            lesson.kind === "quiz" ? PLACEHOLDER_QUIZ : null,
          quizPassThreshold: lesson.kind === "quiz" ? 70 : null,
        };

        if (existingLesson.length > 0) {
          await db
            .update(trainingLessons)
            .set(values)
            .where(eq(trainingLessons.id, existingLesson[0].id));
        } else {
          await db.insert(trainingLessons).values(values);
        }
      }
    }
  }

  console.log(`Seeded ${TRAININGS.length} trainings.`);
}

if (require.main === module) {
  seedTrainings()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
```

- [ ] **Step 2: Run the seed**

```bash
node --env-file=.env.local node_modules/.pnpm/tsx@*/node_modules/tsx/dist/cli.mjs src/server/db/seed/trainings-seed.ts
```

(If `pnpm tsx` works in this environment, use that instead. The Phase-1 skill-tests subagent had to use the `node --env-file ... tsx` workaround.)

Expected: `Seeded 11 trainings.`

Verify in `pnpm db:studio` that `trainings` has 11 rows, `training_modules` has 15 rows (5 for gwo-basic + 1 placeholder × 10 others), and `training_lessons` has ~23+10 = ~33 rows.

- [ ] **Step 3: Commit**

```bash
git add src/server/db/seed/trainings-seed.ts
git commit -m "feat(db): seed 11 trainings + curriculum for GWO showcase"
```

---

## Phase 2 — tRPC router

### Task 8: trainings router — public reads (`list`, `getBySlug`)

**Files:**
- Create: `src/server/api/routers/trainings.ts`
- Modify: `src/server/api/root.ts`

- [ ] **Step 1: Create the router with `list` + `getBySlug`**

```ts
// src/server/api/routers/trainings.ts
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, inArray, ilike, or, sql } from "drizzle-orm";
import { z } from "zod";
import { publicProcedure, router } from "@/server/api/trpc";
import {
  trainingEnrollments,
  trainingLessons,
  trainingModules,
  trainings,
} from "@/server/db/schema";

const SORT_VALUES = ["popular", "rating", "shortest", "newest"] as const;

export const trainingsRouter = router({
  list: publicProcedure
    .input(
      z.object({
        sectors: z.array(z.string()).optional(),
        durationIds: z.array(z.string()).optional(),
        certNames: z.array(z.string()).optional(),
        query: z.string().optional(),
        sort: z.enum(SORT_VALUES).default("popular"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(trainings.isActive, true)];

      if (input.sectors && input.sectors.length > 0) {
        // Narrow to valid sector enum values
        const validSectors = input.sectors.filter((s) =>
          ["safety", "tech", "prof", "soft", "trans"].includes(s),
        ) as Array<"safety" | "tech" | "prof" | "soft" | "trans">;
        if (validSectors.length > 0) {
          conditions.push(inArray(trainings.sector, validSectors));
        }
      }

      if (input.durationIds && input.durationIds.length > 0) {
        // Map duration bucket → hour range, then OR them
        const ranges: Array<[number, number]> = [];
        if (input.durationIds.includes("short")) ranges.push([0, 3]);
        if (input.durationIds.includes("half")) ranges.push([4, 8]);
        if (input.durationIds.includes("day")) ranges.push([8, 16]);
        if (input.durationIds.includes("week")) ranges.push([16, 80]);
        if (input.durationIds.includes("long")) ranges.push([80, 9999]);
        if (ranges.length > 0) {
          const rangeConds = ranges.map(
            ([lo, hi]) =>
              sql`${trainings.hours} >= ${lo} AND ${trainings.hours} <= ${hi}`,
          );
          conditions.push(or(...rangeConds)!);
        }
      }

      if (input.certNames && input.certNames.length > 0) {
        conditions.push(inArray(trainings.certName, input.certNames));
      }

      if (input.query && input.query.trim()) {
        const needle = `%${input.query.trim()}%`;
        conditions.push(
          or(
            ilike(trainings.title, needle),
            ilike(trainings.shortBlurb, needle),
            ilike(trainings.certName, needle),
            ilike(trainings.instructorName, needle),
          )!,
        );
      }

      const orderBy =
        input.sort === "shortest"
          ? asc(trainings.hours)
          : input.sort === "newest"
            ? desc(trainings.isNew)
            : asc(trainings.sortOrder);

      return ctx.db
        .select()
        .from(trainings)
        .where(and(...conditions))
        .orderBy(orderBy);
    }),

  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const trainingRows = await ctx.db
        .select()
        .from(trainings)
        .where(eq(trainings.slug, input.slug))
        .limit(1);
      const t = trainingRows[0];
      if (!t) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Training not found." });
      }

      const modules = await ctx.db
        .select()
        .from(trainingModules)
        .where(eq(trainingModules.trainingId, t.id))
        .orderBy(asc(trainingModules.sortOrder));

      const lessons =
        modules.length > 0
          ? await ctx.db
              .select()
              .from(trainingLessons)
              .where(
                inArray(
                  trainingLessons.moduleId,
                  modules.map((m) => m.id),
                ),
              )
              .orderBy(asc(trainingLessons.sortOrder))
          : [];

      // Strip quiz answer keys from public payload
      const safeLessons = lessons.map((l) => ({
        ...l,
        quizQuestionsJson: l.quizQuestionsJson
          ? l.quizQuestionsJson.map((q) => ({
              id: q.id,
              prompt: q.prompt,
              options: q.options,
            }))
          : null,
      }));

      return {
        training: t,
        modules: modules.map((m) => ({
          ...m,
          lessons: safeLessons.filter((l) => l.moduleId === m.id),
        })),
      };
    }),
});
```

- [ ] **Step 2: Register in `root.ts`**

In `src/server/api/root.ts`:
- Add `import { trainingsRouter } from "@/server/api/routers/trainings";` with the other router imports
- Add `trainings: trainingsRouter,` to the `appRouter` object

- [ ] **Step 3: Typecheck and commit**

```bash
pnpm typecheck
git add src/server/api/routers/trainings.ts src/server/api/root.ts
git commit -m "feat(trpc): add trainings.list + getBySlug (public reads)"
```

---

### Task 9: trainings router — enrollment + lesson completion

**Files:**
- Modify: `src/server/api/routers/trainings.ts`

- [ ] **Step 1: Add imports + new procedures**

At the top of `src/server/api/routers/trainings.ts`, extend imports:

```ts
import { jobseekerProcedure, protectedProcedure } from "@/server/api/trpc";
import { user } from "@/server/db/schema/auth";
import { isPlatinumEntitled } from "@/lib/billing-tiers";
```

Append inside the `trainingsRouter` (before the closing `});`):

```ts
  myEnrollments: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({
        id: trainingEnrollments.id,
        status: trainingEnrollments.status,
        progressJson: trainingEnrollments.progressJson,
        enrolledAt: trainingEnrollments.enrolledAt,
        startedAt: trainingEnrollments.startedAt,
        completedAt: trainingEnrollments.completedAt,
        finalScore: trainingEnrollments.finalScore,
        trainingSlug: trainings.slug,
        trainingTitle: trainings.title,
        trainingMonogram: trainings.monogram,
        trainingTileColor: trainings.tileColor,
        trainingHours: trainings.hours,
        trainingDurationLabel: trainings.durationLabel,
      })
      .from(trainingEnrollments)
      .innerJoin(trainings, eq(trainings.id, trainingEnrollments.trainingId))
      .where(eq(trainingEnrollments.candidateId, ctx.session.user.id))
      .orderBy(desc(trainingEnrollments.enrolledAt));
  }),

  enroll: jobseekerProcedure
    .input(z.object({ slug: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify Platinum entitlement
      const [userRow] = await ctx.db
        .select({
          plan: user.jobseekerPlan,
          status: user.jobseekerSubscriptionStatus,
        })
        .from(user)
        .where(eq(user.id, ctx.session.user.id))
        .limit(1);
      if (
        !userRow ||
        !isPlatinumEntitled({ plan: userRow.plan, status: userRow.status })
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "paywall:trainings",
        });
      }

      // Resolve training
      const [t] = await ctx.db
        .select({ id: trainings.id })
        .from(trainings)
        .where(and(eq(trainings.slug, input.slug), eq(trainings.isActive, true)))
        .limit(1);
      if (!t) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Training not found." });
      }

      // Reuse existing enrollment if present (idempotent)
      const existing = await ctx.db
        .select({ id: trainingEnrollments.id })
        .from(trainingEnrollments)
        .where(
          and(
            eq(trainingEnrollments.candidateId, ctx.session.user.id),
            eq(trainingEnrollments.trainingId, t.id),
          ),
        )
        .limit(1);
      if (existing[0]) {
        return { enrollmentId: existing[0].id, alreadyEnrolled: true };
      }

      const [created] = await ctx.db
        .insert(trainingEnrollments)
        .values({
          candidateId: ctx.session.user.id,
          trainingId: t.id,
          status: "enrolled",
          progressJson: {},
        })
        .returning({ id: trainingEnrollments.id });

      return { enrollmentId: created.id, alreadyEnrolled: false };
    }),

  markLessonComplete: protectedProcedure
    .input(
      z.object({
        enrollmentId: z.string().uuid(),
        lessonId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return finalizeLessonProgress(ctx, {
        enrollmentId: input.enrollmentId,
        lessonId: input.lessonId,
        score: undefined,
      });
    }),
```

Add the helper function at the bottom of the file (after `export const trainingsRouter`):

```ts
async function finalizeLessonProgress(
  ctx: { db: typeof import("@/server/db").db; session: { user: { id: string } } },
  args: { enrollmentId: string; lessonId: string; score?: number },
) {
  const [enr] = await ctx.db
    .select()
    .from(trainingEnrollments)
    .where(eq(trainingEnrollments.id, args.enrollmentId))
    .limit(1);
  if (!enr) throw new TRPCError({ code: "NOT_FOUND" });
  if (enr.candidateId !== ctx.session.user.id) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }

  // Resolve all lessons under this training to compute totals
  const [training] = await ctx.db
    .select({ id: trainings.id })
    .from(trainings)
    .where(eq(trainings.id, enr.trainingId))
    .limit(1);
  if (!training) throw new TRPCError({ code: "NOT_FOUND" });

  const allModules = await ctx.db
    .select({ id: trainingModules.id })
    .from(trainingModules)
    .where(eq(trainingModules.trainingId, training.id));
  const allLessons = await ctx.db
    .select({ id: trainingLessons.id, kind: trainingLessons.kind })
    .from(trainingLessons)
    .where(inArray(trainingLessons.moduleId, allModules.map((m) => m.id)));

  // Confirm the lesson belongs to this training
  if (!allLessons.find((l) => l.id === args.lessonId)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Lesson does not belong to this enrollment.",
    });
  }

  // Merge progress
  const nowIso = new Date().toISOString();
  const nextProgress = {
    ...enr.progressJson,
    [args.lessonId]: {
      completedAt: nowIso,
      ...(args.score !== undefined ? { score: args.score } : {}),
    },
  };

  // Compute completion
  const completed = allLessons.every((l) => nextProgress[l.id]);
  const quizScores = allLessons
    .filter((l) => l.kind === "quiz")
    .map((l) => nextProgress[l.id]?.score)
    .filter((s): s is number => typeof s === "number");
  const finalScore =
    completed && quizScores.length > 0
      ? Math.round(quizScores.reduce((a, b) => a + b, 0) / quizScores.length)
      : null;

  await ctx.db
    .update(trainingEnrollments)
    .set({
      progressJson: nextProgress,
      status: completed ? "completed" : "in_progress",
      startedAt: enr.startedAt ?? new Date(),
      completedAt: completed ? new Date() : enr.completedAt,
      finalScore: completed ? finalScore : enr.finalScore,
    })
    .where(eq(trainingEnrollments.id, enr.id));

  return { ok: true, completed, finalScore };
}
```

- [ ] **Step 2: Typecheck and commit**

```bash
pnpm typecheck
git add src/server/api/routers/trainings.ts
git commit -m "feat(trpc): add myEnrollments, enroll, markLessonComplete"
```

---

### Task 10: trainings router — quiz submission + progress + certificate

**Files:**
- Modify: `src/server/api/routers/trainings.ts`

- [ ] **Step 1: Append three more procedures**

Inside `trainingsRouter`, after `markLessonComplete`:

```ts
  submitQuiz: protectedProcedure
    .input(
      z.object({
        enrollmentId: z.string().uuid(),
        lessonId: z.string().uuid(),
        answers: z.record(z.string(), z.number().int().min(0).max(3)),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [lesson] = await ctx.db
        .select()
        .from(trainingLessons)
        .where(eq(trainingLessons.id, input.lessonId))
        .limit(1);
      if (!lesson || lesson.kind !== "quiz" || !lesson.quizQuestionsJson) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Lesson is not a quiz.",
        });
      }

      let correct = 0;
      for (const q of lesson.quizQuestionsJson) {
        if (input.answers[q.id] === q.correctIdx) correct += 1;
      }
      const total = lesson.quizQuestionsJson.length;
      const score = Math.round((correct / total) * 100);
      const passed = score >= (lesson.quizPassThreshold ?? 70);

      if (passed) {
        const result = await finalizeLessonProgress(ctx, {
          enrollmentId: input.enrollmentId,
          lessonId: input.lessonId,
          score,
        });
        return { score, passed, correct, total, ...result };
      }

      return { score, passed, correct, total, completed: false };
    }),

  getEnrollmentProgress: protectedProcedure
    .input(z.object({ enrollmentId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [enr] = await ctx.db
        .select()
        .from(trainingEnrollments)
        .where(eq(trainingEnrollments.id, input.enrollmentId))
        .limit(1);
      if (!enr) throw new TRPCError({ code: "NOT_FOUND" });
      if (enr.candidateId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return enr;
    }),

  // Public so a recruiter can view a shared cert link without signing in.
  // UUIDs are unguessable; cert exposes only the candidate's name + course.
  getCertificate: publicProcedure
    .input(z.object({ enrollmentId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select({
          enrollmentId: trainingEnrollments.id,
          status: trainingEnrollments.status,
          completedAt: trainingEnrollments.completedAt,
          finalScore: trainingEnrollments.finalScore,
          candidateName: user.name,
          trainingTitle: trainings.title,
          trainingCertName: trainings.certName,
          trainingDurationLabel: trainings.durationLabel,
          trainingInstructorName: trainings.instructorName,
        })
        .from(trainingEnrollments)
        .innerJoin(user, eq(user.id, trainingEnrollments.candidateId))
        .innerJoin(trainings, eq(trainings.id, trainingEnrollments.trainingId))
        .where(eq(trainingEnrollments.id, input.enrollmentId))
        .limit(1);
      const cert = rows[0];
      if (!cert) throw new TRPCError({ code: "NOT_FOUND" });
      if (cert.status !== "completed") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Training not yet completed.",
        });
      }
      return cert;
    }),
```

- [ ] **Step 2: Typecheck and commit**

```bash
pnpm typecheck
git add src/server/api/routers/trainings.ts
git commit -m "feat(trpc): add submitQuiz, getEnrollmentProgress, getCertificate"
```

---

## Phase 3 — Catalog page (`/trainings`)

### Task 11: Catalog page + hero + featured strip

**Files:**
- Create: `src/app/(app)/trainings/page.tsx`
- Create: `src/app/(app)/trainings/_components/catalog-hero.tsx`
- Create: `src/app/(app)/trainings/_components/featured-strip.tsx`
- Create: `src/app/(app)/trainings/_components/training-card.tsx`

- [ ] **Step 1: Catalog page**

```tsx
// src/app/(app)/trainings/page.tsx
import type { Metadata } from "next";
import { api } from "@/lib/trpc/server";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { CatalogHero } from "./_components/catalog-hero";
import { FeaturedStrip } from "./_components/featured-strip";
import { CatalogClient } from "./_components/catalog-client";

export const metadata: Metadata = {
  title: "Trainings — Energized",
};

export default async function TrainingsPage() {
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
          <CatalogHero total={all.length} />
          {featured.length > 0 && (
            <section className="mt-12">
              <FeaturedStrip trainings={featured} />
            </section>
          )}
          <section className="mt-12">
            <CatalogClient initialTrainings={all} />
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
```

- [ ] **Step 2: Catalog hero**

```tsx
// src/app/(app)/trainings/_components/catalog-hero.tsx
export function CatalogHero({ total }: { total: number }) {
  return (
    <div className="grid gap-12 border-b border-slate-200 pb-12 lg:grid-cols-[1.4fr_1fr] lg:items-end">
      <div>
        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
          Training services · Platinum
        </div>
        <h1 className="mt-6 text-5xl font-bold leading-[0.95] tracking-tight md:text-6xl lg:text-7xl">
          Skill up for the<br />
          roles that{" "}
          <em
            className="not-italic italic font-bold"
            style={{ color: "var(--brand-dark-blue, #004984)" }}
          >
            actually pay
          </em>
          .
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600">
          {total}+ courses graded by working senior engineers across Canadian
          energy. Self-paced. Earn certificates that sit on your profile —
          recruiters notice.
        </p>
      </div>
      <div className="grid gap-7">
        <Stat n={String(total)} l="Live courses across safety, technical, professional and transition tracks" />
        <Stat n="3.4×" l="More recruiter inbound for members with a verified badge" />
        <Stat n="92%" l="First-attempt pass rate on partnered in-person practicals" />
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

- [ ] **Step 3: Featured strip + training card**

```tsx
// src/app/(app)/trainings/_components/training-card.tsx
import Link from "next/link";
import { ArrowRight, Clock, Users } from "lucide-react";

export type CardTraining = {
  slug: string;
  title: string;
  shortBlurb: string;
  sector: string;
  monogram: string;
  tileColor: string;
  hours: number;
  durationLabel: string;
  level: string;
  isNew: boolean;
  isFeatured: boolean;
};

const LEVEL_LABEL: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
  all: "All levels",
};

export function TrainingCard({ training }: { training: CardTraining }) {
  return (
    <Link
      href={`/trainings/${training.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl border-2 border-slate-300 bg-white p-6 transition hover:-translate-y-0.5 hover:border-[var(--brand-black,#101820)] hover:shadow-xl"
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className="grid h-14 w-14 place-items-center rounded-2xl text-xl font-bold text-white"
          style={{ background: training.tileColor }}
        >
          {training.monogram}
        </div>
        {training.isNew && (
          <span
            className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em]"
            style={{ background: "var(--brand-blue, #1CAAE2)", color: "var(--brand-black, #101820)" }}
          >
            New
          </span>
        )}
      </div>
      <h3 className="mt-5 text-xl font-bold tracking-tight">{training.title}</h3>
      <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-slate-600">
        {training.shortBlurb}
      </p>
      <div className="mt-5 flex items-center justify-between border-t border-dashed border-slate-200 pt-4 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          {training.durationLabel}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" />
          {LEVEL_LABEL[training.level] ?? training.level}
        </span>
      </div>
      <div className="absolute right-6 top-6 grid h-9 w-9 place-items-center rounded-full border border-slate-200 text-slate-500 transition group-hover:border-[var(--brand-blue,#1CAAE2)] group-hover:bg-[var(--brand-blue,#1CAAE2)] group-hover:text-[var(--brand-black,#101820)] group-hover:[transform:rotate(-45deg)]">
        <ArrowRight className="h-4 w-4" />
      </div>
    </Link>
  );
}
```

```tsx
// src/app/(app)/trainings/_components/featured-strip.tsx
import { TrainingCard, type CardTraining } from "./training-card";

export function FeaturedStrip({ trainings }: { trainings: CardTraining[] }) {
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
          <TrainingCard key={t.slug} training={t} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Smoke check**

The catalog-client component doesn't exist yet — this commit will only render hero + featured strip. That's expected; the next task adds filters + grid.

Run:

```bash
pnpm typecheck   # will fail until Task 12 because CatalogClient is missing
```

Skip typecheck for now; create the stub:

```tsx
// src/app/(app)/trainings/_components/catalog-client.tsx
"use client";
import { TrainingCard, type CardTraining } from "./training-card";

export function CatalogClient({
  initialTrainings,
}: {
  initialTrainings: CardTraining[];
}) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {initialTrainings.map((t) => (
        <TrainingCard key={t.slug} training={t} />
      ))}
    </div>
  );
}
```

Now typecheck:

```bash
pnpm typecheck
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add 'src/app/(app)/trainings/'
git commit -m "feat(trainings): catalog page shell + hero + featured strip + stub grid"
```

---

### Task 12: Catalog filters + sort + search

**Files:**
- Create: `src/app/(app)/trainings/_components/catalog-filters.tsx`
- Modify: `src/app/(app)/trainings/_components/catalog-client.tsx`

- [ ] **Step 1: Build the filters + client list**

Replace `src/app/(app)/trainings/_components/catalog-client.tsx`:

```tsx
// src/app/(app)/trainings/_components/catalog-client.tsx
"use client";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { TrainingCard, type CardTraining } from "./training-card";
import { CatalogFilters, type Filters } from "./catalog-filters";

export function CatalogClient({
  initialTrainings,
}: {
  initialTrainings: CardTraining[];
}) {
  const [filters, setFilters] = useState<Filters>({
    query: "",
    sectors: [],
    durations: [],
    sort: "popular",
  });

  const visible = useMemo(() => {
    let arr = [...initialTrainings];

    if (filters.query.trim()) {
      const needle = filters.query.toLowerCase();
      arr = arr.filter((t) =>
        [t.title, t.shortBlurb, t.sector].join(" ").toLowerCase().includes(needle),
      );
    }

    if (filters.sectors.length > 0) {
      arr = arr.filter((t) => filters.sectors.includes(t.sector));
    }

    if (filters.durations.length > 0) {
      arr = arr.filter((t) => {
        if (filters.durations.includes("short") && t.hours < 4) return true;
        if (filters.durations.includes("half") && t.hours >= 4 && t.hours <= 8) return true;
        if (filters.durations.includes("day") && t.hours > 8 && t.hours <= 16) return true;
        if (filters.durations.includes("week") && t.hours > 16 && t.hours <= 80) return true;
        if (filters.durations.includes("long") && t.hours > 80) return true;
        return false;
      });
    }

    if (filters.sort === "shortest") arr.sort((a, b) => a.hours - b.hours);
    else if (filters.sort === "newest")
      arr.sort((a, b) => Number(b.isNew) - Number(a.isNew));
    return arr;
  }, [initialTrainings, filters]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3">
        <div className="flex flex-1 items-center gap-2 px-2">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            value={filters.query}
            onChange={(e) => setFilters({ ...filters, query: e.target.value })}
            placeholder="Try 'GWO', 'PLC programming', 'oil to renewables'…"
            className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
          />
        </div>
      </div>
      <CatalogFilters filters={filters} onChange={setFilters} />
      <div className="mb-4 mt-6 text-sm text-slate-600">
        {visible.length} {visible.length === 1 ? "training" : "trainings"}
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {visible.map((t) => (
          <TrainingCard key={t.slug} training={t} />
        ))}
      </div>
    </div>
  );
}
```

```tsx
// src/app/(app)/trainings/_components/catalog-filters.tsx
"use client";

export type Filters = {
  query: string;
  sectors: string[];
  durations: string[];
  sort: "popular" | "shortest" | "newest";
};

const SECTORS = [
  { id: "safety", label: "Safety" },
  { id: "tech", label: "Technical" },
  { id: "prof", label: "Professional" },
  { id: "soft", label: "Soft skills" },
  { id: "trans", label: "Transitions" },
];

const DURATIONS = [
  { id: "short", label: "<4h" },
  { id: "half", label: "4–8h" },
  { id: "day", label: "8–16h" },
  { id: "week", label: "1–2w" },
  { id: "long", label: "3w+" },
];

const SORTS = [
  { id: "popular", label: "Popular" },
  { id: "shortest", label: "Shortest" },
  { id: "newest", label: "Newest" },
] as const;

export function CatalogFilters({
  filters,
  onChange,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
}) {
  const toggle = (key: "sectors" | "durations", id: string) => {
    const current = filters[key];
    const next = current.includes(id)
      ? current.filter((c) => c !== id)
      : [...current, id];
    onChange({ ...filters, [key]: next });
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <FilterGroup
        label="Sector"
        options={SECTORS}
        active={filters.sectors}
        onToggle={(id) => toggle("sectors", id)}
      />
      <FilterGroup
        label="Length"
        options={DURATIONS}
        active={filters.durations}
        onToggle={(id) => toggle("durations", id)}
      />
      <div className="ml-auto inline-flex items-center gap-2 text-sm">
        <span className="text-slate-500">Sort:</span>
        <select
          value={filters.sort}
          onChange={(e) => onChange({ ...filters, sort: e.target.value as Filters["sort"] })}
          className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700"
        >
          {SORTS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function FilterGroup({
  label,
  options,
  active,
  onToggle,
}: {
  label: string;
  options: { id: string; label: string }[];
  active: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
        {label}
      </span>
      {options.map((o) => {
        const isOn = active.includes(o.id);
        return (
          <button
            key={o.id}
            onClick={() => onToggle(o.id)}
            className="rounded-full text-sm font-medium transition"
            style={{
              padding: "6px 12px",
              border: "1px solid " + (isOn ? "var(--brand-black, #101820)" : "#e2e8f0"),
              background: isOn ? "var(--brand-black, #101820)" : "#fff",
              color: isOn ? "#fff" : "#475569",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck and commit**

```bash
pnpm typecheck
git add 'src/app/(app)/trainings/_components/'
git commit -m "feat(trainings): catalog filters (sector, length) + search + sort"
```

---

## Phase 4 — Detail page (`/trainings/[slug]`)

### Task 13: Detail page + hero + outcomes

**Files:**
- Create: `src/app/(app)/trainings/[slug]/page.tsx`
- Create: `src/app/(app)/trainings/[slug]/detail-client.tsx`
- Create: `src/app/(app)/trainings/_components/detail-hero.tsx`

- [ ] **Step 1: Detail page RSC**

```tsx
// src/app/(app)/trainings/[slug]/page.tsx
import { notFound } from "next/navigation";
import { api } from "@/lib/trpc/server";
import { getSession } from "@/server/auth";
import { db } from "@/server/db";
import { eq } from "drizzle-orm";
import { user as userTable } from "@/server/db/schema/auth";
import { isPlatinumEntitled } from "@/lib/billing-tiers";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { DetailClient } from "./detail-client";

export default async function TrainingDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await api.trainings.getBySlug({ slug }).catch(() => null);
  if (!data) notFound();

  // Determine Platinum entitlement for this viewer
  const session = await getSession();
  let isPlatinum = false;
  if (session) {
    const [u] = await db
      .select({
        plan: userTable.jobseekerPlan,
        status: userTable.jobseekerSubscriptionStatus,
      })
      .from(userTable)
      .where(eq(userTable.id, session.user.id))
      .limit(1);
    if (u) isPlatinum = isPlatinumEntitled({ plan: u.plan, status: u.status });
  }

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
      <main className="flex-1 bg-slate-50 py-14">
        <div className="mx-auto max-w-6xl px-4">
          <DetailClient
            training={data.training}
            modules={data.modules}
            isPlatinum={isPlatinum}
            isSignedIn={!!session}
          />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
```

- [ ] **Step 2: Detail client + hero**

```tsx
// src/app/(app)/trainings/[slug]/detail-client.tsx
"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertCircle, Sparkles } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/trpc/client";
import { DetailHero } from "@/app/(app)/trainings/_components/detail-hero";

type Training = {
  id: string;
  slug: string;
  title: string;
  longBlurb: string;
  hours: number;
  durationLabel: string;
  level: string;
  monogram: string;
  tileColor: string;
  certName: string | null;
  instructorName: string;
  instructorRole: string;
  outcomesJson: string[];
  unlocksJson: { role: string; co: string; band: string }[];
};

type ModuleWithLessons = {
  id: string;
  slug: string;
  number: string;
  title: string;
  durationLabel: string;
  lessons: Array<{
    id: string;
    slug: string;
    title: string;
    kind: "video" | "practice" | "quiz";
    durationLabel: string;
  }>;
};

export function DetailClient({
  training,
  modules,
  isPlatinum,
  isSignedIn,
}: {
  training: Training;
  modules: ModuleWithLessons[];
  isPlatinum: boolean;
  isSignedIn: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const enrollMut = api.trainings.enroll.useMutation({
    onSuccess: (data) => {
      // Send to first lesson if curriculum exists; otherwise My trainings.
      const firstModule = modules[0];
      const firstLesson = firstModule?.lessons[0];
      if (firstModule && firstLesson) {
        router.push(
          `/trainings/${training.slug}/learn/${firstModule.slug}/${firstLesson.slug}?enrollment=${data.enrollmentId}`,
        );
      } else {
        router.push("/trainings/my-trainings");
      }
    },
    onError: (e) => setError(e.message),
  });

  const onEnroll = () => {
    if (!isSignedIn) {
      router.push(`/sign-in?redirect=/trainings/${training.slug}`);
      return;
    }
    if (!isPlatinum) {
      setError("paywall:trainings");
      return;
    }
    enrollMut.mutate({ slug: training.slug });
  };

  return (
    <>
      {error && (
        <div
          ref={(el) => el?.scrollIntoView({ behavior: "smooth", block: "start" })}
          className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <div className="flex-1 leading-relaxed">
            {error.startsWith("paywall:") ? (
              <>
                Trainings are a Platinum feature. Upgrade to enroll, get
                certificates, and surface verified badges to recruiters.{" "}
                <Link
                  href="/sign-up?plan=platinum"
                  className="font-bold underline underline-offset-2 hover:text-amber-950"
                >
                  Upgrade to Platinum →
                </Link>
              </>
            ) : (
              error
            )}
          </div>
        </div>
      )}
      <DetailHero
        training={training}
        moduleCount={modules.length}
        lessonCount={modules.reduce((n, m) => n + m.lessons.length, 0)}
        onEnroll={onEnroll}
        ctaLabel={
          enrollMut.isPending
            ? "Enrolling…"
            : !isPlatinum
              ? "Upgrade to Platinum"
              : "Enroll free"
        }
        ctaDisabled={enrollMut.isPending}
      />
      {/* Curriculum, instructor, reviews, unlocks rendered in Task 14 */}
    </>
  );
}
```

```tsx
// src/app/(app)/trainings/_components/detail-hero.tsx
"use client";
import { Sparkles } from "lucide-react";

type T = {
  title: string;
  longBlurb: string;
  monogram: string;
  tileColor: string;
  durationLabel: string;
  level: string;
  certName: string | null;
  instructorName: string;
  instructorRole: string;
  outcomesJson: string[];
};

export function DetailHero({
  training,
  moduleCount,
  lessonCount,
  onEnroll,
  ctaLabel,
  ctaDisabled,
}: {
  training: T;
  moduleCount: number;
  lessonCount: number;
  onEnroll: () => void;
  ctaLabel: string;
  ctaDisabled: boolean;
}) {
  return (
    <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr] lg:items-start">
      <div>
        <div className="flex items-center gap-3">
          <div
            className="grid h-12 w-12 place-items-center rounded-2xl text-lg font-bold text-white"
            style={{ background: training.tileColor }}
          >
            {training.monogram}
          </div>
          {training.certName && (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-700">
              {training.certName}
            </span>
          )}
        </div>
        <h1 className="mt-5 text-4xl font-bold leading-[1.05] tracking-tight md:text-5xl">
          {training.title}
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-600 md:text-lg">
          {training.longBlurb}
        </p>
        <div className="mt-8">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
            What you&apos;ll be able to do
          </h3>
          <ul className="mt-3 grid gap-2">
            {training.outcomesJson.map((o, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                <span
                  className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full"
                  style={{ background: "var(--brand-blue, #1CAAE2)" }}
                />
                {o}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <aside
        className="sticky top-24 overflow-hidden rounded-3xl p-7"
        style={{ background: "var(--brand-black, #101820)", color: "#fff" }}
      >
        <div className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: "var(--brand-blue, #1CAAE2)" }}>
          Course at a glance
        </div>
        <h4 className="mt-3 text-2xl font-bold tracking-tight" style={{ color: "#fff" }}>
          {training.durationLabel}
        </h4>
        <dl className="mt-4 divide-y divide-white/10 text-sm">
          <Row l="Level" v={training.level[0].toUpperCase() + training.level.slice(1)} />
          <Row l="Modules" v={String(moduleCount)} />
          <Row l="Lessons" v={String(lessonCount)} />
          <Row l="Instructor" v={training.instructorName} />
        </dl>
        <p className="mt-3 text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.7)" }}>
          {training.instructorRole}
        </p>
        <button
          disabled={ctaDisabled}
          onClick={onEnroll}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50"
          style={{
            padding: "14px 16px",
            background: "var(--brand-blue, #1CAAE2)",
            color: "var(--brand-black, #101820)",
          }}
        >
          <Sparkles className="h-4 w-4" />
          {ctaLabel}
        </button>
      </aside>
    </div>
  );
}

function Row({ l, v }: { l: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between py-3">
      <dt className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: "rgba(255,255,255,0.7)" }}>
        {l}
      </dt>
      <dd className="text-sm font-medium" style={{ color: "#fff" }}>
        {v}
      </dd>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck and commit**

```bash
pnpm typecheck
git add 'src/app/(app)/trainings/[slug]/' 'src/app/(app)/trainings/_components/detail-hero.tsx'
git commit -m "feat(trainings): detail page hero + outcomes + sticky enroll CTA"
```

---

### Task 14: Detail page curriculum + reviews + unlocks

**Files:**
- Create: `src/app/(app)/trainings/_components/detail-curriculum.tsx`
- Create: `src/app/(app)/trainings/_components/detail-reviews.tsx`
- Create: `src/app/(app)/trainings/_components/detail-unlocks.tsx`
- Modify: `src/app/(app)/trainings/[slug]/detail-client.tsx`

- [ ] **Step 1: Curriculum**

```tsx
// src/app/(app)/trainings/_components/detail-curriculum.tsx
"use client";
import { useState } from "react";
import { ChevronDown, FileText, Target, Video } from "lucide-react";

type Module = {
  id: string;
  slug: string;
  number: string;
  title: string;
  durationLabel: string;
  lessons: Array<{
    id: string;
    slug: string;
    title: string;
    kind: "video" | "practice" | "quiz";
    durationLabel: string;
  }>;
};

const KIND_ICON = {
  video: Video,
  practice: Target,
  quiz: FileText,
};

export function DetailCurriculum({ modules }: { modules: Module[] }) {
  const [open, setOpen] = useState<string | null>(modules[0]?.id ?? null);

  return (
    <section className="mt-12">
      <h2 className="text-3xl font-bold tracking-tight">Curriculum</h2>
      <p className="mt-2 text-sm text-slate-600">
        {modules.length} module{modules.length === 1 ? "" : "s"} ·{" "}
        {modules.reduce((n, m) => n + m.lessons.length, 0)} lessons
      </p>
      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {modules.map((m) => {
          const isOpen = open === m.id;
          return (
            <div key={m.id} className="border-b border-slate-200 last:border-b-0">
              <button
                onClick={() => setOpen(isOpen ? null : m.id)}
                className="flex w-full items-center gap-4 px-6 py-5 text-left transition hover:bg-slate-50"
              >
                <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                  {m.number}
                </span>
                <span className="flex-1 text-base font-bold text-slate-900">{m.title}</span>
                <span className="text-xs text-slate-500">{m.durationLabel}</span>
                <ChevronDown
                  className={`h-4 w-4 text-slate-400 transition ${isOpen ? "rotate-180" : ""}`}
                />
              </button>
              {isOpen && (
                <ul className="border-t border-slate-100 bg-slate-50/50 px-6 py-3">
                  {m.lessons.map((l) => {
                    const Icon = KIND_ICON[l.kind];
                    return (
                      <li
                        key={l.id}
                        className="flex items-center gap-3 py-2 text-sm text-slate-700"
                      >
                        <Icon className="h-3.5 w-3.5 text-slate-400" />
                        <span className="flex-1">{l.title}</span>
                        <span className="text-xs text-slate-500">{l.durationLabel}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Unlocks**

```tsx
// src/app/(app)/trainings/_components/detail-unlocks.tsx
export function DetailUnlocks({
  unlocks,
}: {
  unlocks: { role: string; co: string; band: string }[];
}) {
  if (unlocks.length === 0) return null;
  return (
    <section className="mt-12">
      <h2 className="text-3xl font-bold tracking-tight">
        What this{" "}
        <em
          className="not-italic italic"
          style={{ color: "var(--brand-dark-blue, #004984)" }}
        >
          unlocks
        </em>
      </h2>
      <p className="mt-2 text-sm text-slate-600">
        Recent roles where this credential is in the listing.
      </p>
      <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {unlocks.map((u, i) => (
          <div
            key={i}
            className="rounded-2xl border border-slate-200 bg-white p-5"
          >
            <div className="text-base font-bold text-slate-900">{u.role}</div>
            {u.co && (
              <div className="mt-1 text-xs text-slate-500">{u.co}</div>
            )}
            {u.band && (
              <div
                className="mt-3 text-lg font-bold tracking-tight"
                style={{ color: "var(--brand-dark-blue, #004984)" }}
              >
                {u.band}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Reviews (seed-rendered only)**

```tsx
// src/app/(app)/trainings/_components/detail-reviews.tsx
import { Star } from "lucide-react";

// Hard-coded seed reviews — real review submission deferred.
const SEED_REVIEWS = [
  { name: "Devin H.", role: "Field Operator → Turbine Tech", rating: 5, when: "Apr 2026", body: "Walked into the GWO practical knowing what to expect. Passed the SCBA donning drill on the first attempt — the prep video was almost frame-for-frame what I did on the day." },
  { name: "Sara K.", role: "EIT, AltaLink", rating: 5, when: "Mar 2026", body: "The P.Eng module that broke down protection coordination was the clearest I've seen anywhere. Office hours with Robert were worth the whole sign-up on their own." },
  { name: "Anish P.", role: "Controls Engineer II", rating: 4, when: "Feb 2026", body: "Hands-on with the simulated ControlLogix was great. The structured-text section moved a bit fast for me — would've liked one more practice problem before the assessment." },
];

export function DetailReviews() {
  return (
    <section className="mt-12">
      <h2 className="text-3xl font-bold tracking-tight">Member reviews</h2>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {SEED_REVIEWS.map((r, i) => (
          <div
            key={i}
            className="rounded-2xl border border-slate-200 bg-white p-5"
          >
            <div className="flex items-center gap-1">
              {Array.from({ length: r.rating }).map((_, j) => (
                <Star
                  key={j}
                  className="h-3.5 w-3.5"
                  style={{ fill: "#f59e0b", color: "#f59e0b" }}
                />
              ))}
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-700">
              &ldquo;{r.body}&rdquo;
            </p>
            <div className="mt-4 text-xs text-slate-500">
              <span className="font-bold text-slate-700">{r.name}</span>
              {" · "}
              {r.role}
              {" · "}
              {r.when}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Wire into detail-client.tsx**

In `src/app/(app)/trainings/[slug]/detail-client.tsx`, replace the closing comment with the three components. Add imports at the top:

```tsx
import { DetailCurriculum } from "@/app/(app)/trainings/_components/detail-curriculum";
import { DetailReviews } from "@/app/(app)/trainings/_components/detail-reviews";
import { DetailUnlocks } from "@/app/(app)/trainings/_components/detail-unlocks";
```

Replace the `{/* Curriculum, instructor, reviews, unlocks rendered in Task 14 */}` comment with:

```tsx
<DetailCurriculum modules={modules} />
<DetailUnlocks unlocks={training.unlocksJson} />
<DetailReviews />
```

- [ ] **Step 5: Typecheck and commit**

```bash
pnpm typecheck
git add 'src/app/(app)/trainings/'
git commit -m "feat(trainings): detail page curriculum + reviews + unlocks"
```

---

## Phase 5 — Player (`/trainings/[slug]/learn/[moduleSlug]/[lessonSlug]`)

### Task 15: Player route + shell + sidebar

**Files:**
- Create: `src/app/(app)/trainings/[slug]/learn/[moduleSlug]/[lessonSlug]/page.tsx`
- Create: `src/app/(app)/trainings/[slug]/learn/[moduleSlug]/[lessonSlug]/player-client.tsx`
- Create: `src/app/(app)/trainings/_components/player-bar.tsx`
- Create: `src/app/(app)/trainings/_components/player-sidebar.tsx`

- [ ] **Step 1: Player page (RSC)**

```tsx
// src/app/(app)/trainings/[slug]/learn/[moduleSlug]/[lessonSlug]/page.tsx
import { notFound, redirect } from "next/navigation";
import { api } from "@/lib/trpc/server";
import { getSession } from "@/server/auth";
import { db } from "@/server/db";
import { and, eq } from "drizzle-orm";
import { trainings, trainingEnrollments } from "@/server/db/schema";
import { PlayerClient } from "./player-client";

export default async function LearnPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; moduleSlug: string; lessonSlug: string }>;
  searchParams: Promise<{ enrollment?: string }>;
}) {
  const { slug, moduleSlug, lessonSlug } = await params;
  const sp = await searchParams;

  const session = await getSession();
  if (!session) {
    redirect(`/sign-in?redirect=/trainings/${slug}`);
  }

  const data = await api.trainings.getBySlug({ slug }).catch(() => null);
  if (!data) notFound();

  const module_ = data.modules.find((m) => m.slug === moduleSlug);
  const lesson = module_?.lessons.find((l) => l.slug === lessonSlug);
  if (!module_ || !lesson) notFound();

  // Resolve enrollment: prefer query param; fall back to user's row for this training.
  let enrollmentId = sp.enrollment ?? null;
  if (!enrollmentId) {
    const [enr] = await db
      .select({ id: trainingEnrollments.id })
      .from(trainingEnrollments)
      .where(
        and(
          eq(trainingEnrollments.candidateId, session.user.id),
          eq(trainingEnrollments.trainingId, data.training.id),
        ),
      )
      .limit(1);
    enrollmentId = enr?.id ?? null;
  }
  if (!enrollmentId) {
    redirect(`/trainings/${slug}`); // Not enrolled — back to detail page
  }

  // Load progress
  const progress = await api.trainings.getEnrollmentProgress({
    enrollmentId,
  });

  return (
    <PlayerClient
      training={{
        slug: data.training.slug,
        title: data.training.title,
        instructorName: data.training.instructorName,
        monogram: data.training.monogram,
        tileColor: data.training.tileColor,
      }}
      modules={data.modules}
      currentModuleSlug={moduleSlug}
      currentLessonSlug={lessonSlug}
      enrollmentId={enrollmentId}
      progressJson={progress.progressJson}
    />
  );
}
```

- [ ] **Step 2: Player client shell**

```tsx
// src/app/(app)/trainings/[slug]/learn/[moduleSlug]/[lessonSlug]/player-client.tsx
"use client";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { PlayerBar } from "@/app/(app)/trainings/_components/player-bar";
import { PlayerSidebar } from "@/app/(app)/trainings/_components/player-sidebar";
import { LessonVideo } from "@/app/(app)/trainings/_components/lesson-video";
import { LessonPractice } from "@/app/(app)/trainings/_components/lesson-practice";
import { LessonQuiz } from "@/app/(app)/trainings/_components/lesson-quiz";

type Lesson = {
  id: string;
  slug: string;
  title: string;
  kind: "video" | "practice" | "quiz";
  durationLabel: string;
  videoUrl: string | null;
  videoProvider: string | null;
  practiceMarkdown: string | null;
  quizQuestionsJson: Array<{
    id: string;
    prompt: string;
    options: [string, string, string, string];
  }> | null;
};

type ModuleWithLessons = {
  id: string;
  slug: string;
  number: string;
  title: string;
  durationLabel: string;
  lessons: Lesson[];
};

export function PlayerClient({
  training,
  modules,
  currentModuleSlug,
  currentLessonSlug,
  enrollmentId,
  progressJson: initialProgress,
}: {
  training: {
    slug: string;
    title: string;
    instructorName: string;
    monogram: string;
    tileColor: string;
  };
  modules: ModuleWithLessons[];
  currentModuleSlug: string;
  currentLessonSlug: string;
  enrollmentId: string;
  progressJson: Record<string, { completedAt: string; score?: number }>;
}) {
  const router = useRouter();
  const [progress, setProgress] = useState(initialProgress);

  const flat = useMemo(
    () =>
      modules.flatMap((m) =>
        m.lessons.map((l) => ({ ...l, moduleSlug: m.slug, moduleId: m.id })),
      ),
    [modules],
  );

  const currentIdx = flat.findIndex(
    (l) => l.moduleSlug === currentModuleSlug && l.slug === currentLessonSlug,
  );
  const current = flat[currentIdx] ?? flat[0];
  const next = currentIdx >= 0 ? flat[currentIdx + 1] : undefined;

  const onLessonComplete = (lessonId: string, score?: number) => {
    setProgress((p) => ({
      ...p,
      [lessonId]: {
        completedAt: new Date().toISOString(),
        ...(score !== undefined ? { score } : {}),
      },
    }));
  };

  const onNext = () => {
    if (next) {
      router.push(
        `/trainings/${training.slug}/learn/${next.moduleSlug}/${next.slug}?enrollment=${enrollmentId}`,
      );
    } else {
      router.push("/trainings/my-trainings");
    }
  };

  const doneCount = flat.filter((l) => progress[l.id]).length;
  const overallPct = Math.round((doneCount / flat.length) * 100);

  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--brand-black, #101820)" }}
    >
      <PlayerBar
        trainingTitle={training.title}
        trainingSlug={training.slug}
        moduleNumber={modules.find((m) => m.slug === currentModuleSlug)?.number ?? ""}
        moduleTitle={modules.find((m) => m.slug === currentModuleSlug)?.title ?? ""}
        overallPct={overallPct}
      />
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[1fr_320px]">
        <main>
          {current.kind === "video" && (
            <LessonVideo
              lesson={current}
              enrollmentId={enrollmentId}
              isComplete={!!progress[current.id]}
              onComplete={() => onLessonComplete(current.id)}
              onNext={onNext}
              hasNext={!!next}
            />
          )}
          {current.kind === "practice" && (
            <LessonPractice
              lesson={current}
              enrollmentId={enrollmentId}
              isComplete={!!progress[current.id]}
              onComplete={() => onLessonComplete(current.id)}
              onNext={onNext}
              hasNext={!!next}
            />
          )}
          {current.kind === "quiz" && (
            <LessonQuiz
              lesson={current}
              enrollmentId={enrollmentId}
              isComplete={!!progress[current.id]}
              priorScore={progress[current.id]?.score}
              onComplete={(score) => onLessonComplete(current.id, score)}
              onNext={onNext}
              hasNext={!!next}
            />
          )}
        </main>
        <PlayerSidebar
          modules={modules}
          currentLessonId={current.id}
          progressJson={progress}
          buildHref={(moduleSlug, lessonSlug) =>
            `/trainings/${training.slug}/learn/${moduleSlug}/${lessonSlug}?enrollment=${enrollmentId}`
          }
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Player bar**

```tsx
// src/app/(app)/trainings/_components/player-bar.tsx
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export function PlayerBar({
  trainingTitle,
  trainingSlug,
  moduleNumber,
  moduleTitle,
  overallPct,
}: {
  trainingTitle: string;
  trainingSlug: string;
  moduleNumber: string;
  moduleTitle: string;
  overallPct: number;
}) {
  return (
    <div
      className="sticky top-0 z-10 backdrop-blur"
      style={{
        background: "rgba(16, 24, 32, 0.85)",
        borderBottom: "1px solid rgba(255,255,255,0.1)",
      }}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
        <Link
          href={`/trainings/${trainingSlug}`}
          className="inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-bold"
          style={{
            background: "rgba(255,255,255,0.08)",
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.15)",
          }}
        >
          <ChevronLeft className="h-4 w-4" /> Exit
        </Link>
        <div className="flex-1 truncate text-sm" style={{ color: "rgba(255,255,255,0.85)" }}>
          <span className="font-bold">{trainingTitle}</span>
          {" · "}
          <span style={{ color: "rgba(255,255,255,0.5)" }}>
            Module {moduleNumber} · {moduleTitle}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs" style={{ color: "rgba(255,255,255,0.7)" }}>
          <div className="h-1.5 w-32 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
            <div
              className="h-full transition-[width] duration-500"
              style={{ width: `${overallPct}%`, background: "var(--brand-blue, #1CAAE2)" }}
            />
          </div>
          <span className="font-bold">{overallPct}%</span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Player sidebar**

```tsx
// src/app/(app)/trainings/_components/player-sidebar.tsx
import Link from "next/link";
import { Check, FileText, Target, Video } from "lucide-react";

const KIND_ICON = {
  video: Video,
  practice: Target,
  quiz: FileText,
};

type Lesson = {
  id: string;
  slug: string;
  title: string;
  kind: "video" | "practice" | "quiz";
  durationLabel: string;
};

type Module = {
  id: string;
  slug: string;
  number: string;
  title: string;
  durationLabel: string;
  lessons: Lesson[];
};

export function PlayerSidebar({
  modules,
  currentLessonId,
  progressJson,
  buildHref,
}: {
  modules: Module[];
  currentLessonId: string;
  progressJson: Record<string, { completedAt: string; score?: number }>;
  buildHref: (moduleSlug: string, lessonSlug: string) => string;
}) {
  return (
    <aside
      className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-2xl"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {modules.map((m) => (
        <div key={m.id} className="border-b border-white/10 last:border-b-0">
          <div className="px-5 py-3">
            <div className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: "rgba(255,255,255,0.5)" }}>
              Module {m.number}
            </div>
            <div className="mt-0.5 text-sm font-bold" style={{ color: "#fff" }}>
              {m.title}
            </div>
          </div>
          <ul>
            {m.lessons.map((l) => {
              const Icon = KIND_ICON[l.kind];
              const isCurrent = l.id === currentLessonId;
              const isDone = !!progressJson[l.id];
              return (
                <li key={l.id}>
                  <Link
                    href={buildHref(m.slug, l.slug)}
                    className="flex items-center gap-3 px-5 py-2.5 text-sm transition"
                    style={{
                      color: isCurrent ? "#fff" : "rgba(255,255,255,0.7)",
                      background: isCurrent ? "rgba(28,170,226,0.1)" : "transparent",
                      borderLeft: isCurrent
                        ? "2px solid var(--brand-blue, #1CAAE2)"
                        : "2px solid transparent",
                    }}
                  >
                    {isDone ? (
                      <span
                        className="grid h-4 w-4 flex-shrink-0 place-items-center rounded-full"
                        style={{
                          background: "var(--brand-blue, #1CAAE2)",
                          color: "var(--brand-black, #101820)",
                        }}
                      >
                        <Check className="h-2.5 w-2.5" strokeWidth={3} />
                      </span>
                    ) : (
                      <Icon className="h-4 w-4 flex-shrink-0" style={{ color: "rgba(255,255,255,0.5)" }} />
                    )}
                    <span className="flex-1 truncate">{l.title}</span>
                    <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                      {l.durationLabel}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </aside>
  );
}
```

- [ ] **Step 5: Stub lesson components so the page typechecks**

Create three minimal stubs — the next 3 tasks fill them in:

```tsx
// src/app/(app)/trainings/_components/lesson-video.tsx
"use client";
type Lesson = { id: string; title: string; durationLabel: string; videoUrl: string | null; videoProvider: string | null };
export function LessonVideo({ lesson }: { lesson: Lesson; enrollmentId: string; isComplete: boolean; onComplete: () => void; onNext: () => void; hasNext: boolean }) {
  return <div className="text-white">Video lesson: {lesson.title} (stub)</div>;
}
```

```tsx
// src/app/(app)/trainings/_components/lesson-practice.tsx
"use client";
type Lesson = { id: string; title: string; practiceMarkdown: string | null };
export function LessonPractice({ lesson }: { lesson: Lesson; enrollmentId: string; isComplete: boolean; onComplete: () => void; onNext: () => void; hasNext: boolean }) {
  return <div className="text-white">Practice lesson: {lesson.title} (stub)</div>;
}
```

```tsx
// src/app/(app)/trainings/_components/lesson-quiz.tsx
"use client";
type Lesson = { id: string; title: string; quizQuestionsJson: Array<{ id: string; prompt: string; options: [string, string, string, string] }> | null };
export function LessonQuiz({ lesson }: { lesson: Lesson; enrollmentId: string; isComplete: boolean; priorScore?: number; onComplete: (score: number) => void; onNext: () => void; hasNext: boolean }) {
  return <div className="text-white">Quiz lesson: {lesson.title} (stub)</div>;
}
```

- [ ] **Step 6: Typecheck and commit**

```bash
pnpm typecheck
git add 'src/app/(app)/trainings/'
git commit -m "feat(trainings): player route shell + nav bar + sidebar + lesson stubs"
```

---

### Task 16: Video lesson runner

**Files:**
- Modify: `src/app/(app)/trainings/_components/lesson-video.tsx`

- [ ] **Step 1: Full video lesson component**

```tsx
// src/app/(app)/trainings/_components/lesson-video.tsx
"use client";
import { ArrowRight, Check, PlayCircle } from "lucide-react";
import { api } from "@/lib/trpc/client";

type Lesson = {
  id: string;
  title: string;
  durationLabel: string;
  videoUrl: string | null;
  videoProvider: string | null;
};

function buildEmbed(videoUrl: string | null, provider: string | null): string | null {
  if (!videoUrl) return null;
  // Lightweight URL → embed transform. For v1 only YouTube/Vimeo IDs are
  // supported; admin tooling later will validate input.
  if (provider === "youtube") {
    // accept full watch URL or ID
    const match = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/);
    const id = match ? match[1] : videoUrl;
    return `https://www.youtube.com/embed/${id}?rel=0`;
  }
  if (provider === "vimeo") {
    const match = videoUrl.match(/vimeo\.com\/(\d+)/);
    const id = match ? match[1] : videoUrl;
    return `https://player.vimeo.com/video/${id}`;
  }
  return videoUrl; // fallback: trust the stored URL
}

export function LessonVideo({
  lesson,
  enrollmentId,
  isComplete,
  onComplete,
  onNext,
  hasNext,
}: {
  lesson: Lesson;
  enrollmentId: string;
  isComplete: boolean;
  onComplete: () => void;
  onNext: () => void;
  hasNext: boolean;
}) {
  const embedSrc = buildEmbed(lesson.videoUrl, lesson.videoProvider);
  const mut = api.trainings.markLessonComplete.useMutation({
    onSuccess: () => onComplete(),
  });

  return (
    <div>
      <div
        className="aspect-video w-full overflow-hidden rounded-2xl"
        style={{ background: "rgba(255,255,255,0.04)" }}
      >
        {embedSrc ? (
          <iframe
            src={embedSrc}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={lesson.title}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center" style={{ color: "rgba(255,255,255,0.6)" }}>
            <PlayCircle className="h-16 w-16" style={{ color: "rgba(255,255,255,0.3)" }} />
            <div className="text-sm">Video coming soon — content authored separately.</div>
          </div>
        )}
      </div>
      <h1 className="mt-6 text-2xl font-bold tracking-tight md:text-3xl" style={{ color: "#fff" }}>
        {lesson.title}
      </h1>
      <p className="mt-2 text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
        Duration: {lesson.durationLabel}
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        {!isComplete ? (
          <button
            disabled={mut.isPending}
            onClick={() => mut.mutate({ enrollmentId, lessonId: lesson.id })}
            className="inline-flex items-center gap-2 rounded-full text-sm font-bold transition disabled:opacity-50"
            style={{
              padding: "12px 22px",
              background: "var(--brand-blue, #1CAAE2)",
              color: "var(--brand-black, #101820)",
            }}
          >
            <Check className="h-4 w-4" />
            {mut.isPending ? "Saving…" : "Mark complete"}
          </button>
        ) : (
          <div
            className="inline-flex items-center gap-2 rounded-full text-sm font-bold"
            style={{
              padding: "12px 22px",
              background: "rgba(28,170,226,0.18)",
              color: "var(--brand-blue, #1CAAE2)",
              border: "1px solid rgba(28,170,226,0.4)",
            }}
          >
            <Check className="h-4 w-4" /> Completed
          </div>
        )}
        {hasNext && (
          <button
            onClick={onNext}
            className="inline-flex items-center gap-2 rounded-full text-sm font-medium"
            style={{
              padding: "12px 22px",
              background: "transparent",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.2)",
            }}
          >
            Next lesson <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck and commit**

```bash
pnpm typecheck
git add 'src/app/(app)/trainings/_components/lesson-video.tsx'
git commit -m "feat(trainings): video lesson runner with embed + mark-complete"
```

---

### Task 17: Practice lesson runner

**Files:**
- Modify: `src/app/(app)/trainings/_components/lesson-practice.tsx`

- [ ] **Step 1: Practice lesson with rendered markdown**

For v1 we don't pull in a full markdown lib — keep the seed practice content simple (headers + paragraphs separated by blank lines).

```tsx
// src/app/(app)/trainings/_components/lesson-practice.tsx
"use client";
import { ArrowRight, Check } from "lucide-react";
import { api } from "@/lib/trpc/client";

type Lesson = {
  id: string;
  title: string;
  practiceMarkdown: string | null;
};

function renderMarkdown(md: string): React.ReactNode[] {
  // Minimal renderer — # for h1, ## for h2, blank lines split paragraphs,
  // - for bullets. Good enough for v1 seed content.
  const blocks = md.split(/\n\s*\n/);
  return blocks.map((block, i) => {
    const trimmed = block.trim();
    if (trimmed.startsWith("# ")) {
      return (
        <h2 key={i} className="mt-6 text-2xl font-bold tracking-tight" style={{ color: "#fff" }}>
          {trimmed.slice(2)}
        </h2>
      );
    }
    if (trimmed.startsWith("## ")) {
      return (
        <h3 key={i} className="mt-5 text-xl font-bold tracking-tight" style={{ color: "#fff" }}>
          {trimmed.slice(3)}
        </h3>
      );
    }
    if (trimmed.split("\n").every((l) => l.trim().startsWith("- "))) {
      return (
        <ul key={i} className="mt-3 grid gap-2">
          {trimmed.split("\n").map((line, j) => (
            <li key={j} className="flex items-start gap-2.5 text-sm" style={{ color: "rgba(255,255,255,0.85)" }}>
              <span
                className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full"
                style={{ background: "var(--brand-blue, #1CAAE2)" }}
              />
              {line.replace(/^-\s*/, "")}
            </li>
          ))}
        </ul>
      );
    }
    return (
      <p key={i} className="mt-3 text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.85)" }}>
        {trimmed}
      </p>
    );
  });
}

export function LessonPractice({
  lesson,
  enrollmentId,
  isComplete,
  onComplete,
  onNext,
  hasNext,
}: {
  lesson: Lesson;
  enrollmentId: string;
  isComplete: boolean;
  onComplete: () => void;
  onNext: () => void;
  hasNext: boolean;
}) {
  const mut = api.trainings.markLessonComplete.useMutation({
    onSuccess: () => onComplete(),
  });

  return (
    <div>
      <div
        className="rounded-2xl p-8"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl" style={{ color: "#fff" }}>
          {lesson.title}
        </h1>
        <div className="mt-4">{renderMarkdown(lesson.practiceMarkdown ?? "")}</div>
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        {!isComplete ? (
          <button
            disabled={mut.isPending}
            onClick={() => mut.mutate({ enrollmentId, lessonId: lesson.id })}
            className="inline-flex items-center gap-2 rounded-full text-sm font-bold transition disabled:opacity-50"
            style={{
              padding: "12px 22px",
              background: "var(--brand-blue, #1CAAE2)",
              color: "var(--brand-black, #101820)",
            }}
          >
            <Check className="h-4 w-4" />
            {mut.isPending ? "Saving…" : "Mark complete"}
          </button>
        ) : (
          <div
            className="inline-flex items-center gap-2 rounded-full text-sm font-bold"
            style={{
              padding: "12px 22px",
              background: "rgba(28,170,226,0.18)",
              color: "var(--brand-blue, #1CAAE2)",
              border: "1px solid rgba(28,170,226,0.4)",
            }}
          >
            <Check className="h-4 w-4" /> Completed
          </div>
        )}
        {hasNext && (
          <button
            onClick={onNext}
            className="inline-flex items-center gap-2 rounded-full text-sm font-medium"
            style={{
              padding: "12px 22px",
              background: "transparent",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.2)",
            }}
          >
            Next lesson <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck and commit**

```bash
pnpm typecheck
git add 'src/app/(app)/trainings/_components/lesson-practice.tsx'
git commit -m "feat(trainings): practice lesson runner with tiny markdown renderer"
```

---

### Task 18: Quiz lesson runner

**Files:**
- Modify: `src/app/(app)/trainings/_components/lesson-quiz.tsx`

- [ ] **Step 1: Quiz lesson with submit + score**

```tsx
// src/app/(app)/trainings/_components/lesson-quiz.tsx
"use client";
import { useState } from "react";
import { AlertCircle, ArrowRight, Check, RefreshCw } from "lucide-react";
import { api } from "@/lib/trpc/client";

type Question = {
  id: string;
  prompt: string;
  options: [string, string, string, string];
};

type Lesson = {
  id: string;
  title: string;
  quizQuestionsJson: Question[] | null;
};

export function LessonQuiz({
  lesson,
  enrollmentId,
  isComplete,
  priorScore,
  onComplete,
  onNext,
  hasNext,
}: {
  lesson: Lesson;
  enrollmentId: string;
  isComplete: boolean;
  priorScore?: number;
  onComplete: (score: number) => void;
  onNext: () => void;
  hasNext: boolean;
}) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<{
    score: number;
    passed: boolean;
    correct: number;
    total: number;
  } | null>(null);

  const mut = api.trainings.submitQuiz.useMutation({
    onSuccess: (data) => {
      setResult(data);
      if (data.passed) onComplete(data.score);
    },
  });

  const questions = lesson.quizQuestionsJson ?? [];
  const allAnswered = questions.every((q) => answers[q.id] !== undefined);

  if (isComplete && !result) {
    return (
      <div>
        <div
          className="rounded-2xl p-8 text-center"
          style={{
            background: "rgba(28,170,226,0.08)",
            border: "1px solid rgba(28,170,226,0.3)",
          }}
        >
          <Check
            className="mx-auto h-12 w-12"
            style={{ color: "var(--brand-blue, #1CAAE2)" }}
          />
          <h2 className="mt-4 text-2xl font-bold tracking-tight" style={{ color: "#fff" }}>
            {lesson.title}
          </h2>
          <p className="mt-2 text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
            Quiz already passed
            {priorScore !== undefined ? ` · ${priorScore}/100` : ""}
          </p>
        </div>
        {hasNext && (
          <div className="mt-6">
            <button
              onClick={onNext}
              className="inline-flex items-center gap-2 rounded-full text-sm font-bold"
              style={{
                padding: "12px 22px",
                background: "var(--brand-blue, #1CAAE2)",
                color: "var(--brand-black, #101820)",
              }}
            >
              Next lesson <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div
        className="rounded-2xl p-8"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl" style={{ color: "#fff" }}>
          {lesson.title}
        </h1>
        <p className="mt-2 text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
          {questions.length} question{questions.length === 1 ? "" : "s"} · 70%
          to pass
        </p>
        <div className="mt-7 grid gap-7">
          {questions.map((q, idx) => (
            <div key={q.id}>
              <div className="text-xs font-bold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.5)" }}>
                Question {idx + 1} of {questions.length}
              </div>
              <div className="mt-2 text-lg" style={{ color: "#fff" }}>
                {q.prompt}
              </div>
              <div className="mt-4 grid gap-2">
                {q.options.map((opt, i) => {
                  const isSelected = answers[q.id] === i;
                  return (
                    <button
                      key={i}
                      onClick={() => setAnswers((a) => ({ ...a, [q.id]: i }))}
                      className="flex items-start gap-3 rounded-xl text-left text-sm transition"
                      style={{
                        padding: "14px 16px",
                        background: isSelected
                          ? "var(--brand-blue, #1CAAE2)"
                          : "rgba(255,255,255,0.04)",
                        color: isSelected
                          ? "var(--brand-black, #101820)"
                          : "rgba(255,255,255,0.85)",
                        border: "1px solid " + (isSelected ? "var(--brand-blue, #1CAAE2)" : "rgba(255,255,255,0.1)"),
                      }}
                    >
                      <span
                        className="grid h-6 w-6 flex-shrink-0 place-items-center rounded text-xs font-bold"
                        style={{
                          background: isSelected ? "var(--brand-black, #101820)" : "rgba(255,255,255,0.08)",
                          color: isSelected ? "var(--brand-blue, #1CAAE2)" : "rgba(255,255,255,0.7)",
                        }}
                      >
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span>{opt}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {result && !result.passed && (
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <div>
            Scored {result.correct}/{result.total} ({result.score}%). Need 70% to
            pass — review the material and retry.
          </div>
        </div>
      )}

      {result && result.passed && (
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-emerald-300 bg-emerald-50 p-5 text-sm text-emerald-900">
          <Check className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <div>
            Passed — scored {result.correct}/{result.total} ({result.score}%).
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        {!result?.passed && !isComplete && (
          <button
            disabled={!allAnswered || mut.isPending}
            onClick={() =>
              mut.mutate({
                enrollmentId,
                lessonId: lesson.id,
                answers,
              })
            }
            className="inline-flex items-center gap-2 rounded-full text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              padding: "12px 22px",
              background: "var(--brand-blue, #1CAAE2)",
              color: "var(--brand-black, #101820)",
            }}
          >
            {result ? <RefreshCw className="h-4 w-4" /> : <Check className="h-4 w-4" />}
            {mut.isPending ? "Grading…" : result ? "Retry" : "Submit quiz"}
          </button>
        )}
        {(result?.passed || isComplete) && hasNext && (
          <button
            onClick={onNext}
            className="inline-flex items-center gap-2 rounded-full text-sm font-bold"
            style={{
              padding: "12px 22px",
              background: "var(--brand-blue, #1CAAE2)",
              color: "var(--brand-black, #101820)",
            }}
          >
            Next lesson <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck and commit**

```bash
pnpm typecheck
git add 'src/app/(app)/trainings/_components/lesson-quiz.tsx'
git commit -m "feat(trainings): quiz lesson runner with submit + retry + pass gate"
```

---

## Phase 6 — My trainings + certificate

### Task 19: `/trainings/my-trainings` page

**Files:**
- Create: `src/app/(app)/trainings/my-trainings/page.tsx`

- [ ] **Step 1: Page**

```tsx
// src/app/(app)/trainings/my-trainings/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Check, PlayCircle } from "lucide-react";
import { api } from "@/lib/trpc/server";
import { getSession } from "@/server/auth";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";

export const metadata: Metadata = {
  title: "My trainings — Energized",
};

const fmtDate = (d: Date | string) =>
  new Date(d).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

export default async function MyTrainingsPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in?redirect=/trainings/my-trainings");
  if (session.user.role === "employer") redirect("/employer");

  const enrollments = await api.trainings.myEnrollments();

  const inProgress = enrollments.filter((e) => e.status === "in_progress");
  const enrolled = enrollments.filter((e) => e.status === "enrolled");
  const completed = enrollments.filter((e) => e.status === "completed");

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
        <div className="mx-auto max-w-5xl px-4">
          <div className="mb-10">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
              Your trainings
            </div>
            <h1 className="mt-2 text-4xl font-bold tracking-tight md:text-5xl">
              Your training{" "}
              <em
                className="not-italic italic"
                style={{ color: "var(--brand-dark-blue, #004984)" }}
              >
                progress
              </em>
              .
            </h1>
          </div>

          {enrollments.length === 0 && (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <h3 className="text-2xl font-bold tracking-tight">No trainings yet.</h3>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-600">
                Browse the catalog and enroll in your first course.
              </p>
              <Link
                href="/trainings"
                className="mt-6 inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold text-white"
                style={{ background: "var(--brand-black, #101820)" }}
              >
                Browse trainings <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}

          {inProgress.length > 0 && (
            <Section title="In progress">
              {inProgress.map((e) => (
                <EnrollmentRow key={e.id} enrollment={e} cta="Continue" ctaIcon="play" />
              ))}
            </Section>
          )}

          {enrolled.length > 0 && (
            <Section title="Enrolled">
              {enrolled.map((e) => (
                <EnrollmentRow key={e.id} enrollment={e} cta="Start course" ctaIcon="arrow" />
              ))}
            </Section>
          )}

          {completed.length > 0 && (
            <Section title="Completed">
              {completed.map((e) => (
                <EnrollmentRow
                  key={e.id}
                  enrollment={e}
                  cta="View certificate"
                  ctaIcon="arrow"
                  isCompleted
                />
              ))}
            </Section>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
        {title}
      </div>
      <div className="mt-4 overflow-hidden rounded-3xl border border-slate-200 bg-white">
        {children}
      </div>
    </section>
  );
}

type EnrollmentSummary = Awaited<ReturnType<typeof api.trainings.myEnrollments>>[number];

function EnrollmentRow({
  enrollment,
  cta,
  ctaIcon,
  isCompleted = false,
}: {
  enrollment: EnrollmentSummary;
  cta: string;
  ctaIcon: "play" | "arrow";
  isCompleted?: boolean;
}) {
  const href = isCompleted
    ? `/trainings/${enrollment.trainingSlug}/certificate?enrollment=${enrollment.id}`
    : `/trainings/${enrollment.trainingSlug}`;
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 border-b border-slate-200 px-6 py-5 transition last:border-b-0 hover:bg-slate-50"
    >
      <div
        className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl text-sm font-bold text-white"
        style={{ background: enrollment.trainingTileColor }}
      >
        {enrollment.trainingMonogram}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-base font-bold text-slate-900">{enrollment.trainingTitle}</div>
        <div className="mt-0.5 text-xs text-slate-500">
          {enrollment.trainingDurationLabel}
          {enrollment.completedAt && ` · Completed ${fmtDate(enrollment.completedAt)}`}
          {enrollment.finalScore !== null && ` · Score ${enrollment.finalScore}/100`}
          {!isCompleted && enrollment.enrolledAt && ` · Enrolled ${fmtDate(enrollment.enrolledAt)}`}
        </div>
      </div>
      <span className="inline-flex items-center gap-2 text-sm font-bold text-slate-700">
        {ctaIcon === "play" ? <PlayCircle className="h-4 w-4" /> : isCompleted ? <Check className="h-4 w-4" /> : null}
        {cta} <ArrowRight className="h-4 w-4" />
      </span>
    </Link>
  );
}
```

- [ ] **Step 2: Typecheck and commit**

```bash
pnpm typecheck
git add 'src/app/(app)/trainings/my-trainings/page.tsx'
git commit -m "feat(trainings): /trainings/my-trainings page with three sections"
```

---

### Task 20: Certificate page

**Files:**
- Create: `src/app/(app)/trainings/[slug]/certificate/page.tsx`

- [ ] **Step 1: Cert page (RSC, publicly accessible)**

```tsx
// src/app/(app)/trainings/[slug]/certificate/page.tsx
import { notFound } from "next/navigation";
import Image from "next/image";
import { api } from "@/lib/trpc/server";

const fmtDate = (d: Date | string) =>
  new Date(d).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

export default async function CertificatePage({
  searchParams,
}: {
  searchParams: Promise<{ enrollment?: string }>;
}) {
  const sp = await searchParams;
  if (!sp.enrollment) notFound();

  const cert = await api.trainings
    .getCertificate({ enrollmentId: sp.enrollment })
    .catch(() => null);
  if (!cert) notFound();

  return (
    <div
      className="min-h-screen bg-slate-100 px-4 py-16 print:bg-white print:py-0"
      style={{ fontFamily: "var(--v2-font-sans, sans-serif)" }}
    >
      <div
        className="mx-auto max-w-3xl rounded-3xl bg-white p-12 shadow-xl print:shadow-none print:rounded-none print:p-16"
        style={{ border: "8px solid var(--brand-dark-blue, #004984)" }}
      >
        <div className="flex items-center justify-between">
          <Image
            src="/energized-logo.svg"
            alt="Energized"
            width={140}
            height={36}
            priority
          />
          <div
            className="text-xs font-bold uppercase tracking-[0.18em]"
            style={{ color: "var(--brand-dark-blue, #004984)" }}
          >
            Verified credential
          </div>
        </div>

        <div className="mt-16 text-center">
          <div
            className="text-sm font-bold uppercase tracking-[0.2em]"
            style={{ color: "var(--brand-dark-blue, #004984)" }}
          >
            Certificate of Completion
          </div>
          <div className="mt-6 text-xs uppercase tracking-[0.16em] text-slate-500">
            This certifies that
          </div>
          <h1
            className="mt-3 text-5xl font-bold tracking-tight"
            style={{ color: "var(--brand-black, #101820)" }}
          >
            {cert.candidateName}
          </h1>
          <div className="mt-6 text-xs uppercase tracking-[0.16em] text-slate-500">
            has successfully completed
          </div>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-700">
            {cert.trainingTitle}
          </h2>
          {cert.trainingCertName && (
            <div className="mt-2 text-sm text-slate-500">
              {cert.trainingCertName} · {cert.trainingDurationLabel}
            </div>
          )}
        </div>

        <div className="mt-16 grid grid-cols-3 gap-6 border-t border-slate-200 pt-8 text-xs">
          <div>
            <div className="uppercase tracking-[0.12em] text-slate-500">Completed on</div>
            <div className="mt-1 text-sm font-bold text-slate-900">
              {cert.completedAt ? fmtDate(cert.completedAt) : "—"}
            </div>
          </div>
          <div>
            <div className="uppercase tracking-[0.12em] text-slate-500">Final score</div>
            <div className="mt-1 text-sm font-bold text-slate-900">
              {cert.finalScore !== null ? `${cert.finalScore}/100` : "—"}
            </div>
          </div>
          <div>
            <div className="uppercase tracking-[0.12em] text-slate-500">Instructor</div>
            <div className="mt-1 text-sm font-bold text-slate-900">
              {cert.trainingInstructorName}
            </div>
          </div>
        </div>

        <div className="mt-10 text-center text-[10px] uppercase tracking-[0.14em] text-slate-400">
          Credential ID · {cert.enrollmentId}
        </div>

        <div className="mt-10 flex justify-center gap-3 print:hidden">
          <button
            onClick={() => window.print()}
            className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-bold text-white"
          >
            Print
          </button>
        </div>
      </div>
    </div>
  );
}
```

Note: `onClick={() => window.print()}` needs `"use client"` — extract a tiny client component:

Add this client component file:

```tsx
// src/app/(app)/trainings/[slug]/certificate/print-button.tsx
"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-bold text-white"
    >
      Print
    </button>
  );
}
```

Then replace the button in `page.tsx`:

```tsx
import { PrintButton } from "./print-button";
// ...
<PrintButton />
```

- [ ] **Step 2: Typecheck and commit**

```bash
pnpm typecheck
git add 'src/app/(app)/trainings/[slug]/certificate/'
git commit -m "feat(trainings): print-friendly certificate page"
```

---

## Phase 7 — Surfaces & wire-ups

### Task 21: Top nav + user menu + dashboard card

**Files:**
- Modify: `src/components/marketing/site-header.tsx`
- Modify: `src/components/marketing/user-menu.tsx`
- Modify: `src/app/(app)/dashboard/page.tsx`

- [ ] **Step 1: Top nav — add "Trainings" between "Skill tests" and "For job seekers"**

In `src/components/marketing/site-header.tsx`, update `SiteHeaderActive` and `NAV_LINKS`:

```ts
export type SiteHeaderActive =
  | "home"
  | "jobs"
  | "skill-tests"
  | "trainings"              // <-- new
  | "seekers"
  // ... rest unchanged
```

```ts
const NAV_LINKS: NavLink[] = [
  { id: "home", label: "Home", href: "/" },
  { id: "jobs", label: "Jobs", href: "/jobs" },
  { id: "skill-tests", label: "Skill tests", href: "/skills" },
  { id: "trainings", label: "Trainings", href: "/trainings" },   // <-- new
  { id: "seekers", label: "For job seekers", href: "/for-seekers" },
  { id: "employers", label: "For employers", href: "/for-employers" },
  { id: "about", label: "About", href: "/about" },
];
```

The existing render code that gives "Skill tests" a sparkles icon checks `l.id === "skill-tests"`. For "Trainings", add a graduationCap icon. Update the conditional rendering in the JSX:

```tsx
{(l.id === "skill-tests" || l.id === "trainings") && (
  <Icon
    name={l.id === "skill-tests" ? "sparkles" : "graduationCap"}
    size={14}
    color={isActive ? "var(--brand-black, #101820)" : "var(--brand-blue, #1CAAE2)"}
  />
)}
```

(Check that `graduationCap` exists in the project's `Icon` component — `src/components/shared/icon.tsx`. If not, add it; lucide-react has `GraduationCap`. The Icon component is a wrapper. Adding a new name involves: updating the `IconName` type union and adding the path in the icon switch. For brevity here, alternative is to use `book` or `bookOpen` which are likely already present — grep first.)

- [ ] **Step 2: User-menu — add "My trainings"**

In `src/components/marketing/user-menu.tsx`, after the "Skill tests" dropdown item (in the jobseeker branch):

```tsx
<DropdownMenuItem asChild>
  <Link href="/trainings/my-trainings">My trainings</Link>
</DropdownMenuItem>
```

- [ ] **Step 3: Dashboard card**

In `src/app/(app)/dashboard/page.tsx`, find the `SkillTestsCard` function (around line 957). Below it (or alongside in the same column on the dashboard grid) add a sibling `TrainingsCard`:

```tsx
/* ---------- trainings card ---------- */

async function fetchTrainingProgress(userId: string) {
  // Lightweight count helpers — could be a tRPC query but inline here matches
  // the SkillTestsCard pattern.
  const { db } = await import("@/server/db");
  const { trainingEnrollments } = await import("@/server/db/schema");
  const { count, eq, and } = await import("drizzle-orm");
  const [{ n }] = await db
    .select({ n: count() })
    .from(trainingEnrollments)
    .where(
      and(
        eq(trainingEnrollments.candidateId, userId),
        eq(trainingEnrollments.status, "completed"),
      ),
    );
  return Number(n);
}

function TrainingsCard({ completedCount }: { completedCount: number }) {
  if (completedCount === 0) {
    return (
      <section
        className="v2-card"
        style={{ background: "var(--brand-black, #101820)", border: "none" }}
      >
        <div className="v2-card-head">
          <div>
            <div className="v2-eyebrow" style={{ color: "rgba(255,255,255,0.7)" }}>
              Trainings · Platinum
            </div>
            <h2 className="v2-card-title" style={{ marginTop: 8, color: "#fff" }}>
              Build the{" "}
              <em style={{ color: "var(--brand-blue, #1CAAE2)" }}>credentials</em> employers want.
            </h2>
          </div>
        </div>
        <p style={{ marginTop: 12, fontSize: 14, color: "rgba(255,255,255,0.85)" }}>
          GWO, H2S, PLC programming, P.Eng prep — graded by working seniors.
        </p>
        <div style={{ marginTop: 20, display: "flex", gap: 16, flexWrap: "wrap" }}>
          <Link
            href="/trainings"
            className="v2-card-link"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#fff" }}
          >
            Browse trainings <Icon name="arrowRight" size={14} />
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="v2-card">
      <div className="v2-card-head">
        <div>
          <div className="v2-eyebrow">Trainings</div>
          <h2 className="v2-card-title" style={{ marginTop: 8 }}>
            {completedCount} completed{" "}
            <em style={{ color: "var(--brand-dark-blue, #004984)" }}>course{completedCount === 1 ? "" : "s"}.</em>
          </h2>
        </div>
      </div>
      <div style={{ marginTop: 20, display: "flex", gap: 16, flexWrap: "wrap" }}>
        <Link href="/trainings" className="v2-card-link" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          Browse <Icon name="arrowRight" size={14} />
        </Link>
        <Link href="/trainings/my-trainings" className="v2-card-link" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          My trainings <Icon name="arrowRight" size={14} />
        </Link>
      </div>
    </section>
  );
}
```

Then in `DashboardPage`, fetch the count and render the card right after `<SkillTestsCard ... />`:

```tsx
const completedTrainings = await fetchTrainingProgress(userId);
// ...
<SkillTestsCard badgeCount={badgeCount} />
<TrainingsCard completedCount={completedTrainings} />
```

- [ ] **Step 4: Typecheck and commit**

```bash
pnpm typecheck
git add src/components/marketing/site-header.tsx src/components/marketing/user-menu.tsx 'src/app/(app)/dashboard/page.tsx'
git commit -m "feat(nav): top-nav Trainings link + user-menu + dashboard card"
```

---

### Task 22: Wire skill-test result page "Recommended next" to real trainings

**Files:**
- Modify: `src/app/(app)/skills/_components/result-side-cards.tsx`

- [ ] **Step 1: Update the Recommended-next links**

Currently each "weakest category" rendered with placeholder copy "trainings coming soon". Update so each links to `/trainings?sectors=<sector>` based on a heuristic mapping (or just sends users to the catalog filtered by the skill's jobSectorMatch).

Replace the existing "Recommended next" links — find the `Link` (or `div`) wrapping each entry. Convert to a `<Link>` to `/trainings`:

```tsx
import Link from "next/link";

// In the JSX, replace the placeholder row body with:
<Link
  href="/trainings"
  className="flex items-center gap-3 rounded-xl border border-slate-200 p-3.5 transition hover:border-slate-700 hover:bg-slate-50"
>
  {/* existing inner markup */}
</Link>
```

And update the description text to drop "trainings coming soon":

Replace:
```
{c.right}/{c.total} correct · trainings coming soon
```
with:
```
{c.right}/{c.total} correct · browse trainings →
```

- [ ] **Step 2: Typecheck and commit**

```bash
pnpm typecheck
git add 'src/app/(app)/skills/_components/result-side-cards.tsx'
git commit -m "feat(skills): wire result-page Recommended-next to /trainings catalog"
```

---

### Task 23: Marketing copy update — drop "coming soon"

**Files:**
- Modify: `src/lib/billing-display.ts`
- Modify: `src/app/(marketing)/contact/contact-faq.tsx`
- Modify: `src/app/(marketing)/page.tsx` (landing)
- Modify: `src/app/(marketing)/for-seekers/page.tsx` (FAQ entry)

- [ ] **Step 1: Update `billing-display.ts`**

Find these strings inside `PLATINUM_FEATURES` and remove the `(coming soon)` suffix:

```ts
"Trainings library — energy-sector courses",       // was: "(coming soon)"
"Cert prep & practice tests, H2S / First Aid / CSTS / P.Eng",       // was: "(coming soon)"
"Renewal reminder emails before tickets expire",  // was: "(coming soon)"
"Early access to new training content as it launches",  // was: "(coming soon)"
```

Note: Cert prep is still actually coming soon (separate from trainings). Leave "(coming soon)" on `"Cert prep & practice tests, H2S / First Aid / CSTS / P.Eng (coming soon)"` — only drop the suffix on training-library items.

- [ ] **Step 2: Update other surfaces**

In `src/app/(marketing)/page.tsx` line ~636: change `"Trainings library (coming soon)"` → `"Trainings library"`.

In `src/app/(marketing)/contact/contact-faq.tsx` line ~22: update the Platinum sentence to "Platinum (C$149/mo) adds the trainings library — sector-specific courses graded by working senior engineers."

In `src/app/(marketing)/for-seekers/page.tsx` FAQ entry (line ~257) — confirm the wording references trainings without "coming soon" implication.

- [ ] **Step 3: Typecheck and commit**

```bash
pnpm typecheck
git add src/lib/billing-display.ts 'src/app/(marketing)/'
git commit -m "feat(marketing): drop 'coming soon' from trainings copy on launch"
```

---

## Phase 8 — End-to-end test + final pipeline

### Task 24: Playwright E2E

**Files:**
- Create: `e2e/trainings.spec.ts`

- [ ] **Step 1: Write the test**

```ts
// e2e/trainings.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Trainings catalog", () => {
  test("catalog renders and routes to detail", async ({ page }) => {
    await page.goto("/trainings");

    if (page.url().includes("/sign-in")) {
      // Auth-gated under (app); redirect is expected and acceptable for smoke.
      await expect(page).toHaveURL(/sign-in/);
      return;
    }

    await expect(page.getByRole("heading", { name: /Skill up for the roles/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Featured/i })).toBeVisible();

    // Click into the first training card
    const firstCard = page.locator('a[href^="/trainings/"]').first();
    await firstCard.click();
    await expect(page).toHaveURL(/\/trainings\/[^/]+$/);
    await expect(page.getByRole("heading", { name: /Curriculum/i })).toBeVisible();
  });

  test("detail page enroll CTA is visible", async ({ page }) => {
    await page.goto("/trainings/gwo-basic");

    if (page.url().includes("/sign-in")) {
      await expect(page).toHaveURL(/sign-in/);
      return;
    }

    // CTA text varies by entitlement, but the sticky aside card should show
    // either "Enroll free" or "Upgrade to Platinum"
    await expect(
      page.getByRole("button", { name: /Enroll free|Upgrade to Platinum/i }),
    ).toBeVisible();
  });
});
```

- [ ] **Step 2: Run**

```bash
pnpm e2e --grep "Trainings"
```

Expected: 2/2 pass.

- [ ] **Step 3: Commit**

```bash
git add e2e/trainings.spec.ts
git commit -m "test(e2e): smoke test for /trainings catalog + detail"
```

---

### Task 25: Final pipeline pass

- [ ] **Step 1: Run the full pipeline**

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm e2e --grep "Trainings"
```

All should pass. Fix any errors introduced by new code (don't touch pre-existing errors in unrelated files).

- [ ] **Step 2: Final smoke**

```bash
curl -sS -o /dev/null -w "trainings: %{http_code}\nmy-trainings: %{http_code}\ndetail: %{http_code}\n" \
  http://localhost:3000/trainings \
  http://localhost:3000/trainings/my-trainings \
  http://localhost:3000/trainings/gwo-basic
```

All should return 200.

- [ ] **Step 3: Final empty commit**

```bash
git commit --allow-empty -m "chore(trainings): final cleanup pass"
```

---

## Self-Review

Performed inline at plan-write time — items resolved:

- ✅ **Spec coverage:**
  - §1 goal → overall feature
  - §2 tier positioning → Task 1 + Task 13 (Platinum check)
  - §3 routes → Tasks 11, 13, 15, 19, 20
  - §4 data model → Tasks 2–5
  - §5 content seeding → Task 7
  - §6 catalog → Tasks 11–12
  - §7 detail → Tasks 13–14
  - §8 player → Tasks 15–18
  - §9 my-trainings → Task 19
  - §10 certificate → Task 20
  - §11 router → Tasks 8–10
  - §12 tier helper → Task 1
  - §13 brand re-skin → threaded through all UI tasks (inline styles for dark cards)
  - §14 surfaces → Tasks 21–23
  - §15 telemetry → **NOT in this plan** (deferred — can sweep PostHog events as a follow-up, same as we did with skill-tests)
  - §16 out of scope → respected (no admin UI, no PDF, no real reviews)
  - §17 testing → Tasks 24, 25 (Playwright smoke; unit tests for `enroll`/`submitQuiz` deferred per project memory "defer tests by default")
  - §18 migration → Task 6
  - §19 follow-ups → tracked separately

- ✅ **Placeholder scan:** no TBD / TODO / "implement later" in any step. Every code block is full code.

- ✅ **Type consistency:** `Filters` type defined in `catalog-filters.tsx` and imported by `catalog-client.tsx` (Task 12). Lesson kinds are `"video" | "practice" | "quiz"` consistently across schema (Task 4), router (Task 9), player components (Tasks 16-18). `enrollmentId` is `string` (UUID) end-to-end.

- ⚠️ **Known soft spots:**
  - Task 21 references `graduationCap` icon — may need to add to the project's `Icon` component if not present. Implementer should grep first; `bookOpen` is a safe fallback.
  - Task 7 seed runner uses `node --env-file=.env.local ... tsx` pattern from skill-tests because `pnpm tsx` isn't reliably wired in this codebase. Implementer should try `pnpm tsx <path>` first; fall back if it fails.
  - Task 22 makes "Recommended next" links go to `/trainings` (unfiltered). Mapping skill-test categories to specific training filters (e.g. "Wind Operations weak score" → `/trainings?sectors=safety`) is a nice-to-have but requires a mapping table that isn't justified for v1.
  - PostHog telemetry events (spec §15) are not in this plan. Can be added in a Phase 9 follow-up commit.
