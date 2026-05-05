# Intro Requests

**Status:** Design accepted 2026-05-05
**Scope:** Bilateral employer ↔ jobseeker intro request flow off the public profile page (`/p/[id]`). An employer or recruiter clicks "Request intro," writes an optional short note, and the candidate sees the request in-app and via email. The candidate accepts or declines. On accept, the requesting org gets the candidate's contact info (email, phone, resume URL) on the same page. New `intro_requests` table, new `intro_request_status` enum, three additions to the existing `notification_kind` enum, new `introRequests` tRPC router, two new email templates, two fire-on-mutation Trigger.dev tasks (in `code/trigger/`), four UI surfaces.
**Out of scope:** Per-field unlock opt-in (request gives all-or-nothing access to the contact triple), expiry cron (`expiresAt` is written but not enforced — deferred to v1.1), threaded messaging (the optional note at request time is one-shot, no candidate reply), per-org daily caps, "report harassment" flow, harassment-mute on the candidate side, calendar-style scheduling on top of an accepted intro, AI suggestions on who to request, tests (deferred per established pattern).

---

## 1. Goal

The "Request intro" CTA on the public profile page (`/p/[id]`) at [public-profile-client.tsx:281](../../src/app/p/[id]/public-profile-client.tsx:281) and the sticky mobile mirror at [:551](../../src/app/p/[id]/public-profile-client.tsx:551) is currently `disabled` with `title="Coming soon"`. The on-page copy already commits to a product story:

- "Contact details are never exposed to visitors — verified employers must request an intro." ([:268](../../src/app/p/[id]/public-profile-client.tsx:268))
- "Contact info is hidden until {firstName} accepts your intro request." ([:298](../../src/app/p/[id]/public-profile-client.tsx:298))
- "Verified employers can request an intro." ([:316](../../src/app/p/[id]/public-profile-client.tsx:316))

This work delivers that flow. An authed `org_members` row holder (any role: `owner | admin | recruiter`) can request an intro from any non-employer user's public profile. The candidate sees the request in their dashboard inbox and via email. They accept or decline. On accept, the requesting org sees `user.email`, `profiles.phone`, and `profiles.resumeUrl` (when present) on the public profile + on a new "Intro requests" page in the employer dashboard.

Decisions from brainstorming (2026-05-05):

- **Senders:** any authed user with an active `org_members` row (employer, admin, or recruiter seat).
- **Pairing rule:** at most one `pending` row per `(orgId, candidateUserId)`.
- **Cooldown:** after a `declined` row, the same `(orgId, candidateUserId)` pair cannot create a new request for 30 days.
- **Cancel:** if the requester cancels their own pending request, the dedup/cooldown clock is *not* started — they may re-request immediately.
- **Unlock fields:** email + phone + resume URL, all-or-nothing on accept. Fields that are blank on the candidate's profile just don't render.

---

## 2. Data model

One new table in `src/server/db/schema/intro-requests.ts` (with relations re-exported from `src/server/db/schema/index.ts`). Migration adds one new enum and 3 new values to the existing `notification_kind` enum.

### 2a. `intro_requests`

```ts
{
  id: uuid PK
  orgId: uuid FK -> employer_orgs.id (cascade delete)
  candidateUserId: text FK -> user.id (cascade delete)
  requestedByUserId: text FK -> user.id (set null on user delete)

  message: text                                  // optional, 0..1000 chars

  status: 'pending' | 'accepted' | 'declined' | 'canceled' | 'expired'
                                                 // new enum: intro_request_status

  acceptedAt: timestamp                          // set on candidate accept
  declinedAt: timestamp                          // set on candidate decline; drives cooldown
  canceledAt: timestamp                          // set on requester cancel

  expiresAt: timestamp NOT NULL                  // createdAt + 14 days; reserved for v1.1 cron

  createdAt: timestamp NOT NULL DEFAULT now()
  updatedAt: timestamp NOT NULL DEFAULT now()
}
```

Indexes:

- `(orgId, candidateUserId, status)` — backs both the pairing dedup check and the cooldown lookup. Single composite index is enough for both because the dedup query is `status='pending'` and the cooldown query is `status='declined' AND declinedAt > now() - interval '30 days'`; both are leftmost-prefixed by `(orgId, candidateUserId)`.
- `(candidateUserId, status, createdAt desc)` — candidate inbox query.
- `(orgId, status, createdAt desc)` — org-side list query.
- `(status, expiresAt)` — reserved for v1.1 expiry cron; cheap to add now and avoids a follow-up migration.

### 2b. Notification enum additions

`notification_kind` gets 3 new values, additive (no breaking changes):

- `intro_requested` — sent to the candidate when an org requests an intro.
- `intro_accepted` — sent to the requester when the candidate accepts.
- `intro_declined` — sent to the requester when the candidate declines.

(No notif on cancel — the candidate may not have seen the request yet, and surfacing "X canceled their request" reads as creepy.)

---

## 3. State machine

```
                ┌───────────┐
                │  pending  │  ← created by introRequests.create
                └─────┬─────┘
                      │
   ┌──────────────────┼──────────────────┬──────────────┐
   │                  │                  │              │
   ▼                  ▼                  ▼              ▼
accepted          declined           canceled      (expired)
(acceptForMe)     (declineForMe)     (cancel)      [cron, v1.1]
   │                  │
   ▼                  ▼
contact          cooldown 30d
unlocked         on (orgId,
for org          candidateUserId)
                 then create
                 allowed again
```

**Invariants enforced server-side:**

- `create` rejects with `BAD_REQUEST "An intro request is already pending"` if any row exists for `(orgId, candidateUserId)` with `status='pending'`.
- `create` rejects with `BAD_REQUEST "This candidate declined a recent request — try again after {date}"` if any row exists for `(orgId, candidateUserId)` with `status='declined' AND declinedAt > now() - interval '30 days'`.
- `create` rejects with `BAD_REQUEST "You can't request an intro from an employer account"` if the candidate's `user.role === 'employer'`.
- `create` rejects with `BAD_REQUEST "You can't request an intro from yourself"` if `candidateUserId === ctx.session.user.id`.
- `cancel` only valid while `status='pending'`. Sets `canceledAt`, status → `canceled`. Does NOT prevent a later re-request (cancel does not start a cooldown).
- `acceptForMe`/`declineForMe` only valid while `status='pending'` AND `candidateUserId === ctx.session.user.id`.
- `contactForCandidate` returns `{ unlocked: false }` unless an `accepted` row exists for `(orgId, candidateUserId)`. There is no expiry on the unlock — once accepted, always unlocked for that org.

---

## 4. tRPC router (`introRequests`)

New file `src/server/api/routers/intro-requests.ts`. All `protectedProcedure`. Org-membership gating uses the same `org_members` lookup pattern already in [interviews.ts:52–66](../../src/server/api/routers/interviews.ts:52). A small helper `requireOrgMembership(ctx)` lives at the top of the new router file, returns `{ orgId, role }`, and throws `FORBIDDEN` if the caller has no active `org_members` row.

Wired into `appRouter` as `introRequests` in `src/server/api/root.ts` alongside the existing `interviews` line.

### 4a. `introRequests.create({ candidateUserId, message? })`

Caller: any active `org_members` row.

```ts
input: {
  candidateUserId: string,    // user.id, not profile.id
  message?: string,            // 0..1000 chars; trimmed; '' becomes null
}
```

Server checks (in this order, fail-fast):

1. `requireOrgMembership(ctx)` → `{ orgId }`.
2. Self-request guard.
3. Candidate exists and `user.role !== 'employer'` (mirrors the existing 404 guard on the public profile page itself).
4. Pending dedup: no existing `pending` row for `(orgId, candidateUserId)`.
5. Cooldown: no `declined` row for `(orgId, candidateUserId)` with `declinedAt > now() - interval '30 days'`.

Insert one row with `status='pending'`, `expiresAt = now() + interval '14 days'`. Insert one `intro_requested` notification for the candidate (try/catch — DB blip on notif insert won't poison the email send, matching the `send-application-email` pattern). Fire `send-intro-requested` Trigger.dev task. Return `{ introRequestId }`.

### 4b. `introRequests.cancel({ id })`

Caller: any active `org_members` row whose `orgId` matches the request's `orgId`.

Server validates `status='pending'`. Updates `status='canceled', canceledAt=now(), updatedAt=now()`. No emails, no notifs. Returns void.

### 4c. `introRequests.listForOrg({ status?, limit? })`

Caller: any active `org_members` row.

```ts
input: {
  status?: 'pending' | 'accepted' | 'declined' | 'canceled' | 'all',  // default 'pending'
  limit?: number,                                                        // default 50, max 200
}
```

Joins `intro_requests` → `user` (candidate) → `profiles` (for headline + image fallback) and returns:

```ts
[{
  id, status, message,
  candidate: { id, name, image, headline, location },
  requestedBy: { id, name },
  createdAt, acceptedAt, declinedAt, canceledAt,
}]
```

Ordered `createdAt DESC`. Powers the "Intro requests" page in the employer dashboard.

### 4d. `introRequests.contactForCandidate({ candidateUserId })`

Caller: any active `org_members` row.

Returns:

```ts
| { unlocked: false }
| { unlocked: true,
    email: string,
    phone: string | null,
    resumeUrl: string | null,
    resumeFilename: string | null,
    acceptedAt: Date }
```

`unlocked: true` iff an `accepted` row exists for `(orgId, candidateUserId)`. The `email` field comes from `user.email`. Phone and resume from `profiles`. **Resume URL is returned as-is** — the existing `uploadResume` helper in `src/lib/blob.ts` writes blobs with `access: "public"` (CLAUDE.md §14), so the URL is a public-but-unguessable string. A future v1.5 work item is to migrate to private blobs + per-request signed URLs (CLAUDE.md §19 aspiration); not in scope here.

### 4e. `introRequests.pendingFromMyOrg({ candidateUserId })`

Caller: any active `org_members` row. Drives the public profile button state machine.

Returns one of:

```ts
| { state: 'idle' }
| { state: 'pending',  requestId: string,  createdAt: Date }
| { state: 'accepted', requestId: string,  acceptedAt: Date }
| { state: 'declined-cooldown', daysRemaining: number, retryAt: Date }
| { state: 'declined-can-retry' }
```

Resolution order: any `pending` → `pending`. Else any `accepted` → `accepted` (most recent). Else most recent `declined`: if `declinedAt > now() - 30d` → `declined-cooldown` with `retryAt = declinedAt + 30d`; else `declined-can-retry`. Else `idle`. Canceled and expired rows are ignored.

### 4f. `introRequests.inboxForMe({ status? })`

Caller: any authenticated user. Returns only rows where `candidateUserId === ctx.session.user.id`.

```ts
input: {
  status?: 'pending' | 'accepted' | 'declined' | 'all',  // default 'pending'
}
```

Joins through `employer_orgs` to render org name + logo. Returns:

```ts
[{
  id, status, message,
  org: { id, name, logoUrl },
  requestedBy: { name, role },
  createdAt, acceptedAt, declinedAt,
}]
```

### 4g. `introRequests.acceptForMe({ id })`

Caller: protected; row's `candidateUserId` must equal `ctx.session.user.id`. Validates `status='pending'`. Updates `status='accepted', acceptedAt=now()`. Inserts one `intro_accepted` notif for the **requester** (`requestedByUserId`) if non-null; if null (requester left the org), falls back to the org owner — pattern matches `interviews.requestDifferentTime` at [interviews.ts:417–432](../../src/server/api/routers/interviews.ts:417). Fires `send-intro-accepted` task. Returns void.

### 4h. `introRequests.declineForMe({ id })`

Caller: protected; row's `candidateUserId` must equal `ctx.session.user.id`. Validates `status='pending'`. Updates `status='declined', declinedAt=now()`. Inserts `intro_declined` notif for the requester. **No email** (intentional, per Q2 design — keeps decline private to avoid harassment dynamics). Returns void.

---

## 5. Trigger.dev tasks

Two fire-on-mutation tasks in `code/trigger/` (matching the existing `send-interview-*` pattern in that directory). **No crons in v1** — expiry is deferred.

### 5a. `send-intro-requested.ts`

Triggered by: `introRequests.create`.

Action: load the candidate's email + name and the requesting org's name, render `intro-requested.tsx` (see §6), send via Resend. `intro_requested` notif insertion is the router's responsibility; this task only emails. On Resend error, throws — Trigger.dev's default retry/backoff applies.

### 5b. `send-intro-accepted.ts`

Triggered by: `introRequests.acceptForMe`.

Action: resolve the recipient as **requester first, org owner fallback** — same single-recipient pattern the in-app notif uses (§4g). Render `intro-accepted.tsx` and send. Owner fallback lookup joins `org_members` filtered by `role='owner'`, matching [interviews.ts:367–371](../../src/server/api/routers/interviews.ts:367).

### 5c. (No task for decline / cancel / expiry)

By design.

---

## 6. Email templates (`src/emails/`)

Two new files. Each follows the existing `Html` + `Container` + `Heading` + `Button` pattern from `@react-email/components`. Brand color `#1CAAE2`. Lato families documented in CSS comment per existing templates.

| File | Recipient | Subject |
|---|---|---|
| `intro-requested.tsx` | candidate | `{Org} would like an intro on Energized` |
| `intro-accepted.tsx` | org owner + requester | `{Candidate} accepted your intro request — contact unlocked` |

Both templates accept an `appUrl` prop and render their primary CTA as a deep link:

- candidate (`intro-requested`) → `/dashboard#intros` (anchor scrolls to the new "Intros" card; falls back to top of dashboard if anchor isn't found).
- org (`intro-accepted`) → `/employer/intro-requests?focus={requestId}` (the new page; see §8c).

Body content:

- `intro-requested.tsx`: short paragraph "{requesterName} at {orgName} would like to be introduced to you." If `message` is non-null, render it as a blockquote. CTA: "Review request." Footer: "You can decline anytime — your contact info stays hidden until you accept."
- `intro-accepted.tsx`: short paragraph "{candidateName} accepted your intro request. You can now see their contact info." CTA: "Open candidate." No `.ics`, no attachments.

---

## 7. UI surfaces

Four touchpoints. Inline styles use existing `--v2-*` CSS variables; reuse `v2-btn` classes; reuse `Icon` component.

### 7a. Public profile (`src/app/p/[id]/public-profile-client.tsx`)

The CTA stack at lines 273–320 (desktop sidebar) and the sticky mobile mirror at lines 540–570 are the entry points. Both replace the current `disabled` button with state-driven UI powered by a new `useIntroRequestState(candidateUserId, viewerIsOrgMember)` hook that wraps `api.introRequests.pendingFromMyOrg.useQuery`.

State table:

| `pendingFromMyOrg.state` | Primary button | Secondary content |
|---|---|---|
| `idle` | "Request intro" enabled → opens **Request modal** (see below) | unchanged shortlist button |
| `pending` | "Intro requested" disabled, with subdued chip "{daysAgo}d ago" | "Cancel request" link → `cancel` mutation |
| `accepted` | "Contact unlocked" → toggles inline `<ContactPanel>` (see below) | unchanged shortlist button |
| `declined-cooldown` | "Request unavailable" disabled with `title="Available again on {retryAt}"` | unchanged shortlist button |
| `declined-can-retry` | same as `idle` | same as `idle` |

For authed viewers who are NOT org members (e.g. another jobseeker), the entire intro-request CTA stack is hidden and replaced with a small "Hiring on Energized? [Sign up as an employer]" link.

**Request modal** (uses existing shadcn `Dialog`):

- Heading: "Request an intro with {firstName}"
- Optional textarea (0–1000 chars, character counter): placeholder "Add a short note — what's the role, what caught your eye? (optional)"
- Submit button: "Send intro request" → `create` mutation. On success, modal closes, `pendingFromMyOrg` query refetches, button flips to `pending` state.

**ContactPanel** (rendered inline beneath the CTA stack when `accepted`):

- Driven by `api.introRequests.contactForCandidate.useQuery({ candidateUserId })`, only enabled while the page is in `accepted` state.
- Shows email (always — `user.email` is non-null), then phone if non-null, then resume row if `resumeUrl` non-null. Each field has a small "Copy" button + `mailto:` / `tel:` / direct download anchor.
- Sub-line: "Unlocked for {orgName} on {acceptedAt}."

### 7b. Candidate dashboard (`src/app/(app)/dashboard/page.tsx`)

New "Intros" card alongside the existing "Interviews this week" card. Card body:

- Powered by `api.introRequests.inboxForMe.useQuery({ status: 'pending' })`.
- Empty state: "No intro requests yet."
- Each row: org logo (32px) + name, requester name + role, `createdAt` relative ("3h ago"), inline Accept / Decline buttons. Clicking the row body (not buttons) expands an inline panel showing the optional `message` if non-null.
- Anchor `id="intros"` on the card so the email deep link works.

Accept and decline are wired to `acceptForMe` / `declineForMe`. Optimistic UI removes the row on success; on failure (e.g. someone canceled in between), refetches.

### 7c. Employer "Intro requests" page (`src/app/(app)/employer/intro-requests/page.tsx`)

New page in the employer area. Tabs: Pending / Accepted / Declined / All. Each tab calls `listForOrg` with the corresponding status filter.

Each row: candidate avatar + name (link to `/p/{candidateUserId}`), requester name, status badge, message preview (first 80 chars + "…"), timestamps. Click expands the row to show the full message and (for `accepted`) an inline `<ContactPanel>` (same component as the public profile, just rendered without the toggle).

Cancel button on `pending` rows.

Add a nav entry to the existing employer nav (wherever `/employer/jobs` and `/employer/profile` sit).

### 7d. `?focus={requestId}` deep-linking on the employer page

When the email CTA lands on `/employer/intro-requests?focus={id}`, the page scrolls to the row with that id and auto-expands it. Implemented by reading `useSearchParams()` in a small client wrapper that scrolls + sets an open-row state on mount.

---

## 8. PostHog events

Wire through the existing `posthog.ts` server client. Event names match the `domain.action.result` taxonomy in CLAUDE.md §16.

- `intro.requested` — fired in `create` mutation. Properties: `orgId`, `candidateUserId`, `hasMessage` (bool).
- `intro.accepted` — fired in `acceptForMe`. Properties: `orgId`, `candidateUserId`, `daysToDecision`.
- `intro.declined` — fired in `declineForMe`. Same properties as `accepted`.
- `intro.canceled` — fired in `cancel`. Properties: `orgId`, `candidateUserId`, `daysSinceRequest`.
- `intro.contact_unlocked.viewed` — fired client-side when the `<ContactPanel>` first mounts in `accepted` state for a given request id (deduped per session via a `Set` in component state). Properties: `orgId`, `candidateUserId`, `requestId`.

---

## 9. Edge cases (server-validated)

- **Race on accept / cancel:** candidate clicks Accept while requester clicks Cancel. Last write wins; whichever loses gets `BAD_REQUEST "This request is no longer pending"` and the UI refetches.
- **Candidate deletes account:** cascades — all their `intro_requests` rows go with them via FK.
- **Requester leaves the org:** `requestedByUserId` set-null. `acceptForMe` still works; only the owner is emailed (see §5b).
- **Org deleted:** cascades — all rows go.
- **Stale "pending" UI:** if the candidate accepts while the requester is looking at a stale "pending" state, `pendingFromMyOrg` will resolve to `accepted` on next refetch. We invalidate `pendingFromMyOrg` and `contactForCandidate` after every mutation on either side.
- **Same org member requests, different member tries to cancel:** allowed — `cancel` is org-level, not user-level. Matches the pattern that org members act on behalf of their org.
- **Candidate has no profile row:** the public profile page would 404 before reaching the button, so this is unreachable from the request creation path. `contactForCandidate` defensively reads phone/resume via a left join; missing profile row → both null.
- **Concurrent duplicate `create` calls (e.g. rapid double-click):** the first call inserts a `pending` row; the second hits the dedup check and gets `BAD_REQUEST`. Acceptable — the UI also disables the button while the mutation is pending.
- **`expiresAt` reached without a cron:** v1 ignores it. Pending rows simply stay pending. Acceptable trade-off for v1; cron lands in a small follow-up.

---

## 10. Migration + ordering

1. **Migration `0020_<auto-name>.sql`** (drizzle-kit generate) — new `intro_request_status` enum, `intro_requests` table, four indexes, and 3 new values added to `notification_kind`: `intro_requested`, `intro_accepted`, `intro_declined`.
2. **Schema file `src/server/db/schema/intro-requests.ts`** (with relations to `user`, `employerOrgs`) — re-exported from `schema/index.ts`.
3. **tRPC router `src/server/api/routers/intro-requests.ts`** — wire into `appRouter` in `src/server/api/root.ts` as `introRequests`.
4. **Two email templates** in `src/emails/` (`intro-requested.tsx`, `intro-accepted.tsx`).
5. **Two Trigger.dev tasks** in `code/trigger/` (`send-intro-requested.ts`, `send-intro-accepted.ts`).
6. **UI surfaces** in this order:
   1. Replace the disabled buttons in `public-profile-client.tsx` with the state-machine UI + Request modal + `<ContactPanel>` component.
   2. New `<IntrosCard>` on `/dashboard`.
   3. New `/employer/intro-requests` page + nav entry.
7. **PostHog events** wired in mutations and `<ContactPanel>` mount.
8. **Memory update** — `feature_state_2026_04_27.md`: add "Intro requests" to the shipped batch.

No data backfill — historical state is "no requests."

---

## 11. Acceptance criteria

- [ ] Authed user with an active `org_members` row, viewing a non-employer public profile, sees "Request intro" enabled. A jobseeker viewer sees no intro CTA at all.
- [ ] Clicking the button opens a modal with an optional 0–1000 char message and a "Send intro request" submit. On success, the button flips to "Intro requested · Cancel" without a page reload.
- [ ] The candidate receives an in-app notification of kind `intro_requested` and an email "{Org} would like an intro on Energized" with a deep link to `/dashboard#intros`. The message (if non-null) appears in the email body.
- [ ] The candidate's `/dashboard` shows an "Intros" card with the pending request, the requester's note expanded inline, and Accept / Decline buttons.
- [ ] On accept, the candidate's UI removes the row optimistically. The requester receives an in-app `intro_accepted` notif and an email with a deep link to `/employer/intro-requests?focus={id}`. If the requester has left the org, the org owner gets the notif + email instead.
- [ ] After accept, the public profile page (in the same org's session) shows "Contact unlocked" with email, phone, and resume link inline. Phone and resume rows simply do not render if those fields are null on the candidate's profile.
- [ ] On decline, the requester receives an `intro_declined` in-app notif but no email. The button on the public profile flips to "Request unavailable" disabled with a tooltip showing the retry date. After 30 days, the same org can request again.
- [ ] On cancel (requester clicks "Cancel request" while pending), the request flips to `canceled`, the candidate gets no further notifications, and the requesting org may issue a fresh request immediately.
- [ ] A second `create` from the same `(org, candidate)` while a pending row exists returns `BAD_REQUEST "An intro request is already pending"`.
- [ ] An employer viewing their own profile (impossible in product, but defensive) cannot create a self-request: `BAD_REQUEST "You can't request an intro from yourself"`.
- [ ] All five PostHog events fire with correct properties.
- [ ] `unlocked: false` is returned by `contactForCandidate` from any other org, even after one org has accepted access.
