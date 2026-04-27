# Vercel Firewall — production rules to set up in the dashboard

These rules can't be configured from the codebase — they live in the
Vercel project settings under **Firewall**. CLAUDE.md §19 documents
the intent; this file is the actionable checklist.

## Required rules

1. **Rate-limit auth endpoints**
   - Path: `/api/auth/*`
   - Action: Rate Limit
   - Limit: **10 requests / minute / IP**
   - Reason: blunts credential stuffing and password-spray attempts
     against Better Auth's email/password and magic-link routes.

2. **Rate-limit tRPC (anonymous)**
   - Path: `/api/trpc/*`
   - Match: requests without a `better-auth.session_token` cookie
   - Action: Rate Limit
   - Limit: **20 requests / minute / IP**
   - Reason: anonymous traffic to public tRPC procedures
     (`jobs.getPublic`, `getInviteSummary`) shouldn't burst.

3. **Rate-limit tRPC (authenticated)**
   - Path: `/api/trpc/*`
   - Match: requests with a `better-auth.session_token` cookie
   - Action: Rate Limit
   - Limit: **60 requests / minute / IP**
   - Reason: catches runaway clients without throttling normal usage.

4. **Whitelist Stripe IPs on the webhook route**
   - Path: `/api/stripe/webhook`
   - Action: Allow (and Block all others)
   - IPs: see https://docs.stripe.com/ips — keep updated.
   - Reason: only Stripe should hit this endpoint; all other traffic is
     either probing or wasted.

5. **Block known bad ASNs on `/api/*`** (optional, paid feature)
   - Action: Block
   - Use Vercel's threat-intel ruleset.

## Non-rules to remember

- Do **not** rate-limit `/api/trpc/*` more aggressively than 60/min for
  authed users — autosave on the job wizard fires roughly every 600ms
  while a recruiter is typing, so a strict cap will trip them.
- Do **not** block PostHog's `/ingest/*` rewrite path — it routes
  through Vercel and counts as origin traffic.

## Verification after each deploy

```sh
# Confirm security headers are present
curl -sI https://energized.biz/ | grep -E "Content-Security|X-Frame|Referrer"
```

Expected: CSP / X-Frame-Options / Referrer-Policy values per
`next.config.ts`.
