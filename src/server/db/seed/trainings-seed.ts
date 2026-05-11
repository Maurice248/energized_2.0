import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import {
  trainings,
  trainingModules,
  trainingLessons,
  type NewTraining,
  type QuizQuestion,
} from "@/server/db/schema";

type SectorKey = "safety" | "tech" | "prof" | "soft" | "trans";

// Brand-safe tile colors per sector
const SECTOR_TILE: Record<SectorKey, string> = {
  safety: "#B45309",
  tech: "#004984",
  prof: "#4338CA",
  soft: "#334155",
  trans: "#0369A1",
};

type TrainingSeed = Omit<NewTraining, "tileColor"> & { sector: SectorKey };

const TRAININGS: TrainingSeed[] = [
  {
    slug: "gwo-basic",
    sector: "safety",
    title: "GWO Basic Safety Training — pre-credential prep",
    shortBlurb:
      "Five modules of pre-credential prep for the GWO BST: First Aid, Manual Handling, Fire Awareness, Working at Heights, Sea Survival.",
    longBlurb:
      "Working wind techs walk you through the five GWO Basic Safety Training modules — what to expect at the in-person practical, what gets people held back, what your employer actually checks. Pair with an in-person practical to earn the credential.",
    certName: "GWO Basic Safety",
    hours: 14,
    durationLabel: "14 hours · 5 modules",
    level: "beginner",
    monogram: "GW",
    instructorName: "Lior Bensimon",
    instructorRole: "Lead Wind Tech, NorthStar Renewables · 12 yrs offshore",
    outcomesJson: [
      "Pass the GWO BST in-person practical on first attempt",
      "Speak the language hiring managers expect at offshore wind interviews",
      "Walk into Day 1 on a turbine pad knowing protocol",
    ],
    unlocksJson: [
      { role: "Wind Technician II", co: "Aurora Wind · Halifax", band: "C$78–92k" },
      { role: "Offshore Maintenance Tech", co: "NorthStar · Bras d'Or", band: "C$84–98k" },
      { role: "Site Safety Officer", co: "BrightGrid · Calgary", band: "C$72–88k" },
    ],
    isFeatured: true,
    isNew: false,
    sortOrder: 10,
  },
  {
    slug: "h2s-alive",
    sector: "safety",
    title: "H2S Alive — Energy Safety Canada syllabus",
    shortBlurb:
      "Hydrogen sulphide hazard recognition, detection, monitoring, and SCBA donning. Aligned to the ESC syllabus required across most upstream oil & gas sites.",
    longBlurb:
      "The classroom prep almost every Alberta upstream site asks for. Real incidents, real PPE walk-throughs, the SCBA donning drill recruiters quietly time you on. Sit the in-person practical at any ESC partner site to earn the ticket.",
    certName: "H2S Alive",
    hours: 8,
    durationLabel: "8 hours · 1 day",
    level: "beginner",
    monogram: "H2",
    instructorName: "Dale Forsythe",
    instructorRole: "Sr. Safety Advisor, Cenovus · 22 yrs upstream",
    outcomesJson: [
      "Recognize H2S exposure scenarios and concentration limits",
      "Don and seal an SCBA inside the 60-second target",
      "Pass the ESC written component on first sit",
    ],
    unlocksJson: [
      { role: "Field Operator", co: "Cenovus · Cold Lake", band: "C$95–115k" },
      { role: "Wellsite Supervisor", co: "CNRL · Bonnyville", band: "C$140–180k" },
      { role: "Pipeline Tech", co: "CanFlow · Edmonton", band: "C$82–98k" },
    ],
    isFeatured: true,
    isNew: false,
    sortOrder: 20,
  },
  {
    slug: "plc-rslogix",
    sector: "tech",
    title: "Allen-Bradley PLC programming with RSLogix 5000",
    shortBlurb:
      "Ladder logic, structured text, function blocks, tag-based addressing, troubleshooting a running line. Built around real PanelView and ControlLogix scenarios.",
    longBlurb:
      "Built around the controllers you actually inherit on Day 1: ControlLogix 5580, CompactLogix, PanelView 5000. Eight modules from tag basics through troubleshooting a running line at 2am. Includes the verified skill assessment that lands on your profile.",
    certName: "AB Verified Skill",
    hours: 22,
    durationLabel: "22 hours · 8 modules",
    level: "intermediate",
    monogram: "AB",
    instructorName: "Priyanka Mehta",
    instructorRole: "Controls Engineer III, Suncor · 14 yrs",
    outcomesJson: [
      "Read, modify, and deploy ladder logic to a ControlLogix processor",
      "Diagnose a stalled line from PanelView indicator alone",
      'Earn the Energized "AB / RSLogix 5000" verified badge',
    ],
    unlocksJson: [
      { role: "Controls Engineer II", co: "Suncor · Fort McMurray", band: "C$110–130k" },
      { role: "Automation Lead", co: "CanFlow Pipeline · Edmonton", band: "C$135–165k" },
      { role: "Process Eng (controls)", co: "Methanex · Medicine Hat", band: "C$115–140k" },
    ],
    isFeatured: true,
    isNew: true,
    sortOrder: 30,
  },
  {
    slug: "scada-fundamentals",
    sector: "tech",
    title: "SCADA fundamentals — pipelines, wind, hydro",
    shortBlurb:
      "Telemetry, RTUs, OPC UA, alarm management, historian basics. Lab work uses Ignition + a simulated 240km pipeline.",
    longBlurb:
      "Six modules covering the SCADA stack from sensor to historian, with a simulated 240km pipeline you alarm-tune end-to-end. Sector-agnostic so it ports cleanly between upstream, midstream, hydro, and wind operations.",
    certName: "SCADA Verified Skill",
    hours: 16,
    durationLabel: "16 hours · 6 modules",
    level: "intermediate",
    monogram: "SC",
    instructorName: "Jonas Whitehorse",
    instructorRole: "SCADA Lead, BrightGrid Utilities · 11 yrs",
    outcomesJson: [
      "Configure an Ignition gateway against simulated RTUs",
      "Tune alarm priorities to ISA-18.2",
      "Walk a hiring manager through your historian queries",
    ],
    unlocksJson: [
      { role: "SCADA Engineer", co: "BrightGrid · Calgary", band: "C$105–125k" },
      { role: "Pipeline Controls Tech", co: "Enbridge · Edmonton", band: "C$90–108k" },
    ],
    isFeatured: false,
    isNew: true,
    sortOrder: 40,
  },
  {
    slug: "honeywell-experion",
    sector: "tech",
    title: "Honeywell Experion DCS — operator + engineer track",
    shortBlurb:
      "Two tracks in one course: operator console fluency, then engineering builds. C300 controllers, FTE network, point builds, batch.",
    longBlurb:
      "Operator-track first (six modules of console fluency), engineer-track second (four modules of builds). Run on a real Experion R520 sandbox kept current to plant releases. Weekly office hours with a working Honeywell senior.",
    certName: "Honeywell Verified Skill",
    hours: 28,
    durationLabel: "28 hours · 10 modules",
    level: "advanced",
    monogram: "HX",
    instructorName: "Mei-Lin Tao",
    instructorRole: "Sr. Process Control Eng, Imperial · 16 yrs",
    outcomesJson: [
      "Pilot an Experion console through a typical upset",
      "Build, test, and deploy a C300-hosted point",
      'Earn the Energized "Honeywell Experion" verified badge',
    ],
    unlocksJson: [
      { role: "Process Control Eng", co: "Imperial Oil · Sarnia", band: "C$120–150k" },
      { role: "DCS Lead", co: "Methanex · Medicine Hat", band: "C$135–170k" },
    ],
    isFeatured: false,
    isNew: false,
    sortOrder: 50,
  },
  {
    slug: "whmis",
    sector: "safety",
    title: "WHMIS 2015 — workplace hazardous materials",
    shortBlurb:
      "GHS pictograms, SDS literacy, the four classification updates, and the federal/provincial differences employers actually test you on.",
    longBlurb:
      "The fastest credential on the platform — most members finish in a single sitting. Current to the 2026 federal amendments and Alberta/Ontario/BC provincial overlays. Issues a downloadable certificate the moment you pass.",
    certName: "WHMIS 2015",
    hours: 2,
    durationLabel: "2 hours · self-paced",
    level: "beginner",
    monogram: "WH",
    instructorName: "Energized Safety Team",
    instructorRole: "Reviewed quarterly · current to 2026 amendments",
    outcomesJson: [
      "Recognize all nine GHS pictograms in context",
      "Pull the right info off an SDS in under 30 seconds",
      "Receive a downloadable WHMIS 2015 certificate",
    ],
    unlocksJson: [
      { role: "Required for nearly every site role on Energized", co: "", band: "" },
    ],
    isFeatured: false,
    isNew: false,
    sortOrder: 60,
  },
  {
    slug: "csts-2020",
    sector: "safety",
    title: "CSTS-2020 — construction safety training system",
    shortBlurb:
      "The cross-province construction safety standard. Hazard recognition, regulatory framework, fall protection basics, hot work fundamentals.",
    longBlurb:
      "The construction safety standard nearly every Western Canadian site asks for. Six hours, cleanly modular — pause and resume across days. Issues a province-specific certificate (AB, BC, SK, MB) on completion.",
    certName: "CSTS-2020",
    hours: 6,
    durationLabel: "6 hours · self-paced",
    level: "beginner",
    monogram: "CS",
    instructorName: "Energized Safety Team",
    instructorRole: "Aligned to ACSA + BCCSA syllabi",
    outcomesJson: [
      "Recognize the four most common site hazards",
      "Pass the CSTS-2020 final assessment",
      "Receive your provincial CSTS certificate",
    ],
    unlocksJson: [
      { role: "Construction Tech", co: "Multiple sites · AB / BC", band: "C$58–78k" },
      { role: "Site Coordinator", co: "Solar EPCs · SK / MB", band: "C$72–88k" },
    ],
    isFeatured: false,
    isNew: false,
    sortOrder: 70,
  },
  {
    slug: "peng-power",
    sector: "prof",
    title: "P.Eng track — Power Systems (APEGA aligned)",
    shortBlurb:
      "Six-week self-paced prep for the APEGA NPPE and the technical exams expected on the Power Systems route. Covers ethics, law, and the IEEE 1547 family.",
    longBlurb:
      "Six weeks of self-paced prep aligned to APEGA — NPPE on weeks 1–2, then four weeks of technical depth across IEEE 1547, protection coordination, and grid-tied inverters. Weekly live office hours with practicing P.Engs.",
    certName: "P.Eng (APEGA)",
    hours: 60,
    durationLabel: "60 hours · 6 weeks",
    level: "advanced",
    monogram: "PE",
    instructorName: "Robert Kahn, P.Eng",
    instructorRole: "P.Eng (AB/BC) · 19 yrs grid + protection",
    outcomesJson: [
      "Sit the APEGA NPPE with confidence",
      "Defend a protection coordination study",
      "Build the project log APEGA actually wants to see",
    ],
    unlocksJson: [
      { role: "Sr. Protection Engineer", co: "BrightGrid · Calgary", band: "C$140–175k" },
      { role: "P.Eng-track EIT", co: "AltaLink · Edmonton", band: "C$92–115k" },
    ],
    isFeatured: false,
    isNew: false,
    sortOrder: 80,
  },
  {
    slug: "pmp-energy",
    sector: "prof",
    title: "PMP — energy projects edition",
    shortBlurb:
      "PMI-aligned PMP exam prep with case studies pulled from real Canadian energy projects: a wind farm build, a refinery turnaround, a hydrogen pilot.",
    longBlurb:
      "PMI-aligned PMP exam prep, but every case study is drawn from Canadian energy: a 200MW wind farm build, an Imperial refinery turnaround, a Calgary hydrogen pilot. Pass the PMP first sit or your fee back (Career members only).",
    certName: "PMP",
    hours: 35,
    durationLabel: "35 hours · 4 weeks",
    level: "intermediate",
    monogram: "PM",
    instructorName: "Adaeze Okwu, PMP",
    instructorRole: "Project Director, Eavor Technologies",
    outcomesJson: [
      "Pass the PMP exam on first sit",
      "Run a project log that holds up to PMI audit",
      "Speak the energy-PM dialect (TAR, MAC, EPC) fluently",
    ],
    unlocksJson: [
      { role: "Project Manager", co: "Eavor · Calgary", band: "C$125–155k" },
      { role: "Sr. PM (Renewables)", co: "NorthStar · Bras d'Or", band: "C$140–170k" },
    ],
    isFeatured: false,
    isNew: true,
    sortOrder: 90,
  },
  {
    slug: "interview-energy",
    sector: "soft",
    title: "The energy-sector technical interview",
    shortBlurb:
      "Mock STAR-method drills tailored to upstream, midstream, and renewables interview loops. Three practice videos, instructor feedback inside 48 hours.",
    longBlurb:
      "Three recorded mock interviews graded by a working career coach inside 48 hours, plus one live 1:1 (Pro+). Built specifically for technical loops at energy employers — not generic FAANG-style behavioural prep.",
    certName: "Completion certificate",
    hours: 4,
    durationLabel: "4 hours · self-paced + 1 live",
    level: "all",
    monogram: "IV",
    instructorName: "Naomi Brant",
    instructorRole: "Career coach · ex-Suncor, ex-Eavor talent",
    outcomesJson: [
      "Tell three of your projects in STAR without rambling",
      'Handle the "walk me through a P&ID" question without freezing',
      "Negotiate inside a published salary band",
    ],
    unlocksJson: [
      { role: "Higher offer rate (members report +14%)", co: "", band: "" },
    ],
    isFeatured: true,
    isNew: false,
    sortOrder: 100,
  },
  {
    slug: "oil-to-renewables",
    sector: "trans",
    title: "Oil & gas → renewables: the transition playbook",
    shortBlurb:
      "How to translate upstream / midstream experience into renewables-employer language. Resume rewrites, project re-framing, the four hiring myths to ignore.",
    longBlurb:
      "Eleven years in oilfield automation, now leading a geothermal project. Karim walks you through the resume rewrite, the project re-framing, and the four hiring myths he ran into so you don't. Most-finished course on Energized.",
    certName: "Completion certificate",
    hours: 6,
    durationLabel: "6 hours · self-paced",
    level: "all",
    monogram: "OR",
    instructorName: "Karim Diallo",
    instructorRole: "Geothermal Project Lead, Eavor · ex-CNRL",
    outcomesJson: [
      "Translate three of your projects into renewables language",
      "Rewrite your resume for a wind / solar / geothermal hiring manager",
      "Spot the four oil-to-renewables hiring myths",
    ],
    unlocksJson: [
      { role: "Geothermal Project Lead", co: "Eavor · Calgary", band: "C$130–160k" },
      { role: "Wind Site Supervisor", co: "NorthStar · NS", band: "C$110–135k" },
      { role: "Solar Project Eng", co: "Capstone · ON", band: "C$95–120k" },
    ],
    isFeatured: true,
    isNew: true,
    sortOrder: 110,
  },
];

// Showcase curriculum for `gwo-basic` only; other trainings get a placeholder.
const GWO_CURRICULUM = [
  {
    slug: "first-aid",
    number: "01",
    title: "First Aid",
    durationLabel: "3h 10m",
    sortOrder: 1,
    lessons: [
      { slug: "drsabcd", kind: "video" as const, title: "Primary survey & DRSABCD", durationLabel: "12m" },
      { slug: "severe-bleeds", kind: "video" as const, title: "Controlling severe bleeds at heights", durationLabel: "18m" },
      { slug: "shock-signs", kind: "video" as const, title: "Recognizing signs of shock", durationLabel: "14m" },
      { slug: "scenarios", kind: "practice" as const, title: "Hands-on rehearsal — three scenarios", durationLabel: "40m" },
      { slug: "m1-quiz", kind: "quiz" as const, title: "Module 1 assessment", durationLabel: "20m" },
    ],
  },
  {
    slug: "manual-handling",
    number: "02",
    title: "Manual Handling",
    durationLabel: "2h 25m",
    sortOrder: 2,
    lessons: [
      { slug: "tower-lifts", kind: "video" as const, title: "Risk assessment for tower lifts", durationLabel: "14m" },
      { slug: "mechanical-aids", kind: "video" as const, title: "Mechanical aids — when, when not", durationLabel: "12m" },
      { slug: "two-person", kind: "practice" as const, title: "Two-person lift drill", durationLabel: "24m" },
      { slug: "m2-quiz", kind: "quiz" as const, title: "Module 2 assessment", durationLabel: "15m" },
    ],
  },
  {
    slug: "fire-awareness",
    number: "03",
    title: "Fire Awareness",
    durationLabel: "2h 00m",
    sortOrder: 3,
    lessons: [
      { slug: "four-leg", kind: "video" as const, title: "Fire chemistry — the four-leg model", durationLabel: "10m" },
      { slug: "extinguisher", kind: "video" as const, title: "Extinguisher selection inside a nacelle", durationLabel: "15m" },
      { slug: "evac", kind: "video" as const, title: "Evacuation routing from elevation", durationLabel: "14m" },
      { slug: "m3-quiz", kind: "quiz" as const, title: "Module 3 assessment", durationLabel: "15m" },
    ],
  },
  {
    slug: "working-at-heights",
    number: "04",
    title: "Working at Heights",
    durationLabel: "3h 50m",
    sortOrder: 4,
    lessons: [
      { slug: "harness", kind: "video" as const, title: "Harness fit & inspection", durationLabel: "18m" },
      { slug: "anchor", kind: "video" as const, title: "Anchor point selection on a tower", durationLabel: "22m" },
      { slug: "suspension", kind: "video" as const, title: "Suspension trauma prevention", durationLabel: "16m" },
      { slug: "rescue", kind: "practice" as const, title: "Tower rescue — peer rescue scenario", durationLabel: "45m" },
      { slug: "m4-quiz", kind: "quiz" as const, title: "Module 4 assessment", durationLabel: "20m" },
    ],
  },
  {
    slug: "sea-survival",
    number: "05",
    title: "Sea Survival",
    durationLabel: "2h 35m",
    sortOrder: 5,
    lessons: [
      { slug: "cold-water", kind: "video" as const, title: "Cold water immersion physiology", durationLabel: "14m" },
      { slug: "liferaft", kind: "video" as const, title: "Liferaft boarding from elevation", durationLabel: "20m" },
      { slug: "huet", kind: "video" as const, title: "HUET considerations (offshore wind)", durationLabel: "14m" },
      { slug: "final", kind: "practice" as const, title: "Final scenario — staged offshore upset", durationLabel: "40m" },
      { slug: "m5-quiz", kind: "quiz" as const, title: "Module 5 assessment", durationLabel: "20m" },
    ],
  },
];

const PLACEHOLDER_QUIZ: QuizQuestion[] = [
  {
    id: "q1",
    prompt: "Placeholder question — replace via admin tooling once content is authored.",
    options: ["Option A", "Option B", "Option C", "Option D"],
    correctIdx: 0,
    explanation: "Placeholder explanation.",
  },
  {
    id: "q2",
    prompt: "Second placeholder question.",
    options: ["Yes", "No", "Sometimes", "Never"],
    correctIdx: 1,
  },
  {
    id: "q3",
    prompt: "Third placeholder question.",
    options: ["Always", "Never", "It depends", "Not applicable"],
    correctIdx: 2,
  },
];

export async function seedTrainings() {
  for (const t of TRAININGS) {
    const tileColor = SECTOR_TILE[t.sector];

    const existing = await db
      .select({ id: trainings.id })
      .from(trainings)
      .where(eq(trainings.slug, t.slug))
      .limit(1);

    let trainingId: string;
    if (existing.length > 0) {
      trainingId = existing[0].id;
      await db
        .update(trainings)
        .set({
          title: t.title,
          shortBlurb: t.shortBlurb,
          longBlurb: t.longBlurb,
          sector: t.sector,
          certName: t.certName ?? null,
          hours: t.hours,
          durationLabel: t.durationLabel,
          level: t.level,
          monogram: t.monogram,
          tileColor,
          instructorName: t.instructorName,
          instructorRole: t.instructorRole,
          outcomesJson: t.outcomesJson,
          unlocksJson: t.unlocksJson,
          isFeatured: t.isFeatured ?? false,
          isNew: t.isNew ?? false,
          sortOrder: t.sortOrder ?? 0,
          isActive: true,
        })
        .where(eq(trainings.id, trainingId));
    } else {
      const inserted = await db
        .insert(trainings)
        .values({
          ...t,
          tileColor,
          certName: t.certName ?? null,
        })
        .returning({ id: trainings.id });
      trainingId = inserted[0].id;
    }

    // Curriculum
    const isShowcase = t.slug === "gwo-basic";
    const modules = isShowcase
      ? GWO_CURRICULUM
      : [
          {
            slug: "intro",
            number: "01",
            title: "Course intro",
            durationLabel: t.durationLabel,
            sortOrder: 1,
            lessons: [
              {
                slug: "overview",
                kind: "practice" as const,
                title: "Course overview",
                durationLabel: "5m",
              },
            ],
          },
        ];

    for (const mod of modules) {
      const existingMod = await db
        .select({ id: trainingModules.id })
        .from(trainingModules)
        .where(eq(trainingModules.slug, mod.slug))
        .limit(1);

      let moduleId: string;
      if (existingMod.length > 0) {
        moduleId = existingMod[0].id;
        await db
          .update(trainingModules)
          .set({
            trainingId,
            number: mod.number,
            title: mod.title,
            durationLabel: mod.durationLabel,
            sortOrder: mod.sortOrder,
          })
          .where(eq(trainingModules.id, moduleId));
      } else {
        const insertedMod = await db
          .insert(trainingModules)
          .values({
            trainingId,
            slug: mod.slug,
            number: mod.number,
            title: mod.title,
            durationLabel: mod.durationLabel,
            sortOrder: mod.sortOrder,
          })
          .returning({ id: trainingModules.id });
        moduleId = insertedMod[0].id;
      }

      let lessonOrder = 1;
      for (const lesson of mod.lessons) {
        const existingLesson = await db
          .select({ id: trainingLessons.id })
          .from(trainingLessons)
          .where(eq(trainingLessons.slug, lesson.slug))
          .limit(1);

        const values = {
          moduleId,
          slug: lesson.slug,
          title: lesson.title,
          kind: lesson.kind,
          durationLabel: lesson.durationLabel,
          sortOrder: lessonOrder++,
          videoUrl: lesson.kind === "video" ? null : null, // admin-authored later
          videoProvider: lesson.kind === "video" ? null : null,
          practiceMarkdown:
            lesson.kind === "practice"
              ? `# ${lesson.title}\n\nPlaceholder content — replace via admin tooling.`
              : null,
          quizQuestionsJson:
            lesson.kind === "quiz" ? PLACEHOLDER_QUIZ : null,
          quizPassThreshold: lesson.kind === "quiz" ? 70 : null,
        };

        if (existingLesson.length > 0) {
          await db
            .update(trainingLessons)
            .set(values)
            .where(eq(trainingLessons.id, existingLesson[0].id));
        } else {
          await db.insert(trainingLessons).values(values);
        }
      }
    }
  }

  console.log(`Seeded ${TRAININGS.length} trainings.`);
}

if (require.main === module) {
  seedTrainings()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
