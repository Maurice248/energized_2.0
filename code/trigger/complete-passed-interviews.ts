import { schedules } from "@trigger.dev/sdk/v3";
import { sql } from "drizzle-orm";
import { db } from "@/server/db";

export const completePassedInterviews = schedules.task({
  id: "complete-passed-interviews",
  cron: "*/30 * * * *",
  maxDuration: 120,
  run: async () => {
    // Flip 'confirmed' to 'completed' once the slot's end time is in the past.
    const result = await db.execute(sql`
      UPDATE interviews
      SET status = 'completed', updated_at = now()
      WHERE status = 'confirmed'
        AND confirmed_slot_id IS NOT NULL
        AND (
          SELECT starts_at + (interviews.duration_min || ' minutes')::interval
          FROM interview_slots
          WHERE interview_slots.id = interviews.confirmed_slot_id
        ) < now()
      RETURNING id
    `);
    return { completed: result.rowCount ?? 0 };
  },
});
