# Stripe setup — operator checklist

The codebase ships with full Stripe integration but the env keys and
products are intentionally NOT committed. Follow this checklist once
per environment (dev / staging / production) to light it up.

## 1. Create products and prices in Stripe

In the Stripe dashboard → **Products** → **+ Add product** for each:

| Product | Recurring price | Currency |
|---|---|---|
| Energized — Package A | C$299 / month | CAD |
| Energized — Package B | C$549 / month | CAD |
| Energized — Package C | C$749 / month | CAD |

After creating each price, copy the `price_xxx` id (visible on the
product detail page).

## 2. Set environment variables

In `.env.local` (dev) or Vercel project env (deploy):

```
STRIPE_SECRET_KEY=sk_test_...    # or sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...   # see step 3
STRIPE_PRICE_PACKAGE_A=price_...
STRIPE_PRICE_PACKAGE_B=price_...
STRIPE_PRICE_PACKAGE_C=price_...
```

All five are optional in `src/env.ts`. With them missing, the billing
section on `/employer/profile` shows a "Stripe isn't configured"
banner and Subscribe / Manage buttons stay disabled.

## 3. Configure the webhook

**Production / staging** — Stripe dashboard → **Developers** →
**Webhooks** → **+ Add endpoint**:

- Endpoint URL: `https://YOUR_DOMAIN/api/stripe/webhook`
- Events to send:
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`

Click the endpoint after creating it → **Signing secret** → reveal →
copy the `whsec_...` value into `STRIPE_WEBHOOK_SECRET`.

**Local dev** — install the Stripe CLI and forward events:

```sh
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

The CLI prints a `whsec_...` secret on first run — paste that into
`.env.local` as `STRIPE_WEBHOOK_SECRET`. Restart `pnpm dev` to pick up
the new env.

## 4. Smoke test

1. Sign in as an employer owner/admin
2. `/employer/profile` → scroll to **Plan & billing** → click **Subscribe to Package A**
3. Stripe Checkout opens. Use test card `4242 4242 4242 4242`, any future expiry, any CVC, any postal.
4. Stripe redirects back to `/employer/profile?billing=success`.
5. Webhook fires → DB updates → page refreshes with current plan + usage `0 of 1`.
6. Try to publish a draft. It should succeed (1/1 used).
7. Try to publish another draft. `QUOTA_EXCEEDED:1/1` → wizard shows "Upgrade" CTA.
8. Click **Manage billing** → Stripe Customer Portal opens (update payment, view invoices).
9. Click **Cancel subscription** → custom modal asks for disposition → Cancel → banner appears with end date.

## 5. Tax (optional, defer)

Stripe Tax can be enabled per-product in the dashboard. We pay no
attention to tax server-side; Stripe handles the math at checkout +
invoice time. Decide before going live whether you want
**Tax included in price** or **Tax added on top**.

## Notes

- Cancellation always sets `cancel_at_period_end: true` on Stripe — the
  employer is billed for the full period regardless. The local
  `cancellationDisposition` only controls whether their published roles
  get closed immediately or wait for the period to end.
- The `plan_renews_at` column is reused as Stripe's `current_period_end`.
  No need to query Stripe to render the renewal date.
- `currentPeriodStart` is what scopes the quota count window. Jobs
  published before subscription started (where `publishedAt < currentPeriodStart`)
  don't count — grandfathered.
