/**
 * Idempotently seed published starter FAQs for /faqs.
 *
 * Usage:
 *   pnpm db:seed-faqs
 *
 * Requires `.env.local` (or env) with DATABASE_URL and other vars @/env parses.
 */
import { seedFaqsTables } from "@/server/services/seed-faqs";

async function main() {
  const res = await seedFaqsTables({
    actorUserId: null,
    actorLabel: "cli:pnpm db:seed-faqs",
  });
  console.log(
    res.inserted === 0
      ? "No new rows (all starter FAQ questions already exist)."
      : `Inserted ${res.inserted}:\n${res.questions.map((q) => `  - ${q}`).join("\n")}`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
