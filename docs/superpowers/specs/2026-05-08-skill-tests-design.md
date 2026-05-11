# Skill Tests — design spec

Date: 2026-05-08
Status: Brainstorm complete, awaiting plan write-up

## 1. Goal

Ship an AI-generated, sector-specific skill assessment feature for jobseekers. Tests verify a candidate's knowledge in their sector + role, surface as badges on the public profile, become a filter on `/candidates`, and flag on applicant cards when a candidate has a badge matching the role they applied to. The feature is the next chapter of "Energized AI career toolkit" — adjacent to the existing match-scoring, cover-letter, and profile-polish features.

## 2. Tier positioning & pricing

| Tier | Access |
|---|---|
| Free | 1 lifetime attempt — any sector / role, regardless of pass or fail. After this, all subsequent attempts hit the upgrade paywall. |
| Gold | Full library, 30-day retake lock on pass, 7-day cooldown on fail |
| Platinum | Same as Gold (no cert-prep tests yet — Platinum's cert-prep is a separate future feature) |

Marketing copy in `src/lib/billing-display.ts`:
- Add `"AI-generated skill tests — sector-specific, verifiable badges"` to `GOLD_FEATURES`
- Add `"1 free skill assessment"` to `JOBSEEKER_FREE_FEATURES`
- Leave existing `"Cert prep & practice tests…"` in `PLATINUM_FEATURES` (different product)

## 3. Test mechanics

| Property | Value |
|---|---|
| Question count | User-selectable: 10, 15, 20, 25, **30 max** (lower than design's 40 to control cost) |
| Time limit | `count × 90 s` shown as a single countdown (e.g. 22.5 min @ 15 Q) |
| Pass threshold | `≥ 70` of 100 |
| Verified-top tier | `≥ 80` of 100 — earns "Verified" tag on the badge |
| Retake on pass | 30-day lock (the user's "monthly" rule) |
| Retake on fail | 7-day cooldown |
| Format | Multiple choice, 4 options, 1 correct |
| Question types | Multiple choice + scenarios (toggleable) + calculations (toggleable) |
| Level calibration | Entry / Junior / Mid / Senior — passed to the AI prompt |
| Integrity | Honor-pledge checkbox required pre-start; one-shot session; tab-close = forfeit; question map with flagging is allowed (doesn't compromise integrity since each Q is timed within the global timer) |
| Proctoring | **Not in v1.** No webcam. No tab-switch detection beyond the cleanup cron. |

## 4. Catalog & data model

### Topic taxonomy

Two-level tree using a self-referential table:
- **Sectors** (`parent_topic_id IS NULL`) — 9 at launch from the design: Wind, Solar, Oil & Gas Upstream, Grid Operations, Hydrogen, Geothermal, Battery Storage, CCUS, Nuclear & SMR
- **Roles** (`parent_topic_id` set) — 2-4 per sector, e.g. "Wind technician II", "Reservoir engineer"

Admin can add/edit topics from a back-office UI (deferred to v1.1; v1 seeds via migration).

### Drizzle schemas

```ts
// src/server/db/schema/test-topics.ts
export const testTopics = pgTable("test_topics", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),                    // "wind", "wind-tech"
  parentTopicId: uuid("parent_topic_id"),                   // null = sector
  name: text("name").notNull(),
  monogram: text("monogram").notNull(),                      // 2 chars for the card mark, e.g. "WD"
  blurb: text("blurb"),                                      // sector card description
  subDescription: text("sub_description"),                   // role-level detail line
  tileColor: text("tile_color").notNull(),                   // hex; admin-editable; brand-safe palette
  jobSectorMatch: sectorEnum("job_sector_match"),            // maps to existing job_listings.sector enum;
                                                              // nullable on roles (inherited from parent at query time)
  isHot: boolean("is_hot").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
```

Indexes: unique on `slug`; composite `(parent_topic_id, is_active, sort_order)`.

```ts
// src/server/db/schema/skill-test-attempts.ts
export const attemptStatusEnum = pgEnum("skill_attempt_status", [
  "in_progress", "passed", "passed_top", "failed", "forfeited",
]);

export const skillTestAttempts = pgTable("skill_test_attempts", {
  id: uuid("id").primaryKey().defaultRandom(),
  candidateId: text("candidate_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  topicId: uuid("topic_id").notNull().references(() => testTopics.id),
  status: attemptStatusEnum("status").notNull().default("in_progress"),
  level: text("level").notNull(),                            // "entry"|"junior"|"mid"|"senior"
  questionCount: integer("question_count").notNull(),        // 10|15|20|25|30
  includeScenarios: boolean("include_scenarios").notNull().default(true),
  includeCalc: boolean("include_calc").notNull().default(true),
  questionsJson: jsonb("questions_json").notNull(),          // [{ id, prompt, options, correctIdx, tags, tagKind?, context? }]
  answersJson: jsonb("answers_json"),                        // { [questionId]: selectedIdx }
  score: integer("score"),                                   // 0-100
  correctCount: integer("correct_count"),
  categoryBreakdown: jsonb("category_breakdown"),            // [{ cat, right, total, pct }]
  aiFeedback: text("ai_feedback"),
  generationModel: text("generation_model"),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  finishedAt: timestamp("finished_at"),
});
```

Indexes: `(candidate_id, status)`, `(candidate_id, topic_id, finished_at)` for cooldown queries.

```ts
// src/server/db/schema/skill-badges.ts — denormalized for fast filter
export const skillBadges = pgTable("skill_badges", {
  candidateId: text("candidate_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  topicId: uuid("topic_id").notNull().references(() => testTopics.id),
  attemptId: uuid("attempt_id").notNull().references(() => skillTestAttempts.id),
  isVerifiedTop: boolean("is_verified_top").notNull(),       // ≥80
  score: integer("score").notNull(),
  earnedAt: timestamp("earned_at").notNull().defaultNow(),
}, (t) => ({ pk: primaryKey({ columns: [t.candidateId, t.topicId] }) }));
```

Indexes: `(topic_id)` for filter joins, `(candidate_id)` for profile reads.

Re-passing a topic upserts the badge row, refreshing `score`, `isVerifiedTop`, `earnedAt`. Badges are permanent — no expiry.

## 5. AI generation

Mixed-model strategy:

| Stage | Function | Model | Notes |
|---|---|---|---|
| Generate Qs | `generateSkillTest` (new in `src/lib/ai.ts`) | gpt-4o-mini | Pattern task, mini handles MCQs cleanly |
| Score | (server compare) | none | Pure equality on `correctIdx` |
| Result narrative | `narrateSkillResult` (new in `src/lib/ai.ts`) | gpt-4o | The user-facing AI moment |

### Generate prompt (canonical shape)

System: "You write energy-sector skill assessments for Canadian professionals. Generate exactly N multiple-choice questions for the given topic + role + level. Each Q has 4 options, 1 correct. Tag each Q with 1–2 short categories AND optionally tagKind 'scenario' or 'calc'. Include `context` only when needed for calc/scenario Qs. Never invent regulations, ticket names, or numbers — keep claims defensible. Return ONLY valid JSON matching the schema."

User: `{ topic_name, role_name, level, count, includeScenarios, includeCalc, banned_categories: [] }`.

### Generation contract (Zod)

```ts
const QuestionSchema = z.object({
  prompt: z.string().min(20).max(500),
  context: z.string().nullable(),
  options: z.array(z.string().min(1).max(200)).length(4),
  correctIdx: z.number().int().min(0).max(3),
  tags: z.array(z.string()).min(1).max(3),
  tagKind: z.enum(["scenario", "calc"]).nullable(),
});
const ResponseSchema = z.object({ questions: z.array(QuestionSchema) });
```

If parse fails → one retry → on second fail throw `TRPCError("INTERNAL_SERVER_ERROR")` and refund the entitlement (free user gets the 1-test back, paid user just sees an error).

### Cost (locked from the brainstorm cost calc)

| Test size | Generate (mini) | Narrative (4o) | Total |
|---|---|---|---|
| 15 Q | $0.0021 | $0.0053 | **~$0.007** |
| 30 Q | $0.0040 | $0.0053 | **~$0.009** |

Average jobseeker (2 tests in 3 months): **~$0.014–0.018**. Power user (5 tests): **~$0.05**. Both well under the existing per-user AI cost envelope.

### Trigger.dev usage

Generation runs **inline in the tRPC mutation** (not as a Trigger task). The user is staring at the generating overlay (~3-5s) and a background job adds round-trip overhead with no benefit.

A separate Trigger cron — `cleanup-stale-skill-attempts` — runs every 10 min: finds `in_progress` attempts older than 25 min and marks them `forfeited`. Lives in `code/trigger/cleanup-stale-skill-attempts.ts`.

## 6. UX flow & routes

| Mode | URL | Renderer |
|---|---|---|
| Catalog | `/skills` | RSC + client filters |
| Configure | `/skills/[topicSlug]/configure` | RSC |
| Generating | (no URL — overlay) | client + tRPC mutation |
| Test runner | `/skills/[topicSlug]/attempt/[attemptId]` | client |
| Result | `/skills/[topicSlug]/attempt/[attemptId]/result` | RSC |

### Catalog (`/skills`)

Hero card on the right (dark surface, Energized Black background) with text input ("Type your role…") that does fuzzy-matches against role names and jumps to that sector's configure step. Hero stats reflect real DB counts (`COUNT(distinct skill_badges.candidate_id)`, etc.). Three filter tabs: All / Trending / Renewable / Traditional. Sector grid (3 cols → 1 col responsive). "Most-taken roles" rows section. "How it works" 4-step strip at the bottom.

Free-tier user sees a "Free trial" pill on cards if no prior attempt; "Gold to unlock" pill if used. Cards remain clickable in both states — paywall enforces at configure step, not catalog.

### Configure (`/skills/[topicSlug]/configure`)

Two-column grid: left = form (role pill picker, level grid 4-col, length slider 10/15/20/25/30, scenario toggle, calc toggle, **honor pledge checkbox**); right = sticky summary card (Energized Black, blue accents) with all current selections + "Generate test" CTA. If user is free and has used their 1 attempt, the entire form is replaced with a paywall card (re-using the existing paywall styling). Honor pledge must be checked to enable the CTA.

### Generating overlay

Full-screen dark overlay with orbital animation. Shows 4 progressive log lines while `skillTests.startAttempt` runs (~3-5s for mini @ ≤30Q). On success, redirects to `/skills/[topicSlug]/attempt/[attemptId]`. On error, returns user to configure with a toast.

### Test runner

Sticky top bar: Quit (with confirm) · question N/total · progress bar · countdown timer. Right rail: question map (5-col grid of cells) with state (answered / flagged / current / not-answered) and a "Submit" button at the bottom — disabled until all questions answered (matches the design's behavior). When the timer hits 0, the runner auto-submits via `submitAttempt` regardless of how many were answered (unanswered count as wrong).

Question card center: tag chips (color-coded: scenario = amber, calc = brand blue 100, default = neutral) · question prompt (large, italic accents) · `Given:` context block when present · 4 options as large clickable buttons, A/B/C/D markers · Flag for review toggle bottom-left · Prev / Next / Submit buttons bottom-right.

Auto-save: each answer click posts to `saveAnswer` (debounced 500ms client-side). On `beforeunload`, browser confirm → if user proceeds, server marks `forfeited` on next access.

### Result

Score band drives the headline:
- `≥80`: "Top 30%. *Badge earned.*" + "Verified" eyebrow + retake-available date (`now + 30 days`)
- `70-79`: "You *passed*. Solid result." + "Verified" eyebrow + retake-available date (`now + 30 days`)
- `<70`: "Almost there. *Try again* in 7 days." + "Attempt complete" eyebrow + retake-available date (`now + 7 days`)
- For free-tier users with no remaining attempts, the retake message is replaced with "Upgrade to Gold to take more tests."

Big score number on dark card (140px serif → Lato Black at brand re-skin). AI narrative paragraph below score. Side cards: profile chip preview (the actual user avatar + a mock badge as it'll appear on profile), "Recommended next" 3 trainings (placeholder for now — wires up when training pages ship). Below: category breakdown bar list (`<60%` rows highlighted with amber gradient).

Actions: "Add badge to profile" (auto-applied — this is just a confirmation animation, badge already upserted on submit), "Take another", "Download report" (deferred to v1.1).

## 7. Badge surfaces

### Public profile `/p/[id]`

New "Verified Skills" section above existing `Certifications`. Lists `skillBadges` joined to `testTopics`, ordered by `earnedAt DESC`. Each badge: `{Topic name} · {score}/100 · earned {relative date}` + "Verified ✓" pill if `isVerifiedTop`. Empty state for own-profile shows a CTA to `/skills`.

### `/candidates` employer search

New filter chip "Verified skill" with multi-select dropdown of all active topics. Selecting one or more filters candidates to those who have a badge in any selected topic. Server-side join via `skill_badges`.

### Applicant kanban / detail

When the application's job sector matches one of the candidate's badge topics (matched via `test_topics.jobSectorMatch`), render a small pill alongside the existing AI fit score. Pill copy: `{topic.name}` + checkmark dot — checkmark fills blue (Energized Blue) when `isVerifiedTop`, neutral grey otherwise.

Match rule: `applicationCandidate.skillBadges` joined to `test_topics` where `test_topics.jobSectorMatch = jobListing.sector` OR (for roles) where the role's parent sector's `jobSectorMatch = jobListing.sector`. If a candidate has multiple matching badges, show up to 2 pills, prefer Top-Verified.

Lazy-fetched via `badgesForCandidate` — same pattern as `job_matches`. No N+1 on the kanban list (single query with `IN (candidateIds)` for the column).

## 8. tRPC router — `skillTests`

```ts
// src/server/api/routers/skill-tests.ts

skillTests: router({
  listTopics: publicProcedure
    .query(...),                                              // sectors + roles tree, active only

  getTopic: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(...),                                              // includes role children

  startAttempt: jobseekerProcedure                            // new helper — protected + role check
    .input(z.object({
      topicSlug: z.string(),
      level: z.enum(["entry", "junior", "mid", "senior"]),
      questionCount: z.union([z.literal(10), z.literal(15), z.literal(20), z.literal(25), z.literal(30)]),
      includeScenarios: z.boolean(),
      includeCalc: z.boolean(),
      honorPledged: z.literal(true),                          // schema-enforced
    }))
    .mutation(...),                                           // entitlement + cooldown + create + AI gen

  getAttempt: protectedProcedure
    .input(z.object({ attemptId: z.string().uuid() }))
    .query(...),                                              // owner-only check

  saveAnswer: protectedProcedure
    .input(z.object({
      attemptId: z.string().uuid(),
      questionId: z.string(),
      selectedIdx: z.number().int().min(0).max(3),
    }))
    .mutation(...),                                           // idempotent, debounced

  submitAttempt: protectedProcedure
    .input(z.object({ attemptId: z.string().uuid() }))
    .mutation(...),                                           // score + AI narrate + upsert badge

  myBadges: protectedProcedure
    .query(...),                                              // for profile / dashboard

  badgesForCandidate: protectedProcedure
    .input(z.object({ candidateId: z.string() }))
    .query(...),                                              // for /p/[id] and applicant card

  searchByBadge: protectedProcedure
    .input(z.object({ topicSlugs: z.array(z.string()) }))
    .query(...),                                              // for /candidates filter
}),
```

`jobseekerProcedure` is added in `src/server/api/trpc.ts` alongside the existing `employerProcedure` — checks `session.user.role === "jobseeker"`.

## 9. Brand re-skin (v2 → production)

| v2 token | Production replacement | Used for |
|---|---|---|
| `--v2-accent` `#C7F956` | Energized Blue `#1CAAE2` | Primary accent — CTA fills, score, italic emphasis, badge dot |
| `--v2-accent-deep` `#8FCC2A` | Dark Blue `#004984` | Hover, italic em headlines, breakdown gradient deep stop |
| `--v2-accent-soft` `#E5FCA6` | Blue 100 `#E5F4FB` | Soft halos behind animations |
| `--v2-ink-950` `#0B0D12` | Energized Black `#101820` | All dark surfaces |
| `--v2-ink-900..50` | Tailwind `slate`/`zinc` scale | Body, borders, soft surfaces |
| `--v2-coral` `#FF7A59` | Amber-600 `#D97706` | Flag pill, weak-category bar, timer warn |
| `--v2-coral-soft` `#FFE3DA` | Amber-50 `#FFFBEB` | Timer warn background |
| `Instrument Serif` | Lato Black 900 + italic for emphasis | All `h1/h2/h3` |
| `Geist` | Lato 400/500 | Body |
| `JetBrains Mono` | Lato uppercased + `tracking-[0.1em]` | Eyebrows, micro labels, tag chips |

Sector tile colors (brand-safe palette):

| Sector | Hex |
|---|---|
| Wind | Sky-700 `#0369A1` |
| Solar | Amber-600 `#D97706` |
| Oil & Gas | Energized Dark Blue `#004984` |
| Grid | Indigo-700 `#4338CA` |
| Hydrogen | Blue-500 `#3B82F6` |
| Geothermal | Stone-700 `#44403C` |
| Battery | Yellow-700 `#A16207` |
| CCUS | Slate-800 `#1E293B` |
| Nuclear | Energized Blue `#1CAAE2` |

Stored in `test_topics.tile_color` so admin can edit later.

## 10. Out of scope for v1

- Admin UI for editing topics (CRUD via direct DB / migration only at v1)
- Proctored mode / webcam
- Pause-once mid-test
- 40-question max length
- "Download report" PDF export
- Cert-prep tests (H2S, First Aid, etc.) — separate Platinum future feature
- Trainings library deep-link from result page (placeholder only — wires up when training pages ship)
- Public sharing of badge to LinkedIn / copy-link export

## 11. Telemetry

Events to PostHog (using existing `domain.action.result` taxonomy):

- `skill_test.catalog.viewed` — `{ tab, totalSectors }`
- `skill_test.configure.viewed` — `{ topicSlug, isFree, hasUsedFree }`
- `skill_test.attempt.started` — `{ topicSlug, level, count, scenarios, calc, model }`
- `skill_test.attempt.submitted` — `{ topicSlug, score, passed, isVerifiedTop, durationMs }`
- `skill_test.attempt.forfeited` — `{ topicSlug, reason: "tab_close" | "stale_cleanup" }`
- `skill_test.badge.earned` — `{ topicSlug, score, isVerifiedTop }`
- `skill_test.paywall.viewed` — `{ topicSlug }`
- `skill_test.paywall.upgraded` — `{ topicSlug }`

## 12. Testing

- Vitest unit: `skillTests.startAttempt` entitlement & cooldown logic; submit-attempt scoring; badge upsert
- Vitest unit: `generateSkillTest` Zod parsing + retry behavior (mock OpenAI)
- Playwright E2E: full free-tier happy path (land → catalog → configure → generate → take → submit → result → badge on profile)
- Playwright E2E: free-tier paywall path (try second attempt → paywall card)
- Playwright E2E: passed retake-cooldown path (try same topic in 30 days → cooldown error)
- Playwright visual: catalog page, configure page, runner question card, result page (pass + fail variants)

## 13. Migration

Single migration that:
1. Creates `attempt_status` pg enum
2. Creates `test_topics`, `skill_test_attempts`, `skill_badges` tables + indexes
3. Seeds `test_topics` with 9 sectors + their roles (data from `v2-skilltest-data.jsx`, brand-safe tile_color from §9)
4. Adds tRPC `skillTests` router to `appRouter`
5. Updates `GOLD_FEATURES` and `JOBSEEKER_FREE_FEATURES` in `src/lib/billing-display.ts`

## 14. Open follow-ups (post-v1)

- Admin UI for topic CRUD (highest priority follow-up)
- Cert-prep tests on Platinum (separate product line)
- "Download report" PDF
- Public badge share link
- Wire result page's "Recommended next" to actual training pages once those ship
- Per-question analytics (normalize Q storage if/when this is needed)
