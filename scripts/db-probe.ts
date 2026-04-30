// One-off DB probe — read-only — list what we have so we know what to seed.
import { db } from "@/server/db";
import {
  user,
  employerOrgs,
  orgMembers,
  jobListings,
  applications,
  profiles,
} from "@/server/db/schema";
import { sql } from "drizzle-orm";

async function main() {
  const [{ count: userCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(user);
  const [{ count: profileCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(profiles);
  const [{ count: orgCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(employerOrgs);
  const [{ count: memberCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(orgMembers);
  const [{ count: jobTotal }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(jobListings);
  const [{ count: jobPub }] = await db
    .select({
      count: sql<number>`count(*) filter (where status = 'published')::int`,
    })
    .from(jobListings);
  const [{ count: jobDraft }] = await db
    .select({
      count: sql<number>`count(*) filter (where status = 'draft')::int`,
    })
    .from(jobListings);
  const [{ count: appCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(applications);

  console.log("=== TOTALS ===");
  console.log({
    users: userCount,
    profiles: profileCount,
    employerOrgs: orgCount,
    orgMembers: memberCount,
    jobsTotal: jobTotal,
    jobsPublished: jobPub,
    jobsDraft: jobDraft,
    applications: appCount,
  });

  console.log("\n=== EMPLOYER ORGS ===");
  const orgs = await db
    .select({
      id: employerOrgs.id,
      name: employerOrgs.name,
      domain: employerOrgs.domain,
      verified: employerOrgs.verified,
      plan: employerOrgs.plan,
    })
    .from(employerOrgs);
  console.table(orgs);

  console.log("\n=== ORG MEMBERS ===");
  const members = await db
    .select({
      orgId: orgMembers.orgId,
      email: orgMembers.email,
      role: orgMembers.role,
      status: orgMembers.status,
    })
    .from(orgMembers);
  console.table(members);

  console.log("\n=== PUBLISHED JOBS ===");
  const jobs = await db
    .select({
      id: jobListings.id,
      title: jobListings.title,
      orgId: jobListings.orgId,
      sector: jobListings.sector,
      location: jobListings.location,
      status: jobListings.status,
    })
    .from(jobListings);
  console.table(jobs);

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
