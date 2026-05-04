# Interview Scheduling

**Status:** Design accepted 2026-05-02
**Scope:** Two-sided in-app interview scheduling between employers and candidates. Employer proposes 2–5 slots → candidate picks one → both sides get a confirmation email with `.ics` attachment. Reschedule, cancel, expire, complete, remind. New `interviews` + `interview_slots` tables, new `interviews` tRPC router, 5 new email templates, 5 new `notification_kind` enum values, 3 cron tasks + 3 fire-on-mutation tasks, 4 UI surfaces.
**Out of scope:** Google Calendar / Outlook two-way sync, auto-generated Zoom/Meet links, recurring or panel interviews, employer-side calendar conflict detection, per-user timezone preference on profile, AI scheduling, candidate-initiated proposals, no-auth magic-link reschedule, SMS reminders, tests (deferred per established pattern).

---

## 1. Goal

Today, an applicant in the `interview` pipeline stage has no in-app way to actually schedule a meeting. Employers fall back to email or external tools (Calendly, Google Calendar) and the platform stores nothing. This work adds a structured scheduling primitive directly on `applications`, surfaced on the existing employer Kanban + applicant detail + a new "Today's interviews" card on `/employer`, and on the candidate's `/applications/{id}` detail.

The model is **two-sided coordination, multi-slot pick** (Doodle-style):

1. Employer proposes 2–5 slots in the modal on the applicant card or detail page.
2. Candidate sees the proposal on `/applications/{id}` and picks one slot — or asks for different times.
3. Confirmation email goes to both parties with an `.ics` attachment.
4. Either side can cancel; the employer can also reschedule (which atomically cancels the current interview and creates a new one).
5. A reminder cron emails both sides 24h before the confirmed start.
6. Stale proposals (no candidate response in 7 days) auto-expire and notify the employer.
7. After the slot ends, the interview is auto-marked `completed`. The employer can then schedule a next round.

---

## 2. Data model

Two new tables in `src/server/db/schema/interviews.ts` (with relations re-exported from `src/server/db/schema/index.ts`). Migration adds two new enums and 5 new values to the existing `notification_kind` enum.

### 2a. `interviews` (parent)

```ts
{
  id: uuid PK
  applicationId: uuid FK -> applications.id (cascade delete)
  proposedById: text FK -> user.id (set null on user delete)

  medium: 'video' | 'phone' | 'in_person'        // new enum: interview_medium
  details: text NOT NULL                          // URL / phone / address per medium
  durationMin: integer NOT NULL DEFAULT 60        // 15..480
  notes: text                                    // optional employer message

  status: 'proposed' | 'confirmed' | 'canceled' | 'expired' | 'completed'
                                                 // new enum: interview_status
  cancelReason: text                             // free-text; "rescheduled" is a sentinel
  canceledById: text FK -> user.id (set null)

  confirmedSlotId: uuid                          // FK -> interview_slots.id once picked
                                                 // (no DB-level FK to avoid a cycle; app-level invariant)

  expiresAt: timestamp NOT NULL                  // createdAt + 7 days
  remindedAt: timestamp                          // best-effort idempotency for reminder cron

  createdAt: timestamp NOT NULL DEFAULT now()
  updatedAt: timestamp NOT NULL DEFAULT now()
}
```

Indexes:
- `(applicationId, status)` — for `interviews.list` and Kanban card decoration.
- `(status, expiresAt)` — for the expire cron.
- `(status, remindedAt)` — for the reminder cron's "haven't been reminded yet" filter; the cron joins to slots and filters on `startsAt` window.

### 2b. `interview_slots` (1:N child)

```ts
{
  id: uuid PK
  interviewId: uuid FK -> interviews.id (cascade delete)
  startsAt: timestamp NOT NULL                   // UTC
  createdAt: timestamp NOT NULL DEFAULT now()
}
```

Indexes:
- `(interviewId)` — natural join key.
- `(startsAt)` — for completion cron + reminder cron range queries.

### 2c. Notification enum additions

`notification_kind` gets 5 new values, additive (no breaking changes):

- `interview_proposed`
- `interview_confirmed`
- `interview_canceled`
- `interview_reminder`
- `interview_time_requested`

### 2d. Reschedule modeling

Reschedule does **not** mutate the existing row. The existing row is set to `status='canceled', cancelReason='rescheduled'`, and a brand-new `interviews` row + slots are created on the same `applicationId`. History is preserved without a `superseded` status. The mutation is wrapped in a single Drizzle transaction.

---

## 3. State machine

```
                    ┌─────────────┐
                    │  proposed   │  ← created by proposeSlots
                    └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────┬───────────────────┐
        │                  │                  │                   │
        ▼                  ▼                  ▼                   ▼
   confirmed           canceled           expired            (reschedule)
   (candidate         (cancel mut         (cron: 7d,         old → canceled
    confirmSlot)       OR reschedule)     notify employer)   cancelReason='rescheduled';
        │                                                    new row created)
        ▼
   completed
   (cron: confirmedSlot.startsAt + durationMin < now)
```

**Invariants enforced server-side:**
- At most one interview per `applicationId` is in `proposed` or `confirmed` state at a time. `proposeSlots` rejects with `BAD_REQUEST "Cancel the existing interview first"` if violated. `reschedule` is the only path that bypasses this (transactionally — the old row goes `canceled` in the same tx that creates the new one).
- All `interview_slots.startsAt` rows for a `proposed` interview must be in the future when created.
- `confirmSlot` requires `slot.startsAt > now()` AND `slot.interviewId == interviewId` AND `interview.status == 'proposed'`.

---

## 4. tRPC router (`interviews`)

New file `src/server/api/routers/interviews.ts`. All `protectedProcedure`. Role gating uses the existing `org_members` role check pattern from `employer.ts`.

### 4a. `interviews.list({ applicationId })`

Visible to: the candidate on the application, OR any `org_members` row with `role IN ('owner', 'admin', 'recruiter')` on the org that owns the job.

Returns: array of interviews (newest first) joined to their slots and proposer name; for `confirmed` interviews, the chosen slot is flagged.

```ts
[{
  id, status, medium, details, durationMin, notes,
  cancelReason, canceledByName,
  proposedByName, createdAt, expiresAt,
  slots: [{ id, startsAt, isConfirmed }],
}]
```

### 4b. `interviews.proposeSlots({...})`

Role: `owner` | `admin` | `recruiter`.

```ts
input: {
  applicationId: uuid,
  medium: 'video' | 'phone' | 'in_person',
  details: string,           // 1..2000
  durationMin: int,          // 15..480
  notes?: string,             // 0..1000
  slots: Date[],              // length 2..5; all > now()
}
```

Server validates application belongs to caller's org, no other active interview exists. Inserts `interviews` + N `interview_slots` rows in one transaction. `expiresAt = createdAt + 7 days`. Fires `send-interview-proposed` Trigger.dev task. Inserts `interview_proposed` notification for the candidate (try/catch — DB blip on notif insert won't poison the email send). Returns `{ interviewId }`.

### 4c. `interviews.confirmSlot({ interviewId, slotId })`

Visible to: the candidate.

Server validates `interview.status == 'proposed'`, `slot.interviewId == interviewId`, `slot.startsAt > now()`. Updates `status='confirmed', confirmedSlotId=slotId, updatedAt=now()`. Fires `send-interview-confirmed` task. Inserts `interview_confirmed` notif for both sides.

### 4d. `interviews.requestDifferentTime({ interviewId, message?: string })`

Visible to: the candidate. Server validates `interview.status == 'proposed'`. Does **not** change status. Sends `interview_time_requested` notification + email to employer. The employer's next move is `cancel` + `proposeSlots` again, or `reschedule` directly.

### 4e. `interviews.reschedule({ interviewId, ...same shape as proposeSlots minus applicationId })`

Role: `owner` | `admin` | `recruiter`.

Server validates `interview.status` is `proposed` or `confirmed`. In a single transaction:
1. Update old row → `status='canceled', cancelReason='rescheduled', canceledById=ctx.session.user.id, updatedAt=now()`.
2. Insert new `interviews` row + slots on the same `applicationId`.

Fires both `send-interview-canceled` (for the old) and `send-interview-proposed` (for the new) tasks. Returns `{ interviewId: <new id> }`.

### 4f. `interviews.cancel({ interviewId, reason?: string })`

Visible to: the candidate, OR `owner` | `admin` | `recruiter` on the owning org.

Server validates `interview.status` is `proposed` or `confirmed`. Updates `status='canceled', canceledById=ctx.session.user.id, cancelReason=reason ?? null`. Fires `send-interview-canceled` task; notifies the **opposite** side (i.e. if the candidate canceled, employer gets the notif).

### 4g. `interviews.todaysForOrg({ orgId })`

Visible to: any `org_members` row on `orgId`. Returns confirmed interviews where `confirmedSlot.startsAt` is today (server returns the UTC timestamp + duration; the client filters/renders in the viewer's browser TZ).

```ts
[{
  interviewId, candidateName, candidateAvatarUrl, candidateUserId,
  jobId, jobTitle,
  startsAt, durationMin,
  medium, details,
}]
```

Powers the `/employer` "Today's interviews" card.

---

## 5. Trigger.dev tasks

Six tasks in `code/trigger/`. Three crons + three fire-on-mutation.

### 5a. Crons

| File | Schedule | Action |
|---|---|---|
| `expire-stale-interview-proposals.ts` | `0 */6 * * *` (every 6h) | Update `interviews` rows `WHERE status='proposed' AND expiresAt < now()` to `status='expired'`. For each affected row: insert `interview_proposed` (with negative-tone copy? — actually use a fresh notif kind: `interview_proposed` already exists; we'll mint the email subject as "Interview proposal expired" and reuse the `interview_canceled` notif kind for the in-app entry, with body text reflecting expiry). Decision: **reuse `interview_canceled` kind for expiry too** — separate kind is over-engineering. |
| `complete-passed-interviews.ts` | `*/30 * * * *` (every 30min) | Update `interviews` rows `WHERE status='confirmed' AND confirmedSlotId IS NOT NULL AND (SELECT startsAt FROM interview_slots WHERE id = confirmedSlotId) + durationMin*'1 minute' < now()` to `status='completed'`. No notif (silent). |
| `send-interview-reminders.ts` | `0 * * * *` (hourly) | Find `interviews` `WHERE status='confirmed' AND remindedAt IS NULL AND (SELECT startsAt FROM interview_slots WHERE id = confirmedSlotId) BETWEEN now()+'23 hours' AND now()+'25 hours'`. For each: set `remindedAt=now()` first (best-effort idempotency), then send reminder email + `interview_reminder` notif to both sides. |

The expire cron uses the existing `interview_canceled` notification kind (reduces enum surface from 6 → 5). The email subject and body distinguish "canceled" vs. "expired" via copy.

### 5b. Fire-on-mutation

| File | Triggered by | Action |
|---|---|---|
| `send-interview-proposed.ts` | `proposeSlots`, `reschedule` (new side) | Email candidate (no `.ics` — no time confirmed yet) + ensure `interview_proposed` notif inserted (router already does the insert; this task only handles email). |
| `send-interview-confirmed.ts` | `confirmSlot` | Email both sides with `.ics` attachment + ensure `interview_confirmed` notifs inserted (router does insert; task only emails). |
| `send-interview-canceled.ts` | `cancel`, `reschedule` (old side), expire cron | Email opposite side + ensure `interview_canceled` notif inserted. Email body templated on the cancel reason: `'rescheduled'` → "We've sent updated times"; `null`/other → "{name} canceled the interview"; called from expire cron with sentinel reason `'expired'` → "The proposal has expired." |

All notif insertions wrapped in try/catch in the router (or task) per the established `send-application-email.ts` pattern.

---

## 6. Email templates (`src/emails/`)

Five new files. Each follows the existing `Html` + `Container` + `Heading` + `Button` pattern from `@react-email/components`. Brand color `#1CAAE2`. Lato families documented in CSS comment per existing templates.

| File | Recipient | Subject |
|---|---|---|
| `interview-proposed.tsx` | candidate | `Pick a time for your interview at {company}` |
| `interview-confirmed.tsx` | both (sent twice) | `Interview confirmed — {dayMonth} at {time}` |
| `interview-canceled.tsx` | opposite side | `Interview canceled` (or "Interview proposal expired" / "Interview rescheduled" via template prop) |
| `interview-reminder.tsx` | both (sent twice) | `Reminder: interview tomorrow at {time}` |
| `interview-time-requested.tsx` | employer | `{candidate} asked for a different interview time` |

All templates accept an `appUrl` prop and render their primary CTA as a deep link into the in-app surface (candidate → `/applications/{id}`, employer → `/employer/jobs/{jobId}/applicants?focus={appId}`).

The `.ics` attachment is added to **only** the confirmation email, server-side via Resend's `attachments: [{ filename, content }]` option — generated by the helper below.

---

## 7. `.ics` generation — `src/lib/ics.ts`

Hand-rolled, no dependency. ~50 LOC. Function signature:

```ts
export function buildInterviewIcs(input: {
  interviewId: string;
  startsAtUtc: Date;
  durationMin: number;
  jobTitle: string;
  companyName: string;
  proposerName: string;
  proposerEmail: string;
  candidateName: string;
  candidateEmail: string;
  notes?: string;
  details: string;        // location-ish payload per medium
}): string;
```

Output template:

```
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Energized//Interview//EN
METHOD:REQUEST
BEGIN:VEVENT
UID:{interviewId}@energized.biz
DTSTAMP:{nowUTC}
DTSTART:{slotUTC}
DTEND:{slotUTC + durationMin}
SUMMARY:Interview — {jobTitle} at {company}
DESCRIPTION:{notes ?? ''}
LOCATION:{details}
ORGANIZER;CN={proposerName}:mailto:{proposerEmail}
ATTENDEE;CN={candidateName};RSVP=TRUE:mailto:{candidateEmail}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR
```

CRLF line endings (RFC 5545 §3.1). Long-line folding deliberately skipped in v1 — payload is short and Gmail / Apple Calendar don't require folding for our line lengths. If Outlook complains we'll add folding.

UTC timestamps formatted as `YYYYMMDDTHHmmssZ` (basic format).

Special-character escaping for the `DESCRIPTION` and `LOCATION` fields (`\n` → `\\n`, `,` → `\\,`, `;` → `\\;`).

---

## 8. UI surfaces

Four touchpoints. Inline styles using existing `--v2-*` CSS variables; reuse `v2-btn` classes; reuse `Icon` component.

### 8a. Employer Kanban card — `src/app/(app)/employer/jobs/[id]/applicants/...`

Decorate cards in the **Interview** column based on the latest interview status (single tRPC call per page, hydrating a map keyed by `applicationId`):

- No active interview → small "Schedule interview" button.
- `proposed` → chip "Awaiting candidate · expires in {N}d" + "View" link.
- `confirmed` → chip "Confirmed · {dayMonth} {time}" + inline "Reschedule" / "Cancel" buttons.
- `canceled` / `expired` → chip plus "Re-propose" button.

Buttons disabled with pending styling during mutations.

### 8b. Employer applicant detail — full interview log

New section between cover note and pipeline stage controls, titled "Interviews".

**Schedule modal** (`<Dialog>` from existing shadcn primitive):
- Medium dropdown — Video / Phone / In person.
- Details input — placeholder changes per medium (`https://…` / `+1 555…` / `123 Main St`).
- Duration select — 15 / 30 / 45 / 60 / 90 / 120 min.
- Notes textarea (optional, 0–1000 chars).
- Slot rows — start with two `<input type="datetime-local">` inputs + "Add another slot" (max 5). Each row has a remove ✕. Min 2.
- Submit "Send proposal" → `proposeSlots` mutation. On success, modal closes, list re-fetches.

**List items** (newest first):
- Status badge.
- Slot list, chosen slot bolded if `confirmed`.
- Medium icon + details preview.
- Notes (if any).
- Action row: Cancel · Reschedule (opens modal pre-populated) · "Schedule next round" (only on the most recent interview when `completed`).

### 8c. `/employer` dashboard — "Today's interviews" card

New section in the dashboard layout, alongside Inbox / Stale alerts (between KPI strip and pipeline-by-job table). Powered by `interviews.todaysForOrg`.

- Header: "Today's interviews" + count badge.
- Empty state: "No interviews scheduled today."
- Each row: candidate avatar (40px) + name (link to `/employer/jobs/{jobId}/applicants?focus={appId}`) · job title (subdued) · `{startTime} ({TZ})` · medium icon · "Join" button (video) or details inline.

Times rendered client-side using `Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' })` to avoid SSR/TZ mismatch.

### 8d. Candidate `/applications/{id}` detail

New section "Upcoming interviews" between the application status block and any other detail blocks.

- `proposed` state — "Pick a time" panel: each slot is a button labeled e.g. "Tue, May 6 · 2:00 PM"; below the slots, a "None of these work — request a different time" link opens a textarea + send button (`requestDifferentTime` mutation).
- `confirmed` state — confirmation card: date/time, medium icon + "Join meeting" / "Call" / address, "Add to calendar (.ics)" download button (calls a small `/api/interviews/{id}/ics` route), "Cancel" link with `confirm()` dialog.
- `canceled` / `expired` state — small grey card. The employer's next action will create a new card.

---

## 9. Edge cases (server-validated)

- **Stale slots picked**: candidate's browser is showing slot list while employer reschedules → candidate's `confirmSlot` returns `BAD_REQUEST` "This proposal is no longer active." UI invalidates the query and re-renders new state.
- **Slot already in the past**: `confirmSlot` checks `slot.startsAt > now()`. If false → `BAD_REQUEST` "That time has already passed."
- **Race on cancel + confirm**: last write wins; the loser gets `BAD_REQUEST` and the UI refetches.
- **Application moved out of `interview` stage**: interviews stay in their current status — no auto-cancel. Employer can cancel manually.
- **Application deleted**: cascades — interviews and slots go with it via FK.
- **Org member loses role mid-flight**: `protectedProcedure` re-checks role on every mutation. Former recruiter gets `FORBIDDEN`.
- **Reminder duplicates**: cron sets `remindedAt` *before* sending. If Resend fails after the update, no reminder fires next tick — acceptable v1 (we log the error and the operator can re-send manually if needed).
- **Completion cron fires while `confirmed` interview has no `confirmedSlotId`**: shouldn't happen by invariant; cron WHERE clause includes `AND confirmedSlotId IS NOT NULL` to guard.

---

## 10. Migration + ordering

1. **Migration `0018_add_interviews.sql`** (drizzle-kit generate) — `interview_medium` enum, `interview_status` enum, `interviews` table, `interview_slots` table, indexes, and 5 new values added to `notification_kind`: `interview_proposed`, `interview_confirmed`, `interview_canceled`, `interview_reminder`, `interview_time_requested`. The `interview_canceled` kind is shared by both the cancel mutation and the expire cron — expiry copy is differentiated only at the email-template layer, not via a separate enum value.
2. **Schema file `src/server/db/schema/interviews.ts`** (with relations) — re-exported from `schema/index.ts`.
3. **`src/lib/ics.ts`** helper.
4. **tRPC router `src/server/api/routers/interviews.ts`** — wire into `appRouter` in `src/server/api/root.ts`.
5. **5 Email templates** in `src/emails/`.
6. **6 Trigger.dev tasks** in `code/trigger/`.
7. **UI surfaces** — applicant detail "Interviews" section + scheduling modal first, then Kanban card decoration, then `/employer` "Today's interviews" card, then candidate `/applications` block.
8. **`/api/interviews/{id}/ics` route** (Node runtime). Handler: `getSession()`-guard → load interview + confirmed slot + application → assert caller is the application's candidate OR an `org_member` on the owning org → call `buildInterviewIcs(...)` → return `200` with `Content-Type: text/calendar; charset=utf-8` and `Content-Disposition: attachment; filename="interview-{shortId}.ics"`.
9. **Middleware** — no change (existing `/applications`, `/employer` prefixes already cover the surfaces).
10. **Memory update** — `feature_state_2026_04_27.md`: move "interview scheduling" from blocked → shipped batch.

No data backfill — historical applications never had interviews.

---

## 11. Acceptance criteria

- [ ] Employer with `recruiter` or higher role can propose 2–5 slots from the applicant detail. Email lands in candidate's inbox with deep link.
- [ ] Candidate can pick a slot from `/applications/{id}`. Both sides receive a confirmation email with a working `.ics` attachment that imports cleanly into Gmail and Apple Calendar (smoke-test by hand).
- [ ] Either side can cancel; the other side gets an email + in-app notif.
- [ ] Employer can reschedule from a `confirmed` interview; the candidate receives both a cancel notification and a new proposal email.
- [ ] Candidate can request a different time without confirming any of the offered slots; employer receives notif + email.
- [ ] After the slot's end time passes (slot.startsAt + durationMin), the cron flips status to `completed` within ~30 minutes.
- [ ] If the candidate doesn't respond in 7 days, the proposal flips to `expired`; employer is notified.
- [ ] 24h before a confirmed interview, both sides get a reminder email; same interview never reminds twice (idempotency check).
- [ ] `/employer` shows a "Today's interviews" card listing only today's confirmed interviews in the viewer's browser TZ.
- [ ] All times rendered in viewer TZ; emails include the IANA TZ name; underlying storage is UTC.
