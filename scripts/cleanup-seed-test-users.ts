// One-shot cleanup for the three seed test jobseekers
// (Mara/Jordan/Priya) inserted via the kanban-test seed.
//
// Run with:
//   pnpm tsx scripts/cleanup-seed-test-users.ts
//
// What it deletes:
//   - Any user row whose email matches "%+seed@example.com"
//   - Cascade handles their profile, work_history, applications,
//     saved_jobs, notifications, etc. via FK ON DELETE CASCADE.
//
// Safe to run any time — idempotent. Prints a summary.

import { db } from "@/server/db";
import { user } from "@/server/db/schema";
import { like } from "drizzle-orm";

async function main() {
  const matches = await db
    .select({ id: user.id, email: user.email, name: user.name })
    .from(user)
    .where(like(user.email, "%+seed@example.com"));

  if (matches.length === 0) {
    console.log("No seed test users found. Nothing to do.");
    return;
  }

  console.log(`Found ${matches.length} seed user${matches.length === 1 ? "" : "s"}:`);
  for (const u of matches) {
    console.log(`  - ${u.name ?? "(no name)"} <${u.email}>`);
  }

  const deleted = await db
    .delete(user)
    .where(like(user.email, "%+seed@example.com"))
    .returning({ id: user.id });

  console.log(`Deleted ${deleted.length} user${deleted.length === 1 ? "" : "s"} (cascades to profiles, work_history, applications, etc.).`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
