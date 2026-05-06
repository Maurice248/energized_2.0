// One-off: attach mock screening questions to a specific job listing so the
// candidate apply flow can be tested end-to-end.
//
// Run:  pnpm dlx tsx --env-file=.env.local scripts/add-mock-screening.ts
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { jobListings } from "@/server/db/schema";

const TARGET_JOB_ID = "0b185b87-9652-4b7e-8994-cd9a1f9f7c78";

const QUESTIONS = [
  {
    q: "How many years of hands-on experience do you have in this sector?",
    required: true,
  },
  {
    q: "Are you legally able to work in Canada without sponsorship?",
    required: true,
  },
  {
    q: "Do you currently hold a valid H2S Alive certification?",
    required: false,
  },
  {
    q: "Briefly describe a project you led that's most relevant to this role.",
    required: false,
  },
];

async function main() {
  const [before] = await db
    .select({
      id: jobListings.id,
      title: jobListings.title,
      existing: jobListings.screeningQuestions,
    })
    .from(jobListings)
    .where(eq(jobListings.id, TARGET_JOB_ID))
    .limit(1);

  if (!before) {
    console.error(`Job ${TARGET_JOB_ID} not found.`);
    process.exit(1);
  }

  console.log(`Updating job: ${before.title}`);
  console.log(
    `Existing screening questions: ${before.existing.length} → replacing with ${QUESTIONS.length}`,
  );

  const [after] = await db
    .update(jobListings)
    .set({ screeningQuestions: QUESTIONS })
    .where(eq(jobListings.id, TARGET_JOB_ID))
    .returning({ id: jobListings.id, qs: jobListings.screeningQuestions });

  console.log(`Done. ${after.qs.length} questions on file.`);
  for (const q of after.qs) {
    console.log(`  · ${q.required ? "[req]" : "     "} ${q.q}`);
  }
  process.exit(0);
}

void main();
