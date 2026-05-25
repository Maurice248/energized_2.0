/**
 * One-shot: create (or re-create) an admin user.
 *
 * Usage:
 *   pnpm tsx scripts/create-admin-user.ts <email> <password> [name]
 *
 * What it does:
 *   1. If a user already exists with this email, deletes them (cascades to
 *      their account, sessions, profile rows). This guarantees the password
 *      is the one you pass in.
 *   2. Calls Better Auth's `signUpEmail` so the password is hashed via the
 *      same path the login flow uses to verify.
 *   3. Forces `role = 'admin'`, marks the email verified, and stamps
 *      `onboardedAt` so layouts don't redirect to onboarding.
 *   4. Inserts an audit-log entry so the promotion is recoverable.
 *
 * Re-running with the same email is idempotent — it always finishes with the
 * row in the desired state.
 */

import { db } from "@/server/db";
import { user, auditLog } from "@/server/db/schema";
import { auth } from "@/server/auth";
import { eq } from "drizzle-orm";

async function main() {
  const [, , email, password, ...nameParts] = process.argv;
  if (!email || !password) {
    console.error(
      "Usage: pnpm tsx scripts/create-admin-user.ts <email> <password> [name]",
    );
    process.exit(1);
  }
  const lowerEmail = email.toLowerCase();
  const name = nameParts.length ? nameParts.join(" ") : email.split("@")[0];

  console.log(`[admin-seed] target: ${lowerEmail}`);

  const [existing] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, lowerEmail))
    .limit(1);

  if (existing) {
    console.log(
      `[admin-seed] user already exists (id=${existing.id}) — deleting so the new password takes effect`,
    );
    await db.delete(user).where(eq(user.id, existing.id));
  }

  console.log(`[admin-seed] creating account…`);
  const res = await auth.api.signUpEmail({
    body: { email: lowerEmail, password, name },
    headers: new Headers(),
  });
  const userId = res?.user?.id;
  if (!userId) {
    throw new Error("Better Auth did not return a user id from signUpEmail");
  }
  console.log(`[admin-seed] created user ${userId}`);

  // Better Auth's signup hook clamps role to jobseeker/employer. Override
  // that here, mark the email verified, and stamp onboarding so the
  // role-aware layouts don't try to redirect.
  await db
    .update(user)
    .set({
      role: "admin",
      emailVerified: true,
      onboardedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(user.id, userId));

  await db.insert(auditLog).values({
    actorUserId: userId,
    actorLabel: "scripts/create-admin-user",
    action: "user.promote.admin",
    entityType: "user",
    entityId: userId,
    meta: { email: lowerEmail },
  });

  console.log(`[admin-seed] ✓ ${lowerEmail} is now an admin (id=${userId})`);
  console.log(`[admin-seed]   → sign in at /sign-in and visit /admin`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
