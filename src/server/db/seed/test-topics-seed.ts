import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { testTopics } from "@/server/db/schema";

type SectorSeed = {
  slug: string;
  name: string;
  monogram: string;
  blurb: string;
  tileColor: string;
  jobSectorMatch: "oil_gas" | "renewables" | "nuclear" | "utilities" | "hydrogen" | null;
  isHot?: boolean;
  sortOrder: number;
  roles: { slug: string; name: string; sub: string }[];
};

const SECTORS: SectorSeed[] = [
  {
    slug: "wind",
    name: "Wind energy",
    monogram: "WD",
    blurb: "Onshore & offshore turbines — blade, gearbox, controls, GWO.",
    tileColor: "#0369A1",
    jobSectorMatch: "renewables",
    isHot: true,
    sortOrder: 10,
    roles: [
      { slug: "wind-tech", name: "Wind technician II", sub: "Mechanical, electrical, hydraulics, climbing" },
      { slug: "wind-controls", name: "Controls engineer", sub: "SCADA, PLCs, pitch & yaw systems" },
      { slug: "wind-blade", name: "Blade repair specialist", sub: "Composite repair, NDT inspection, rope access" },
      { slug: "wind-site", name: "Site safety officer", sub: "GWO, working at heights, emergency response" },
    ],
  },
  {
    slug: "solar",
    name: "Solar PV",
    monogram: "SO",
    blurb: "Utility-scale + C&I — module string design, inverters, O&M.",
    tileColor: "#D97706",
    jobSectorMatch: "renewables",
    sortOrder: 20,
    roles: [
      { slug: "solar-pm", name: "Project manager — utility", sub: "Schedule, EPC contracts, interconnect" },
      { slug: "solar-design", name: "PV design engineer", sub: "PVsyst, string sizing, single-line diagrams" },
      { slug: "solar-om", name: "O&M technician", sub: "IV curve testing, inverter troubleshooting" },
    ],
  },
  {
    slug: "oilgas",
    name: "Oil & gas upstream",
    monogram: "OG",
    blurb: "Reservoir, drilling, completions, production engineering.",
    tileColor: "#004984",
    jobSectorMatch: "oil_gas",
    sortOrder: 30,
    roles: [
      { slug: "reservoir", name: "Reservoir engineer", sub: "PVT, decline curve, simulation, EOR" },
      { slug: "drilling", name: "Drilling engineer", sub: "BHA, mud programs, casing & cementing" },
      { slug: "completions", name: "Completions engineer", sub: "Hydraulic fracturing, perforating, flow assurance" },
      { slug: "production", name: "Production engineer", sub: "Artificial lift, separation, well intervention" },
    ],
  },
  {
    slug: "grid",
    name: "Grid operations",
    monogram: "GR",
    blurb: "Transmission, distribution, dispatch, reliability standards.",
    tileColor: "#4338CA",
    jobSectorMatch: "utilities",
    sortOrder: 40,
    roles: [
      { slug: "grid-op", name: "System operator", sub: "NERC-certified, real-time dispatch" },
      { slug: "protection", name: "Protection engineer", sub: "Relay coordination, SEL, fault studies" },
      { slug: "planner", name: "Transmission planner", sub: "Load flow, contingency, PSS/E" },
    ],
  },
  {
    slug: "hydrogen",
    name: "Hydrogen",
    monogram: "H2",
    blurb: "Electrolysis, blue/green H₂, storage, end-use applications.",
    tileColor: "#3B82F6",
    jobSectorMatch: "hydrogen",
    isHot: true,
    sortOrder: 50,
    roles: [
      { slug: "h2-process", name: "Process engineer — electrolyzer", sub: "PEM, alkaline, SOEC stack design" },
      { slug: "h2-safety", name: "Hydrogen safety officer", sub: "Permeation, classified zones, leak detection" },
    ],
  },
  {
    slug: "geo",
    name: "Geothermal",
    monogram: "GT",
    blurb: "Conventional, EGS, closed-loop — drilling crossover from O&G.",
    tileColor: "#44403C",
    jobSectorMatch: "renewables",
    sortOrder: 60,
    roles: [
      { slug: "geo-res", name: "Resource geoscientist", sub: "Subsurface mapping, MT surveys, fluid chemistry" },
      { slug: "geo-drill", name: "Geothermal drilling lead", sub: "High-temp BHA, lost circulation, casing design" },
    ],
  },
  {
    slug: "battery",
    name: "Battery storage",
    monogram: "BT",
    blurb: "BESS — Li-ion, flow, thermal management, fire suppression.",
    tileColor: "#A16207",
    jobSectorMatch: "renewables",
    sortOrder: 70,
    roles: [
      { slug: "bess-eng", name: "BESS systems engineer", sub: "SOC/SOH modelling, BMS, EMS integration" },
      { slug: "bess-com", name: "Commissioning technician", sub: "AC/DC tests, FAT/SAT, SCADA integration" },
    ],
  },
  {
    slug: "ccus",
    name: "Carbon capture (CCUS)",
    monogram: "CC",
    blurb: "Post-combustion, DAC, transport, geologic sequestration.",
    tileColor: "#1E293B",
    jobSectorMatch: "oil_gas",
    sortOrder: 80,
    roles: [
      { slug: "ccus-process", name: "Capture process engineer", sub: "Amine systems, MEA, energy penalty" },
      { slug: "ccus-storage", name: "Sequestration geologist", sub: "Caprock integrity, MMV, plume modelling" },
    ],
  },
  {
    slug: "nuclear",
    name: "Nuclear & SMR",
    monogram: "NU",
    blurb: "CANDU, SMRs — operations, fuel, regulatory.",
    tileColor: "#1CAAE2",
    jobSectorMatch: "nuclear",
    sortOrder: 90,
    roles: [
      { slug: "nuc-op", name: "Reactor operator (AECL)", sub: "Heat transport, reactivity, emergency procedures" },
      { slug: "nuc-fuel", name: "Fuel cycle engineer", sub: "Core physics, burnup, refuelling outage" },
    ],
  },
];

export async function seedTestTopics() {
  for (const sector of SECTORS) {
    const existing = await db
      .select({ id: testTopics.id })
      .from(testTopics)
      .where(eq(testTopics.slug, sector.slug))
      .limit(1);

    let sectorId: string;
    if (existing.length > 0) {
      sectorId = existing[0].id;
      await db
        .update(testTopics)
        .set({
          name: sector.name,
          monogram: sector.monogram,
          blurb: sector.blurb,
          tileColor: sector.tileColor,
          jobSectorMatch: sector.jobSectorMatch ?? undefined,
          isHot: sector.isHot ?? false,
          sortOrder: sector.sortOrder,
          isActive: true,
        })
        .where(eq(testTopics.id, sectorId));
    } else {
      const inserted = await db
        .insert(testTopics)
        .values({
          slug: sector.slug,
          parentTopicId: null,
          name: sector.name,
          monogram: sector.monogram,
          blurb: sector.blurb,
          tileColor: sector.tileColor,
          jobSectorMatch: sector.jobSectorMatch ?? undefined,
          isHot: sector.isHot ?? false,
          sortOrder: sector.sortOrder,
          isActive: true,
        })
        .returning({ id: testTopics.id });
      sectorId = inserted[0].id;
    }

    for (let i = 0; i < sector.roles.length; i++) {
      const role = sector.roles[i];
      const existingRole = await db
        .select({ id: testTopics.id })
        .from(testTopics)
        .where(eq(testTopics.slug, role.slug))
        .limit(1);

      if (existingRole.length > 0) {
        await db
          .update(testTopics)
          .set({
            parentTopicId: sectorId,
            name: role.name,
            monogram: sector.monogram,
            tileColor: sector.tileColor,
            subDescription: role.sub,
            jobSectorMatch: sector.jobSectorMatch ?? undefined,
            sortOrder: i,
            isActive: true,
          })
          .where(eq(testTopics.id, existingRole[0].id));
      } else {
        await db.insert(testTopics).values({
          slug: role.slug,
          parentTopicId: sectorId,
          name: role.name,
          monogram: sector.monogram,
          tileColor: sector.tileColor,
          subDescription: role.sub,
          jobSectorMatch: sector.jobSectorMatch ?? undefined,
          sortOrder: i,
          isActive: true,
        });
      }
    }
  }

  console.log(`Seeded ${SECTORS.length} sectors and ${SECTORS.reduce((n, s) => n + s.roles.length, 0)} roles.`);
}

if (require.main === module) {
  seedTestTopics()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
