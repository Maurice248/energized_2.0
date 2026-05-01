import { createCallerFactory, router } from "@/server/api/trpc";
import { accountRouter } from "@/server/api/routers/account";
import { applicationsRouter } from "@/server/api/routers/applications";
import { billingRouter } from "@/server/api/routers/billing";
import { candidatesRouter } from "@/server/api/routers/candidates";
import { employerRouter } from "@/server/api/routers/employer";
import { healthRouter } from "@/server/api/routers/health";
import { jobsRouter } from "@/server/api/routers/jobs";
import { matchesRouter } from "@/server/api/routers/matches";
import { notificationsRouter } from "@/server/api/routers/notifications";
import { onboardingRouter } from "@/server/api/routers/onboarding";
import { profileRouter } from "@/server/api/routers/profile";
import { savedJobsRouter } from "@/server/api/routers/saved-jobs";
import { savedSearchesRouter } from "@/server/api/routers/saved-searches";

export const appRouter = router({
  account: accountRouter,
  applications: applicationsRouter,
  billing: billingRouter,
  candidates: candidatesRouter,
  employer: employerRouter,
  health: healthRouter,
  jobs: jobsRouter,
  matches: matchesRouter,
  notifications: notificationsRouter,
  onboarding: onboardingRouter,
  profile: profileRouter,
  savedJobs: savedJobsRouter,
  savedSearches: savedSearchesRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
