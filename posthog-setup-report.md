<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog into the Energized Next.js App Router project. The following changes were made:

- **`instrumentation-client.ts`** (new) — Initializes PostHog on the client side using Next.js 15.3+ instrumentation. Configured with a reverse-proxy host (`/ingest`), automatic exception capture, and debug mode in development.
- **`next.config.ts`** (updated) — Added `/ingest/static/*`, `/ingest/array/*`, and `/ingest/*` rewrites to route PostHog traffic through the app's own domain, avoiding ad-blockers.
- **`src/lib/posthog.ts`** (new) — Singleton server-side PostHog client (`posthog-node`) used by API routes and tRPC routers for server-side event capture.
- **`src/lib/analytics-events.ts`** (new) — Centralized event name registry (named constants). All PostHog event names must be imported from here to prevent taxonomy drift.
- **`src/app/api/stripe/webhook/route.ts`** (new) — Stripe webhook handler that captures `billing.subscription.started` and `billing.subscription.cancelled` server-side events with plan and subscription metadata.
- **`.env.local`** (updated) — `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` and `NEXT_PUBLIC_POSTHOG_HOST` set for both client and server use.

| Event | Description | File |
|---|---|---|
| `auth.sign_up.completed` | User completed sign-up (email or Google OAuth) | `src/app/api/auth/[...all]/route.ts` *(planned)* |
| `auth.sign_in.completed` | User signed in successfully | `src/app/api/auth/[...all]/route.ts` *(planned)* |
| `auth.sign_out.completed` | User signed out | `src/app/api/auth/[...all]/route.ts` *(planned)* |
| `job.posted` | Employer posted a new job listing | `src/server/api/routers/jobs.ts` *(planned)* |
| `job.viewed` | User viewed a job listing detail page | `src/app/(app)/jobs/[id]/page.tsx` *(planned)* |
| `application.submitted` | Candidate submitted a job application | `src/server/api/routers/applications.ts` *(planned)* |
| `billing.subscription.started` | Employer started a paid subscription | `src/app/api/stripe/webhook/route.ts` |
| `billing.subscription.cancelled` | Employer cancelled their subscription | `src/app/api/stripe/webhook/route.ts` |
| `profile.updated` | Candidate updated their profile | `src/server/api/routers/profile.ts` *(planned)* |
| `resume.uploaded` | Candidate uploaded a resume | `src/server/api/routers/profile.ts` *(planned)* |

> Events marked *(planned)* are registered in `src/lib/analytics-events.ts` and ready to wire in as those features are built.

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- **Dashboard — Analytics basics:** https://us.posthog.com/project/391702/dashboard/1494132
- **New sign-ups over time:** https://us.posthog.com/project/391702/insights/pSQDk96U
- **Sign-up → Application conversion funnel:** https://us.posthog.com/project/391702/insights/TQbuVQ68
- **Active subscriptions started vs cancelled:** https://us.posthog.com/project/391702/insights/mIoI3om5
- **Jobs posted over time:** https://us.posthog.com/project/391702/insights/TsolaUby
- **User retention after sign-up:** https://us.posthog.com/project/391702/insights/UkrTO6x7

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
