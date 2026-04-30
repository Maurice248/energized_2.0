// Mock-data seed for `/jobs` browsing testing.
// Idempotent: skips orgs/jobs that already exist by exact name.
//
// Adds:
//   - 2 new employer orgs (Petrolink Energy, Northwind Renewables)
//   - 6 new published jobs across 3 orgs (incl. existing Test Company)
//
// Cleanup later (if you want to wipe the seed):
//   DELETE FROM employer_orgs WHERE name IN ('Petrolink Energy', 'Northwind Renewables');
//   DELETE FROM job_listings WHERE title IN ('SCADA Specialist','Senior Controls Engineer','Reservoir Engineer (P.Eng)','Pipeline Integrity Tech','Wind Tech Level 3','Solar PM, Western Canada');

import { db } from "@/server/db";
import {
  employerOrgs,
  jobListings,
  user,
} from "@/server/db/schema";
import { eq, and } from "drizzle-orm";

const CREATED_BY_USER_ID = "Tk4NFU82kjWH9f7Emh8eIiS7noxHTzAK"; // dev+employer@energized.biz

type SeedOrg = {
  name: string;
  domain: string;
  website: string;
  hq: string;
  founded: string;
  tagline: string;
  about: string;
  logoColor: string;
  primarySector:
    | "oil_gas"
    | "renewables"
    | "nuclear"
    | "utilities"
    | "hydrogen"
    | "power"
    | "other";
  size: "1_10" | "11_50" | "51_120" | "120_250" | "250_500" | "500_1000" | "1000_plus";
};

type SeedJob = {
  orgName: string; // resolves to orgId at runtime
  title: string;
  sector: SeedOrg["primarySector"];
  location: string;
  workSetup: "onsite" | "hybrid_preferred" | "remote_ok" | "flexible";
  experienceLevel: "entry" | "intermediate" | "senior" | "lead" | "executive";
  rotationSchedule: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  requiredCertifications: string[];
  summary: string;
  description: string;
};

const ORGS: SeedOrg[] = [
  {
    name: "Petrolink Energy",
    domain: "petrolink.example.ca",
    website: "https://petrolink.example.ca",
    hq: "Calgary, AB",
    founded: "1998",
    tagline: "Upstream operations, modern controls.",
    about:
      "Petrolink Energy is a mid-cap Canadian oil & gas operator with assets in Alberta and Saskatchewan. We run integrated upstream operations across SAGD, conventional, and pipeline midstream — and we're investing in the controls and integrity teams that keep them running safely.",
    logoColor: "#1CAAE2",
    primarySector: "oil_gas",
    size: "500_1000",
  },
  {
    name: "Northwind Renewables",
    domain: "northwind.example.ca",
    website: "https://northwind.example.ca",
    hq: "Halifax, NS",
    founded: "2014",
    tagline: "Wind and solar across Canada's edges.",
    about:
      "Northwind Renewables develops, builds, and operates utility-scale wind and solar projects from the Atlantic coast to the BC interior. Our field-service teams handle commissioning, scheduled maintenance, and rapid-response repairs across a 1.2 GW operating fleet.",
    logoColor: "#004984",
    primarySector: "renewables",
    size: "120_250",
  },
];

const JOBS: SeedJob[] = [
  // existing Test Company gets one more job
  {
    orgName: "Test Company",
    title: "SCADA Specialist",
    sector: "utilities",
    location: "Saint John, NB",
    workSetup: "hybrid_preferred",
    experienceLevel: "senior",
    rotationSchedule: null,
    salaryMin: 95000,
    salaryMax: 130000,
    requiredCertifications: [],
    summary:
      "Lead SCADA system maintenance and improvements across our New Brunswick operations centres. Mix of on-site work in Saint John and hybrid remote planning days.",
    description:
      "We're hiring a SCADA Specialist to take the lead on real-time control systems supporting transmission and distribution operations across the Maritimes. You'll own day-to-day reliability of the OASys and OSI PI environments, partner with operations and IT/OT security, and drive the move toward a unified historian.\n\nWhat you'll do:\n- Own the SCADA stack: tag mapping, alarm hygiene, displays, redundancy testing.\n- Coordinate change management with the operations control rooms.\n- Lead two analysts; mentor on incident response and post-mortems.\n- Partner with cyber on OT segmentation and patch windows.\n\nWhat we're looking for:\n- 6+ years working with SCADA/EMS in a transmission, distribution, or generation utility.\n- Hands-on with OSI PI or equivalent historian, plus a major vendor SCADA (OASys, GE iFIX, Honeywell).\n- Comfortable on rotating call-out for major events.\n- B.Eng (Electrical/Computer) or equivalent demonstrated experience.",
  },

  // Petrolink Energy
  {
    orgName: "Petrolink Energy",
    title: "Senior Controls Engineer",
    sector: "oil_gas",
    location: "Fort McMurray, AB",
    workSetup: "onsite",
    experienceLevel: "senior",
    rotationSchedule: "14/7",
    salaryMin: 140000,
    salaryMax: 180000,
    requiredCertifications: ["h2s_alive", "csts", "p_eng"],
    summary:
      "Lead controls engineering on a producing SAGD facility. 14/7 rotation, fly-in / fly-out from Calgary or Edmonton.",
    description:
      "Senior Controls Engineer for our Site-14 SAGD plant outside Fort McMurray. You'll own the DCS strategy across 6 well pads and central processing, lead a small site engineering team, and represent controls in turnaround planning.\n\nResponsibilities:\n- Own Honeywell DCS (Experion PKS) configuration, OS upgrades, and loop tuning.\n- Lead the controls work in TARs, including I/O additions and HAZOP follow-ups.\n- Coordinate with reservoir, ops, and reliability on flare-gas reduction projects.\n- Mentor 2 intermediate engineers and 4 instrument techs.\n\nMust-haves:\n- P.Eng (APEGA registration or eligibility).\n- 8+ years controls in upstream oil & gas.\n- Working knowledge of IEC 61511 / SIL studies.\n- H2S Alive + CSTS current. Pre-access medical and substance test required.",
  },
  {
    orgName: "Petrolink Energy",
    title: "Reservoir Engineer (P.Eng)",
    sector: "oil_gas",
    location: "Calgary, AB",
    workSetup: "hybrid_preferred",
    experienceLevel: "intermediate",
    rotationSchedule: null,
    salaryMin: 120000,
    salaryMax: 155000,
    requiredCertifications: ["p_eng"],
    summary:
      "Reservoir engineer on the SAGD optimization team. Calgary HQ, 3 days in office, 2 remote.",
    description:
      "Join our subsurface team supporting two producing SAGD assets. You'll work alongside production engineers and geologists to forecast pad performance, design steam allocation strategies, and feed recommendations into the annual capital plan.\n\nYou'll be responsible for:\n- Pad-level history matching in CMG IMEX/STARS.\n- Steam-oil ratio forecasting and economics for proposed infills.\n- AFE preparation and post-job reviews.\n- Working with operations on real-time pad performance issues.\n\nWhat we need:\n- 4+ years reservoir engineering, 2+ in thermal/SAGD.\n- P.Eng (APEGA) registered or transferable.\n- Strong Excel/Python comfort; Spotfire bonus.\n- Calgary-based or willing to relocate.",
  },
  {
    orgName: "Petrolink Energy",
    title: "Pipeline Integrity Tech",
    sector: "oil_gas",
    location: "Edmonton, AB",
    workSetup: "onsite",
    experienceLevel: "intermediate",
    rotationSchedule: "10/4",
    salaryMin: 85000,
    salaryMax: 110000,
    requiredCertifications: ["h2s_alive", "first_aid", "fall_protection"],
    summary:
      "Field pipeline integrity work across Northern Alberta gathering systems. 10/4 rotation, truck-based.",
    description:
      "Hands-on integrity tech role covering 1,200+ km of gathering systems. Lots of windshield time. You'll run dig programs, ILI follow-ups, and occasional in-line inspection support.\n\nDay to day:\n- Lead direct examination digs (pre-dig prep, NDE coordination, repair sleeve installs).\n- Coordinate with environmental and stakeholder relations on landowner notifications.\n- Maintain integrity documentation (anomaly assessments, re-inspect intervals).\n- Support occasional crisis response.\n\nMust-haves:\n- 3+ years pipeline integrity or NDE field experience.\n- CGSB Level II UT/MT or equivalent (Level III a plus).\n- H2S Alive + Standard First Aid + Fall Protection current.\n- Class 5 driver's licence with clean abstract; Class 3 a plus.",
  },

  // Northwind Renewables
  {
    orgName: "Northwind Renewables",
    title: "Wind Tech Level 3",
    sector: "renewables",
    location: "Halifax, NS",
    workSetup: "onsite",
    experienceLevel: "intermediate",
    rotationSchedule: "14 on / 14 off",
    salaryMin: 80000,
    salaryMax: 105000,
    requiredCertifications: ["fall_protection", "first_aid"],
    summary:
      "Field wind technician for our Atlantic Canada operating fleet. GWO BST + ART required. 14/14 rotation.",
    description:
      "Maintenance and repair across our 600 MW Atlantic operating fleet (Vestas V90 and Siemens 3.6 platforms). Reports to the regional ops lead. Hub: Halifax, with travel to NS, NB, NL, PEI sites.\n\nResponsibilities:\n- Scheduled maintenance and unplanned repair on Vestas V90 and Siemens SWT-3.6.\n- Up-tower component replacement (gearbox, generator, pitch system).\n- Lead a 3-person crew on major component exchanges.\n- Mentor Level 1 and 2 techs on troubleshooting workflow.\n\nMust-haves:\n- 5+ years wind turbine maintenance.\n- GWO Basic Safety Training and Advanced Rescue Training, current.\n- Comfort with up-tower work in winter conditions.\n- Class 5 licence; Class 3 a plus.",
  },
  {
    orgName: "Northwind Renewables",
    title: "Solar PM, Western Canada",
    sector: "renewables",
    location: "Vancouver, BC",
    workSetup: "remote_ok",
    experienceLevel: "senior",
    rotationSchedule: null,
    salaryMin: 130000,
    salaryMax: 170000,
    requiredCertifications: [],
    summary:
      "Project manager for a 320 MW utility-scale solar pipeline across BC and Alberta. Remote with travel.",
    description:
      "Senior PM owning the development-to-COD lifecycle for two utility-scale solar farms — a 180 MW BC project and a 140 MW Alberta project. Reports to the VP Development.\n\nWhat success looks like:\n- Permitting on schedule (we have an aggressive 18-month target on the BC project).\n- EPC procurement complete, contracts negotiated, all interconnect milestones tracked.\n- Stakeholder engagement done well (First Nations consultation, municipal, landowner).\n- Day-to-day coordination across legal, finance, EPC, owner's engineer.\n\nWhat we want:\n- 7+ years utility-scale renewables PM, ideally with at least one project taken to COD.\n- Comfortable owning a $300M+ capex budget.\n- PMP an asset, not required.\n- Vancouver-based or willing to be available on PT hours; expect ~30% travel.",
  },
];

async function ensureOrg(s: SeedOrg): Promise<string> {
  const [existing] = await db
    .select({ id: employerOrgs.id })
    .from(employerOrgs)
    .where(eq(employerOrgs.name, s.name))
    .limit(1);
  if (existing) {
    console.log(`  org "${s.name}" already exists (${existing.id}) — skipping`);
    return existing.id;
  }
  const [inserted] = await db
    .insert(employerOrgs)
    .values({
      name: s.name,
      domain: s.domain,
      website: s.website,
      hq: s.hq,
      founded: s.founded,
      tagline: s.tagline,
      about: s.about,
      logoColor: s.logoColor,
      primarySector: s.primarySector,
      size: s.size,
      verified: true,
      verifiedAt: new Date(),
      plan: "none",
    })
    .returning({ id: employerOrgs.id });
  console.log(`  org "${s.name}" inserted (${inserted.id})`);
  return inserted.id;
}

async function ensureJob(s: SeedJob, orgId: string) {
  const [existing] = await db
    .select({ id: jobListings.id })
    .from(jobListings)
    .where(and(eq(jobListings.orgId, orgId), eq(jobListings.title, s.title)))
    .limit(1);
  if (existing) {
    console.log(`    job "${s.title}" already exists (${existing.id}) — skipping`);
    return;
  }
  const [inserted] = await db
    .insert(jobListings)
    .values({
      orgId,
      createdByUserId: CREATED_BY_USER_ID,
      title: s.title,
      sector: s.sector,
      experienceLevel: s.experienceLevel,
      location: s.location,
      workSetup: s.workSetup,
      rotationSchedule: s.rotationSchedule,
      salaryMin: s.salaryMin,
      salaryMax: s.salaryMax,
      requiredCertifications: s.requiredCertifications,
      summary: s.summary,
      description: s.description,
      status: "published",
      publishedAt: new Date(),
    })
    .returning({ id: jobListings.id });
  console.log(`    job "${s.title}" inserted (${inserted.id})`);
}

async function main() {
  // Sanity check: confirm CREATED_BY_USER_ID exists.
  const [creator] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.id, CREATED_BY_USER_ID))
    .limit(1);
  if (!creator) {
    throw new Error(
      `CREATED_BY_USER_ID ${CREATED_BY_USER_ID} not found in user table — update the constant`,
    );
  }

  console.log("=== Seeding employer orgs ===");
  const orgIdByName: Record<string, string> = {};
  for (const o of ORGS) {
    orgIdByName[o.name] = await ensureOrg(o);
  }

  // Existing org we attach a job to
  const [testCompany] = await db
    .select({ id: employerOrgs.id })
    .from(employerOrgs)
    .where(eq(employerOrgs.name, "Test Company"))
    .limit(1);
  if (testCompany) {
    orgIdByName["Test Company"] = testCompany.id;
  } else {
    console.warn("  Test Company not found — skipping its job");
  }

  console.log("\n=== Seeding jobs ===");
  for (const j of JOBS) {
    const orgId = orgIdByName[j.orgName];
    if (!orgId) {
      console.warn(`  ${j.title} — no orgId for "${j.orgName}", skipping`);
      continue;
    }
    console.log(`  [${j.orgName}] ${j.title}`);
    await ensureJob(j, orgId);
  }

  console.log("\nDone.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
