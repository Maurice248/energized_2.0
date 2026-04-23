import { createCallerFactory, router } from "@/server/api/trpc";
import { accountRouter } from "@/server/api/routers/account";
import { healthRouter } from "@/server/api/routers/health";
import { onboardingRouter } from "@/server/api/routers/onboarding";
import { profileRouter } from "@/server/api/routers/profile";

export const appRouter = router({
  account: accountRouter,
  health: healthRouter,
  onboarding: onboardingRouter,
  profile: profileRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
