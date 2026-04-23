import { router, publicProcedure } from "@/server/api/trpc";

export const healthRouter = router({
  ping: publicProcedure.query(() => ({
    ok: true as const,
    now: new Date(),
  })),
});
