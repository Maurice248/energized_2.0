import { schedules } from "@trigger.dev/sdk/v3";
import { and, eq, lt } from "drizzle-orm";
import { db } from "@/server/db";
import { skillTestAttempts } from "@/server/db/schema";

export const cleanupStaleSkillAttempts = schedules.task({
  id: "cleanup-stale-skill-attempts",
  cron: "*/10 * * * *",
  run: async () => {
    const cutoff = new Date(Date.now() - 25 * 60 * 1000);
    const result = await db
      .update(skillTestAttempts)
      .set({ status: "forfeited", finishedAt: new Date() })
      .where(
        and(
          eq(skillTestAttempts.status, "in_progress"),
          lt(skillTestAttempts.startedAt, cutoff),
        ),
      )
      .returning({ id: skillTestAttempts.id });
    console.log(`Forfeited ${result.length} stale attempts.`);
    return { forfeited: result.length };
  },
});
