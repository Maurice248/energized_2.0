/**
 * Idempotently seed system CMS pages (marketing markdown + surface heroes).
 *
 * Usage:
 *   pnpm db:seed-system-pages
 *
 * Requires `.env.local` (or env) with DATABASE_URL and other vars @/env parses.
 */
import { seedSystemPagesTables } from "@/server/services/seed-system-pages";

async function main() {
  const res = await seedSystemPagesTables({
    actorUserId: null,
    actorLabel: "cli:pnpm db:seed-system-pages",
  });
  console.log(
    res.inserted === 0
      ? "No new rows (all system page slugs already exist)."
      : `Inserted ${res.inserted}: ${res.slugs.join(", ")}`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
