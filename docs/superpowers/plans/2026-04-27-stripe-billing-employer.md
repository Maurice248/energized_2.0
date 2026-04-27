# Stripe Billing — Employer Subscriptions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Take real money from employers via three monthly subscription tiers (A: $299/1 job, B: $549/3 jobs, C: $749/5 jobs CAD), gate `jobs.publish` on an active subscription with quota enforcement, and let employers self-serve via Stripe Customer Portal + a custom cancellation modal that captures their disposition for live roles.

**Architecture:** Stripe Customer + Subscription per `employer_orgs` row. Subscription state mirrored locally on the org via webhook (`stripeCustomerId`, `stripeSubscriptionId`, `subscriptionStatus`, `currentPeriodStart`, `planRenewsAt`, `cancelAtPeriodEnd`, `cancellationDisposition`). `plan` column is repurposed as the tier identifier. New billing tRPC router exposes `createCheckoutSession`, `createPortalSession`, `cancel`, `getCurrent`. Job publish gate checks plan + counts published jobs in the current Stripe billing window.

**Tech Stack:** Stripe v2026-03-25.dahlia (already in deps), Next.js App Router (webhook is Node runtime, raw body), Drizzle, tRPC.

**Spec source:** Sections 1–3 of the conversation above.

**Decisions locked:**
- Quota window: Stripe billing period
- Enforcement: hard block + upgrade prompt modal
- Drafts don't count
- On cancel: ask employer "close immediately" or "wait until period ends"
- No free tier
- Existing pre-billing published jobs grandfathered

---

## File structure

**New files**
- `src/lib/stripe.ts` — Stripe SDK wrapper + helpers
- `src/lib/billing-tiers.ts` — tier definitions (label, price, quota, env price-id mapping)
- `src/server/api/routers/billing.ts` — tRPC procedures
- `src/app/(app)/employer/profile/billing-section.tsx` — client section replacing the current placeholder
- `docs/superpowers/notes/stripe-setup.md` — operator setup checklist (create products, paste price IDs into env, configure webhook)

**Modified files**
- `src/env.ts` — add 5 Stripe env vars
- `src/server/db/schema/employer-orgs.ts` — add 6 new columns
- `src/server/db/migrations/0013_*.sql` — generated
- `src/server/db/schema/enums.ts` — `subscription_status` enum
- `src/app/api/stripe/webhook/route.ts` — extend to write to DB
- `src/server/api/routers/jobs.ts` — gate `publish` on subscription + quota
- `src/server/api/routers/employer.ts` — return billing fields from `getMyOrg`
- `src/server/api/root.ts` — register billing router
- `src/app/(app)/employer/profile/employer-profile-client.tsx` — replace placeholder with `<BillingSection />`
- `src/app/(app)/employer/jobs/[id]/edit/job-wizard-client.tsx` — handle `BILLING_REQUIRED` / `QUOTA_EXCEEDED` errors with upgrade prompt

---

## Task 1: Env vars

Add `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PACKAGE_A/B/C` to `src/env.ts`. All optional in dev so the codebase still typechecks/runs without Stripe configured.

## Task 2: Schema additions

Add to `enums.ts`: `subscriptionStatusEnum` with values `none / active / trialing / past_due / canceled / incomplete / incomplete_expired / unpaid`.

Add to `employerOrgs`:
- `stripeCustomerId text` (nullable, unique)
- `stripeSubscriptionId text` (nullable)
- `subscriptionStatus subscriptionStatusEnum` (default `none`)
- `currentPeriodStart timestamp` (nullable)
- `cancelAtPeriodEnd boolean default false`
- `cancellationDisposition text` (nullable: `close_immediate` | `close_at_period_end`)

Existing `plan text` becomes the tier id (`none` | `package_a` | `package_b` | `package_c`). Existing `planRenewsAt` is reused as `currentPeriodEnd` — no rename needed; comment in schema.

Generate + apply migration.

## Task 3: Billing tiers + Stripe lib

`src/lib/billing-tiers.ts`:

```ts
import { env } from "@/env";

export type PlanTier = "package_a" | "package_b" | "package_c";

export const TIERS: Record<PlanTier, {
  label: string;
  priceCents: number;
  jobsPerCycle: number;
  stripePriceId: string | undefined;
  features: string[];
}> = {
  package_a: {
    label: "Package A",
    priceCents: 29900,
    jobsPerCycle: 1,
    stripePriceId: env.STRIPE_PRICE_PACKAGE_A,
    features: ["1 published role per billing cycle", "Full applicant pipeline", "Branded company page"],
  },
  package_b: {
    label: "Package B",
    priceCents: 54900,
    jobsPerCycle: 3,
    stripePriceId: env.STRIPE_PRICE_PACKAGE_B,
    features: ["3 published roles per billing cycle", "Everything in Package A"],
  },
  package_c: {
    label: "Package C",
    priceCents: 74900,
    jobsPerCycle: 5,
    stripePriceId: env.STRIPE_PRICE_PACKAGE_C,
    features: ["5 published roles per billing cycle", "Everything in Package B"],
  },
};

export function tierFromPriceId(priceId: string): PlanTier | null {
  for (const [key, t] of Object.entries(TIERS)) {
    if (t.stripePriceId === priceId) return key as PlanTier;
  }
  return null;
}
```

`src/lib/stripe.ts`:

```ts
import Stripe from "stripe";
import { env } from "@/env";

export const STRIPE_ENABLED = Boolean(env.STRIPE_SECRET_KEY);

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!env.STRIPE_SECRET_KEY) {
      throw new Error("Stripe not configured: STRIPE_SECRET_KEY missing.");
    }
    _stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-03-25.dahlia",
    });
  }
  return _stripe;
}
```

## Task 4: Billing router

`src/server/api/routers/billing.ts`:

- `getCurrent` query → returns `{ plan, status, currentPeriodEnd, cancelAtPeriodEnd, cancellationDisposition, jobsPublishedThisPeriod, quota }` for the current org
- `createCheckoutSession({ tier })` mutation → creates Stripe Customer if missing on the org, stores `stripeCustomerId`, returns Stripe Checkout URL with `subscription_data.metadata.orgId`, success/cancel URLs back to `/employer/profile?billing=success|cancelled`
- `createPortalSession()` mutation → returns Stripe Portal URL
- `cancel({ disposition })` mutation → updates Stripe sub with `cancel_at_period_end: true`, writes `cancellationDisposition` to org. If `close_immediate`: also closes all currently-published jobs for the org locally (sets `status='closed'`, `closedAt=now`). Stripe still bills until period end (Stripe terms; we just don't let them post anything new and we close their live roles).

Permissions: any active org member can read; only owner/admin can checkout/cancel/portal.

## Task 5: Webhook → DB sync

Extend `src/app/api/stripe/webhook/route.ts` to handle:

- `customer.subscription.created` / `customer.subscription.updated`:
  - Resolve org by `stripeCustomerId` lookup
  - Pull `tier` from the first item's `price.id` via `tierFromPriceId`
  - Update org: `plan`, `subscriptionStatus`, `stripeSubscriptionId`, `currentPeriodStart`, `planRenewsAt` (= `current_period_end`), `cancelAtPeriodEnd`
- `customer.subscription.deleted`:
  - Read org's `cancellationDisposition`
  - If `close_at_period_end`: close all org's published jobs now (we're past period end at this event)
  - If `close_immediate`: jobs were already closed when cancel was triggered; just update org state
  - Set `plan='none'`, `subscriptionStatus='canceled'`, clear `stripeSubscriptionId`, `cancelAtPeriodEnd=false`, `cancellationDisposition=null`

PostHog events stay.

## Task 6: Quota gate in `jobs.publish`

Before the existing missing-fields check in `publish`:
1. Load the org row
2. If `plan === 'none'` or `subscriptionStatus !== 'active'` → throw `TRPCError({ code: "FORBIDDEN", message: "BILLING_REQUIRED" })`
3. Count published jobs where `publishedAt >= currentPeriodStart AND publishedAt < planRenewsAt` (excludes grandfathered jobs published before subscription)
4. If `count >= TIERS[plan].jobsPerCycle` → throw `TRPCError({ code: "FORBIDDEN", message: "QUOTA_EXCEEDED:N/M" })` (encoding similar to MISSING_FIELDS)
5. Proceed with existing publish logic

## Task 7: Profile billing section UI

Create `src/app/(app)/employer/profile/billing-section.tsx` (client). Three states based on `getCurrent()`:

- **No plan**: 3 tier cards side-by-side, each with label / price / quota / features / Subscribe button → `createCheckoutSession` → redirect to URL
- **Active plan**: current tier card with usage bar (`{published} of {quota} jobs this cycle`), period end date, Manage billing button → `createPortalSession`, Cancel link → opens cancel modal
- **Cancellation pending** (`cancelAtPeriodEnd`): banner saying "Plan ends {date}" + "Re-activate" button (calls Stripe via portal)

Cancel modal asks: "Keep live roles until {periodEnd}" (default) or "Close them immediately." Calls `billing.cancel({ disposition })`.

Replace the existing `PlanSection` in `employer-profile-client.tsx` with `<BillingSection />`.

## Task 8: Wizard upgrade prompt

In `job-wizard-client.tsx` `onPublish` handler, parse the new error prefixes:

- `BILLING_REQUIRED` → show modal: "Subscribe to publish your first role" with link to `/employer/profile#ep-billing`
- `QUOTA_EXCEEDED:2/1` → show modal: "You're on Package A · 1 job/cycle. Upgrade to Package B for 3." with Upgrade button → links to billing section, plus Wait link

Use the existing `<Dialog>` primitive (already used by apply modal).

## Task 9: Operator setup notes

`docs/superpowers/notes/stripe-setup.md`:

- One-time Stripe dashboard steps (create products + monthly CAD prices for $299/$549/$749, copy price IDs)
- Webhook setup (endpoint URL `/api/stripe/webhook`, events: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`)
- Local dev: `stripe listen --forward-to localhost:3000/api/stripe/webhook` + paste signing secret into `.env.local`
- Test card: `4242 4242 4242 4242`

## Task 10: Verify

`pnpm typecheck && pnpm lint`. With Stripe env unset, every new procedure should still typecheck and the rest of the app should keep working (Stripe-only routes will throw at runtime if hit, which is expected).

---

## Out of scope

- Individual jobseeker subscriptions (Gold/Platinum) — features deferred
- Targeted Platform Ads — surface deferred
- Mid-cycle proration math (Stripe handles)
- Multi-currency (CAD only for now)
- Tax handling (Stripe Tax config, separate decision)
- Annual billing toggles
- Per-seat add-ons (recruiter seats from CLAUDE.md §12 — separate spec)
- Boost credits — separate spec
