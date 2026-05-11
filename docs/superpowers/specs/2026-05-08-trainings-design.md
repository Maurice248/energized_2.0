# Trainings — design spec

Date: 2026-05-08
Status: Brainstorm complete, awaiting plan write-up

## 1. Goal

Ship a training/LMS feature for jobseekers — curated, sector-specific energy courses with multi-module curricula, embedded video lessons, in-line practice + quizzes, progress tracking, and a printable completion certificate. This is the Platinum-tier hero feature that has been on the marketing page as "coming soon" since the early roadmap.

## 2. Tier positioning

| Tier | Access |
|---|---|
| Free + Gold | Browse the catalog. Each course card shows a "Platinum to enroll" lock; clicking through reveals the detail page in read-only mode. No enrollment, no playback, no certificates. |
| Platinum | Full access — enroll, watch lessons, take quizzes, earn the completion certificate. |

Aligns with the existing pricing-page copy and `PLATINUM_FEATURES` in `src/lib/billing-display.ts`. Removes the "(coming soon)" suffix from those marketing strings on launch.

## 3. URL structure

| Route | Renderer | Purpose |
|---|---|---|
| `/trainings` | RSC | Catalog with hero, search, filters (sector / duration / cert), sort, featured strip, full grid |
| `/trainings/[slug]` | RSC | Course detail — outcomes, curriculum (collapsed), instructor, reviews, "what you unlock", related courses, enroll CTA |
| `/trainings/my-trainings` | RSC | User's own history — In progress · Enrolled · Completed sections (mirrors `/skills/my-tests` shape) |
| `/trainings/[slug]/learn/[moduleSlug]/[lessonSlug]` | client | Player — video/practice/quiz pane + module sidebar with completion checkmarks |
| `/trainings/[slug]/certificate?enrollment=[id]` | RSC | Print-friendly certificate page (the user's name, course name, completion date, score). Simple HTML; PDF export deferred. |

All routes live under the existing `(app)` layout — auth-gated. The catalog page itself is reachable by free users; the locks fire at the enroll step.

## 4. Data model

Four new tables, all under `src/server/db/schema/`:

### `trainings.ts` — the catalog

```ts
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

export const trainings = pgTable("trainings", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  shortBlurb: text("short_blurb").notNull(),         // 1-line listing summary
  longBlurb: text("long_blurb").notNull(),           // 3-4 line detail-page intro
  sector: trainingSectorEnum("sector").notNull(),
  certName: text("cert_name"),                       // "GWO Basic Safety", etc.
  hours: integer("hours").notNull(),
  durationLabel: text("duration_label").notNull(),   // "14 hours · 5 modules"
  level: trainingLevelEnum("level").notNull(),
  monogram: text("monogram").notNull(),              // 2-char card mark e.g. "GW"
  tileColor: text("tile_color").notNull(),           // hex; brand-safe palette
  instructorName: text("instructor_name").notNull(),
  instructorRole: text("instructor_role").notNull(),
  outcomesJson: jsonb("outcomes_json").$type<string[]>().notNull(),  // 3-4 bullets
  unlocksJson: jsonb("unlocks_json").$type<{ role: string; co: string; band: string }[]>().notNull(),
  isFeatured: boolean("is_featured").notNull().default(false),
  isNew: boolean("is_new").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
```

### `training-modules.ts`

```ts
export const trainingModules = pgTable("training_modules", {
  id: uuid("id").primaryKey().defaultRandom(),
  trainingId: uuid("training_id")
    .notNull()
    .references(() => trainings.id, { onDelete: "cascade" }),
  slug: text("slug").notNull(),                      // unique per training, e.g. "first-aid"
  number: text("number").notNull(),                  // display number "01"..."05"
  title: text("title").notNull(),
  durationLabel: text("duration_label").notNull(),   // "3h 10m"
  sortOrder: integer("sort_order").notNull(),
}, (t) => ({
  uniqSlug: uniqueIndex("training_modules_training_slug_idx").on(t.trainingId, t.slug),
}));
```

### `training-lessons.ts`

```ts
export const trainingLessonKindEnum = pgEnum("training_lesson_kind", [
  "video",
  "practice",
  "quiz",
]);

export const trainingLessons = pgTable("training_lessons", {
  id: uuid("id").primaryKey().defaultRandom(),
  moduleId: uuid("module_id")
    .notNull()
    .references(() => trainingModules.id, { onDelete: "cascade" }),
  slug: text("slug").notNull(),                      // unique per module
  title: text("title").notNull(),
  kind: trainingLessonKindEnum("kind").notNull(),
  durationLabel: text("duration_label").notNull(),   // "12m"

  // Video lesson:
  videoUrl: text("video_url"),                       // YouTube/Vimeo embed URL — null for non-video
  videoProvider: text("video_provider"),             // "youtube" | "vimeo" — null for non-video

  // Practice lesson:
  practiceMarkdown: text("practice_markdown"),       // text content, null for non-practice

  // Quiz lesson:
  quizQuestionsJson: jsonb("quiz_questions_json").$type<Array<{
    id: string;
    prompt: string;
    options: [string, string, string, string];
    correctIdx: 0 | 1 | 2 | 3;
    explanation?: string;
  }>>(),                                              // 5-10 questions, null for non-quiz
  quizPassThreshold: integer("quiz_pass_threshold"),  // 70 default; null for non-quiz

  sortOrder: integer("sort_order").notNull(),
}, (t) => ({
  uniqSlug: uniqueIndex("training_lessons_module_slug_idx").on(t.moduleId, t.slug),
}));
```

### `training-enrollments.ts`

```ts
export const trainingEnrollmentStatusEnum = pgEnum("training_enrollment_status", [
  "enrolled",
  "in_progress",
  "completed",
]);

export const trainingEnrollments = pgTable("training_enrollments", {
  id: uuid("id").primaryKey().defaultRandom(),
  candidateId: text("candidate_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  trainingId: uuid("training_id")
    .notNull()
    .references(() => trainings.id),
  status: trainingEnrollmentStatusEnum("status").notNull().default("enrolled"),
  progressJson: jsonb("progress_json").$type<{
    [lessonId: string]: {
      completedAt: string;            // ISO date
      score?: number;                 // for quiz lessons
    };
  }>().notNull().default({}),
  enrolledAt: timestamp("enrolled_at").notNull().defaultNow(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  // Score: average of all quiz scores once completed.
  finalScore: integer("final_score"),
}, (t) => ({
  pk: primaryKey({ columns: [t.candidateId, t.trainingId] }),
}));
```

Indexes: `(candidate_id, status)` on enrollments; `(training_id)` on modules and lessons (already implicit via FK); `(sector, is_active, sort_order)` on trainings.

## 5. Content seeding

A migration-driven seed script — `src/server/db/seed/trainings-seed.ts` — ports the 11 mock trainings from the design package into the DB on first run. Idempotent (upsert by slug). Rich curriculum (5 modules + lessons) is seeded only for the showcase course `gwo-basic`; other trainings get a single placeholder module so the catalog renders end-to-end.

Quiz questions in seed data: each `quiz` lesson seeds with 3 hard-coded MCQ stubs (sample content matching the topic, e.g. for GWO First Aid: "DRSABCD primary survey order"). Real quiz authoring is admin-deferred.

Sector tile colors mapped to the brand-safe palette (no greens/coral as those clash with brand):

| Sector | Hex |
|---|---|
| Safety & certifications | Amber-700 `#B45309` |
| Technical & equipment | Dark Blue `#004984` |
| Professional designations | Indigo-700 `#4338CA` |
| Soft skills & interview | Slate-700 `#334155` |
| Sector transitions | Sky-700 `#0369A1` |

## 6. Catalog page (`/trainings`)

- **Hero:** large display headline ("Skill up for the roles that *actually* pay."), 3-stat row (live courses count, recruiter inbound multiplier, first-attempt pass rate). Stats hard-coded for v1 — switch to live counts later.
- **Search bar:** plain-text search across `title`, `shortBlurb`, `certName`, `instructorName` via Postgres `ILIKE`. No Postgres FTS in v1; ILIKE is fine at our content scale.
- **Filters:** sector multi-select chip group · duration filter (under 4h / half day / full day / multi-day / long-form, mapped from `hours` field) · cert multi-select dropdown
- **Sort:** Popular (default) · Highest rated · Shortest · Newest. Popular = total enrollment count.
- **Featured strip:** top section with 3 `is_featured = true` cards. Slightly larger card layout.
- **Grid:** 3-col on desktop, 1-col mobile. Cards show monogram tile, sector badge, title, short blurb, hours + level + members count, "Enroll" CTA (Platinum-locked for free/Gold).

## 7. Detail page (`/trainings/[slug]`)

- **Hero:** instructor + stats panel right, course title + outcomes left
- **About this course** — `longBlurb` paragraph
- **What you'll be able to do** — outcomes list (from `outcomesJson`)
- **Curriculum** — collapsible module list. Each module: number, title, duration, lessons (with kind icon: video/practice/quiz). Locked for non-Platinum.
- **Instructor** — name, role, blurb
- **Reviews** — list of `TR_REVIEWS` from seed (read-only; v1 doesn't accept new reviews)
- **What this unlocks** — list of `unlocksJson` job bands with role / company / salary band
- **Enroll CTA** — sticky bottom bar on mobile. Platinum users: "Enroll free" → calls `enrollments.enroll` mutation, redirects to first lesson. Free/Gold users: "Upgrade to Platinum →" linking to billing.

## 8. Player (`/trainings/[slug]/learn/[moduleSlug]/[lessonSlug]`)

Three-column layout (desktop): nav bar top with breadcrumbs + module/lesson position + "Save / Next lesson" actions. Center pane is the lesson content. Right sidebar is the module list with completion checkmarks.

Lesson kinds:

- **video** — embedded iframe (`videoUrl`). For YouTube: `<iframe src="https://www.youtube.com/embed/{id}?rel=0">`. For Vimeo: similar pattern. "Mark complete" button below the player; v1 manual click; v2 wires to onMessage progress events.
- **practice** — `practiceMarkdown` rendered through `react-markdown` (or a tiny markdown stub if we don't want the dep). "Mark complete" button at bottom.
- **quiz** — `quizQuestionsJson` rendered as a question-by-question runner (similar shape to skill tests but smaller — 5-10 Q, no timer). On submit: server validates, computes score, stores in `progressJson[lessonId].score`. If `score >= quizPassThreshold` → marked complete. Otherwise → "retake" button.

Progress: each "mark complete" call writes to `trainingEnrollments.progressJson[lessonId] = { completedAt: now, score? }`. When all lessons in the training have `progressJson` entries, server marks `status = 'completed'` and computes `finalScore` (average of quiz scores).

Player background is dark (`#101820`) per the design — apply same cascade-bypass tactics learned from skill tests.

## 9. My Trainings (`/trainings/my-trainings`)

Three sections:
- **In progress** (status `in_progress`): card per training with progress bar, last seen, "Continue" CTA jumping to current lesson
- **Enrolled but not started** (`enrolled`): card with "Start course" CTA
- **Completed** (`completed`): card with completion date, score badge, "View certificate →" link

Mirrors the `/skills/my-tests` page structure.

## 10. Certificate page (`/trainings/[slug]/certificate?enrollment=[id]`)

Server-rendered. Shows:
- Energized logo
- "Certificate of Completion"
- User's full name (from `user.name`)
- Course title + cert name
- Final score
- Completion date (formatted)
- Course duration
- Instructor name
- A unique enrollment ID at the bottom (audit trail)

Print-friendly CSS — `@media print { ... }` strips chrome. PDF export deferred.

## 11. tRPC router — `trainings`

```ts
trainings: router({
  list: publicProcedure
    .input(z.object({
      sectors: z.array(z.string()).optional(),
      durationIds: z.array(z.string()).optional(),
      certNames: z.array(z.string()).optional(),
      query: z.string().optional(),
      sort: z.enum(["popular", "rating", "shortest", "newest"]).default("popular"),
    }))
    .query(...),

  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(...),                                       // returns training + modules + lessons (no quiz answer keys)

  myEnrollments: protectedProcedure.query(...),

  enroll: jobseekerProcedure
    .input(z.object({ slug: z.string() }))
    .mutation(...),                                    // Platinum check; create enrollment row

  markLessonComplete: protectedProcedure
    .input(z.object({
      enrollmentId: z.string().uuid(),
      lessonId: z.string().uuid(),
    }))
    .mutation(...),                                    // for video + practice lessons

  submitQuiz: protectedProcedure
    .input(z.object({
      enrollmentId: z.string().uuid(),
      lessonId: z.string().uuid(),
      answers: z.record(z.string(), z.number().int().min(0).max(3)),
    }))
    .mutation(...),                                    // grades quiz, updates progress

  getEnrollmentProgress: protectedProcedure
    .input(z.object({ enrollmentId: z.string().uuid() }))
    .query(...),                                       // for player + my-trainings detail

  // Public so cert links can be shared with recruiters without forcing
  // them to sign in (UUIDs are unguessable; the cert exposes only the
  // candidate's name + course + completion date — all profile-level info).
  getCertificate: publicProcedure
    .input(z.object({ enrollmentId: z.string().uuid() }))
    .query(...),                                       // returns cert data; only if status='completed'
}),
```

`jobseekerProcedure` already exists from skill-tests work. Platinum check: a small helper `isPlatinumStatus(subscriptionStatus)` (or similar — pattern from `isEntitledSubscriptionStatus`).

## 12. Tier-gating helper

**Implementation prerequisite — verify Platinum vs Gold distinction.** The existing `isEntitledSubscriptionStatus(...)` helper treats all paid statuses identically (Gold and Platinum both pass). Trainings need to distinguish — only Platinum unlocks. Implementation plan must:
1. Grep for how Stripe price IDs / subscription statuses map to tier in this codebase
2. Add a `isPlatinumStatus(subscriptionStatus)` helper that returns true ONLY for Platinum (not Gold)
3. If the schema doesn't currently distinguish, add a `subscription_tier` column or extend the status enum

```ts
// Sketch — finalize during implementation:
export function isPlatinumStatus(status: string | null): boolean {
  return status === "platinum_active"; // or whatever the actual identifier is
}
```

Server-side `enroll` mutation throws `FORBIDDEN: paywall:trainings` if not Platinum. Client renders the upgrade CTA on catch.

## 13. Brand re-skin (v2 → production)

Same map we used for skill tests. Inline-style any heading inside dark cards (`.v2 h*` cascade), any `<p>` inside dark cards (`.v2 p` cascade), and any button border/padding/bg (`.v2 :where(button)` cascade). Brand tokens already exist in `src/app/globals.css` as `--brand-blue`, `--brand-dark-blue`, `--brand-black`.

## 14. Surfaces & nav

- **Top nav** — add "Trainings" link between "Skill tests" and "For job seekers". Same `Icon` pattern as Skill tests but with a different icon (`graduationCap` from lucide).
- **User-menu dropdown** — add "My trainings" item next to "Skill tests".
- **Dashboard** — second promo card under the skill-tests one for "Trainings" — same shape, different copy.
- **Skill-test result page "Recommended next"** — already references "trainings coming soon" for the weakest categories. Wire to actual `/trainings?sector=...` links keyed off the topic's sector match. Drop the "(coming soon)" suffix.
- **Public profile `/p/[id]`** — new "Completed trainings" section above Verified Skills (shows the user's completed courses with cert links). Optional v1; can defer.
- **Marketing copy** — drop "(coming soon)" from the four `PLATINUM_FEATURES` strings in `src/lib/billing-display.ts` that reference trainings. Update the contact-FAQ copy too.

## 15. Telemetry (PostHog)

- `training.catalog.viewed` `{ filterCount, sort }`
- `training.detail.viewed` `{ slug }`
- `training.enrolled` `{ slug }`
- `training.lesson.completed` `{ slug, lessonId, kind }`
- `training.quiz.submitted` `{ slug, lessonId, score, passed }`
- `training.completed` `{ slug, finalScore }`
- `training.paywall.viewed` `{ slug }`
- `training.paywall.upgraded` `{ slug }`
- `training.certificate.viewed` `{ slug }`

## 16. Out of scope for v1

- Real-time video progress tracking (auto-mark at 90% watched). v1 is manual "Mark complete" — postMessage wiring is v1.5.
- Admin UI for authoring courses / modules / lessons / quizzes. v1 edits via DB / migration.
- PDF certificate export. v1 is HTML print-only.
- Course reviews from real users (v1 displays seed reviews, no submit UI).
- AI-generated quizzes per module (would reuse skill-test infra; add later if curated content is too slow).
- Course discussions / cohort chat.
- Live office hours / 1:1 scheduling (mentioned in seed copy but pure marketing in v1).
- Automatic refund on PMP "fee-back" guarantee.

## 17. Testing

- Vitest unit: `enroll` Platinum gate; `submitQuiz` scoring + auto-complete; `markLessonComplete` idempotency; final-score computation
- Playwright happy path: catalog → detail → enroll (Platinum user) → first video lesson → mark complete → quiz → submit → next module → completion → certificate
- Playwright paywall: free user → enroll click → paywall page → upgrade CTA visible

## 18. Migration

Single migration:
1. Adds `training_sector`, `training_level`, `training_lesson_kind`, `training_enrollment_status` enums
2. Creates the 4 tables + indexes
3. Seed runs separately via `src/server/db/seed/trainings-seed.ts` — must be invoked manually post-deploy until a follow-up CI hook is added (same gap noted on skill-tests)

Updates to `src/lib/billing-display.ts`: drop "(coming soon)" suffixes; update contact FAQ copy.

## 19. Open follow-ups (post-v1)

- Admin authoring UI for courses
- Auto-mark video complete at 90% watched (postMessage from YouTube/Vimeo iframe)
- AI-generated practice quizzes per module
- Real reviews
- Per-cert PDF export
- Sector recommendation engine (which trainings the user should take based on profile gaps)
