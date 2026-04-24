import { createCallerFactory, router } from "@/server/api/trpc";
import { accountRouter } from "@/server/api/routers/account";
import { applicationsRouter } from "@/server/api/routers/applications";
import { employerRouter } from "@/server/api/routers/employer";
import { healthRouter } from "@/server/api/routers/health";
import { jobsRouter } from "@/server/api/routers/jobs";
import { matchesRouter } from "@/server/api/routers/matches";
import { onboardingRouter } from "@/server/api/routers/onboarding";
import { profileRouter } from "@/server/api/routers/profile";
import { savedJobsRouter } from "@/server/api/routers/saved-jobs";

export const appRouter = router({
  account: accountRouter,
  applications: applicationsRouter,
  employer: employerRouter,
  health: healthRouter,
  jobs: jobsRouter,
  matches: matchesRouter,
  onboarding: onboardingRouter,
  profile: profileRouter,
  savedJobs: savedJobsRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
