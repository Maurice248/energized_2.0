import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { z } from "zod";
import { env } from "@/env";
import {
  buildSkillTestSystemPrompt,
  buildSkillTestUserPrompt,
  buildResultNarrativePrompt,
  type GeneratePromptInput,
} from "./skill-test-prompts";
import type { ResumeAutofillDraft } from "./resume-extraction-map";
import {
  flexParseToIsoDate,
  mapCertificationTypeFromAi,
  normalizeSectorFromAi,
  normalizeYear,
} from "./resume-extraction-map";

export const EMBER_ENABLED = Boolean(env.OPENAI_API_KEY);

const openaiClient = env.OPENAI_API_KEY
  ? createOpenAI({ apiKey: env.OPENAI_API_KEY })
  : null;

export type MatchScore = {
  score: number;
  reason: string;
};

export async function scoreJobMatch(input: {
  profile: string;
  job: string;
}): Promise<MatchScore> {
  if (!openaiClient) {
    throw new Error("OpenAI API key not configured.");
  }

  const { text } = await generateText({
    model: openaiClient(env.OPENAI_MODEL),
    system:
      "You are an energy-sector recruiter scoring candidate-job fit. " +
      'Return ONLY JSON: {"score": <0-100 integer>, "reason": "<one sentence, under 140 chars, grounded in specifics>"}. ' +
      "Score 85+ only for unambiguous fits. Consider sector, ticket alignment, experience level, rotation, and location.",
    prompt: `PROFILE:\n${input.profile}\n\nJOB:\n${input.job}\n\nJSON only.`,
    maxOutputTokens: 200,
  });

  // Extract JSON in case the model wraps it in prose.
  const match = text.match(/\{[\s\S]*\}/);
  const raw = match ? match[0] : text.trim();
  try {
    const parsed = JSON.parse(raw) as { score: unknown; reason: unknown };
    const score = Math.max(
      0,
      Math.min(100, Math.round(Number(parsed.score) || 0)),
    );
    const reason =
      typeof parsed.reason === "string"
        ? parsed.reason.slice(0, 280)
        : "No reason available.";
    return { score, reason };
  } catch {
    throw new Error("Could not parse match response.");
  }
}

export async function polishProfileSummary(input: {
  current: string;
  headline: string | null;
  sectors: string[];
  topRoles: { roleTitle: string | null; employerName: string; sector: string | null; summary: string | null }[];
}): Promise<string> {
  if (!openaiClient) {
    throw new Error("OpenAI API key not configured.");
  }

  const context = [
    `Headline: ${input.headline ?? "(none)"}`,
    `Sectors: ${input.sectors.join(", ") || "(none)"}`,
    "Recent roles:",
    ...input.topRoles
      .slice(0, 3)
      .map(
        (r) =>
          `- ${r.roleTitle ?? "Role"} at ${r.employerName} (${r.sector ?? "sector unset"})${r.summary ? ": " + r.summary.slice(0, 200) : ""}`,
      ),
  ].join("\n");

  const { text } = await generateText({
    model: openaiClient(env.OPENAI_MODEL),
    system:
      "You are an editor for energy-sector professional profiles on Energized, a Canadian job platform. " +
      "Rewrite the candidate's 'About' summary. Goals: " +
      "(1) lead with the strongest credential or experience the source mentions; " +
      "(2) quantify impact wherever the source already includes numbers (volumes, %, sites, durations) — never invent; " +
      "(3) use confident, active voice — no hedging, no buzzword soup; " +
      "(4) keep close to the original length (within ~30%); " +
      "(5) preserve every specific cert, commodity, role, and location the candidate mentioned. " +
      "If the source is sparse, work with what's there — produce the best honest rewrite you can. " +
      "NEVER invent employers, certs, locations, or numbers that aren't in the source. " +
      "One paragraph. No bullets. No headings. No quotes. No preamble like 'Here is…'. " +
      "Return ONLY the rewritten summary text.",
    prompt: `CONTEXT (do not echo):\n${context}\n\nCURRENT SUMMARY:\n${input.current}\n\nRewrite the summary now.`,
    maxOutputTokens: 400,
  });

  const cleaned = text.trim().replace(/^["']|["']$/g, "");
  if (cleaned.length === 0) {
    throw new Error(
      "The AI returned an empty response. Try again, or add more detail to your summary first.",
    );
  }
  return cleaned;
}

export async function draftCoverNote(input: {
  candidate: {
    headline: string | null;
    summary: string | null;
    sectors: string[];
    location: string | null;
  };
  topRoles: { roleTitle: string | null; employerName: string; sector: string | null; summary: string | null }[];
  topCertifications: string[];
  job: {
    title: string;
    company: string;
    sector: string | null;
    location: string | null;
    workSetup: string | null;
    rotationSchedule: string | null;
    requiredCertifications: string[];
    summary: string | null;
    description: string;
  };
}): Promise<string> {
  if (!openaiClient) {
    throw new Error("OpenAI API key not configured.");
  }

  const candidateBlock = [
    `Headline: ${input.candidate.headline ?? "(none)"}`,
    `Summary: ${input.candidate.summary ?? "(none)"}`,
    `Sectors: ${input.candidate.sectors.join(", ") || "(none)"}`,
    `Location: ${input.candidate.location ?? "(none)"}`,
    `Certifications: ${input.topCertifications.join(", ") || "(none)"}`,
    "Recent roles:",
    ...input.topRoles
      .slice(0, 3)
      .map(
        (r) =>
          `- ${r.roleTitle ?? "Role"} at ${r.employerName} (${r.sector ?? "sector unset"})${r.summary ? ": " + r.summary.slice(0, 200) : ""}`,
      ),
  ].join("\n");

  const jobBlock = [
    `Title: ${input.job.title}`,
    `Company: ${input.job.company}`,
    `Sector: ${input.job.sector ?? "(unset)"}`,
    `Location: ${input.job.location ?? "(unset)"}`,
    `Work setup: ${input.job.workSetup ?? "(unset)"}`,
    `Rotation: ${input.job.rotationSchedule ?? "(none)"}`,
    `Required certifications: ${input.job.requiredCertifications.join(", ") || "(none)"}`,
    `Job summary: ${input.job.summary ?? ""}`,
    `Description: ${input.job.description.slice(0, 1200)}`,
  ].join("\n");

  const { text } = await generateText({
    model: openaiClient(env.OPENAI_MODEL),
    system:
      "You draft cover notes for Canadian energy-sector job applications. " +
      "Write 90–130 words, ONE paragraph. " +
      "Goals: " +
      "Open by connecting the candidate's strongest credential or sector experience to the role. " +
      "Reference at least one specific element from the posting (sector, ticket, location, rotation, or scope). " +
      "If the candidate's profile lists a concrete piece of experience (project, ticket, employer, quantified result), cite ONE — but never fabricate one. " +
      "Close with a grounded note of fit — no generic enthusiasm. " +
      "Rules: " +
      "Active voice. No clichés (\"passionate\", \"team player\", \"dynamic\"). " +
      "No salutation. No signature. No \"Dear Hiring Manager\". " +
      "Plain text only — no bullets, no headings, no quotes, no preamble. " +
      "NEVER invent employers, certs, locations, dates, or numbers that aren't in the candidate's profile. " +
      "Work with whatever the profile provides; if it's sparse, write a leaner note rather than inventing facts. " +
      "Return ONLY the cover note text.",
    prompt: `CANDIDATE:\n${candidateBlock}\n\nJOB:\n${jobBlock}\n\nDraft the cover note now.`,
    maxOutputTokens: 350,
  });

  const cleaned = text.trim().replace(/^["']|["']$/g, "");
  if (cleaned.length === 0) {
    throw new Error(
      "The AI returned an empty response. Try again, or add a recent role / summary on your profile first.",
    );
  }
  return cleaned;
}

export async function polishJobDescription(input: {
  current: string;
  title: string | null;
  sector: string | null;
  summary: string | null;
}): Promise<string> {
  if (!openaiClient) {
    throw new Error("OpenAI API key not configured.");
  }

  const context = [
    `Title: ${input.title ?? "(unset)"}`,
    `Sector: ${input.sector ?? "(unset)"}`,
    `One-line summary: ${input.summary ?? "(unset)"}`,
  ].join("\n");

  const { text } = await generateText({
    model: openaiClient(env.OPENAI_MODEL),
    system:
      "You edit job descriptions for Canadian energy-sector roles on Energized. " +
      "Rewrite the employer's description so it: " +
      "(1) opens with what the role actually is — not company boilerplate; " +
      "(2) describes the first 90 days, the team, and reporting line if the source mentions any of these; " +
      "(3) lists day-to-day responsibilities in concrete terms — keep specific tools, sites, and credentials the source named; " +
      "(4) uses confident, active voice — no clichés (\"rockstar\", \"ninja\", \"family\", \"passionate\"); " +
      "(5) keeps close to the original length (within ~30%). " +
      "Avoid biased or exclusionary phrasing (gendered language, age proxies, \"culture fit\"). " +
      "NEVER invent salary, benefits, sites, or certifications that aren't in the source. " +
      "If the source is sparse, work with what's there — produce the best honest rewrite you can. " +
      "Plain text. Use blank lines for paragraph breaks if useful, but no markdown bullets or headings. " +
      "Return ONLY the rewritten description.",
    prompt: `CONTEXT (do not echo):\n${context}\n\nCURRENT DESCRIPTION:\n${input.current}\n\nRewrite the description now.`,
    maxOutputTokens: 800,
  });

  const cleaned = text.trim().replace(/^["']|["']$/g, "");
  if (cleaned.length === 0) {
    throw new Error(
      "The AI returned an empty response. Try again, or add more detail to your description first.",
    );
  }
  return cleaned;
}

export async function suggestScreeningQuestions(input: {
  title: string | null;
  sector: string | null;
  summary: string | null;
  description: string | null;
  requiredCertifications: string[];
}): Promise<{ q: string; required: boolean }[]> {
  if (!openaiClient) {
    throw new Error("OpenAI API key not configured.");
  }

  const context = [
    `Title: ${input.title ?? "(unset)"}`,
    `Sector: ${input.sector ?? "(unset)"}`,
    `Summary: ${input.summary ?? "(unset)"}`,
    `Required certifications: ${input.requiredCertifications.join(", ") || "(none specified)"}`,
    `Description: ${(input.description ?? "").slice(0, 1500)}`,
  ].join("\n");

  const { text } = await generateText({
    model: openaiClient(env.OPENAI_MODEL),
    system:
      "You generate applicant screening questions for Canadian energy-sector job postings. " +
      "Given a role, produce 3 to 5 short, fair, sector-appropriate questions that help the employer triage applications. " +
      "Cover: hard credentials the role needs (tickets / certs / clearances), commute or rotation tolerance if relevant, " +
      "concrete experience signals (specific tools, sites, commodities), and one open-ended fit question. " +
      "Keep each question under 20 words. Use plain language. NEVER ask about protected characteristics " +
      "(age, gender, family status, disability, religion, race, nationality, citizenship beyond legal-to-work-in-Canada). " +
      "NEVER ask for salary expectations (Canadian provinces increasingly ban it). " +
      "Mark a question `required: true` only if it's a hard credential or eligibility filter — keep most as optional. " +
      "Return ONLY a JSON array of objects with shape {\"q\": string, \"required\": boolean}. " +
      "No preamble, no code fences, no commentary.",
    prompt: `JOB:\n${context}\n\nGenerate the screening questions now.`,
    maxOutputTokens: 600,
  });

  // Extract a JSON array from the response.
  const match = text.match(/\[[\s\S]*\]/);
  const raw = match ? match[0] : text.trim();
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) throw new Error("not an array");
    const out: { q: string; required: boolean }[] = [];
    for (const entry of parsed) {
      if (
        entry &&
        typeof entry === "object" &&
        "q" in entry &&
        typeof (entry as { q: unknown }).q === "string"
      ) {
        const q = String((entry as { q: string }).q).trim().slice(0, 240);
        const required = Boolean((entry as { required?: unknown }).required);
        if (q.length > 0) out.push({ q, required });
      }
      if (out.length >= 5) break;
    }
    if (out.length === 0) {
      throw new Error("Couldn't parse any questions from the response.");
    }
    return out;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Couldn't parse screening questions: ${msg}`);
  }
}

// ---------------------------------------------------------------------------
// Skill test generation
// ---------------------------------------------------------------------------

const QuestionSchema = z.object({
  prompt: z.string().min(20).max(500),
  context: z.string().nullable(),
  options: z.array(z.string().min(1).max(200)).length(4),
  correctIdx: z.number().int().min(0).max(3),
  tags: z.array(z.string().min(1).max(40)).min(1).max(3),
  tagKind: z.enum(["scenario", "calc"]).nullable(),
});

const GenerateResponseSchema = z.object({
  questions: z.array(QuestionSchema),
});

export type GeneratedSkillTest = z.infer<typeof GenerateResponseSchema>;

const SKILL_TEST_MODEL = "gpt-4o-mini";

export async function generateSkillTest(
  input: GeneratePromptInput,
): Promise<GeneratedSkillTest & { model: string }> {
  if (!openaiClient) {
    throw new Error("OpenAI API key not configured.");
  }

  const system = buildSkillTestSystemPrompt();
  const user = buildSkillTestUserPrompt(input);

  for (let attempt = 0; attempt < 2; attempt++) {
    const { text } = await generateText({
      model: openaiClient(SKILL_TEST_MODEL),
      system,
      prompt: user,
      maxOutputTokens: Math.min(6000, 250 + input.count * 200),
    });

    const match = text.match(/\{[\s\S]*\}/);
    const raw = match ? match[0] : text.trim();
    try {
      const parsed = GenerateResponseSchema.parse(JSON.parse(raw));
      if (parsed.questions.length !== input.count) {
        if (attempt === 1) {
          throw new Error(
            `Could not parse skill test: expected ${input.count} questions, got ${parsed.questions.length}.`,
          );
        }
        continue;
      }
      return { ...parsed, model: SKILL_TEST_MODEL };
    } catch (e) {
      if (attempt === 1) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new Error(`Could not parse skill test response: ${msg}`);
      }
    }
  }
  throw new Error("Could not parse skill test response after retry.");
}

// ---------------------------------------------------------------------------
// Skill result narrative
// ---------------------------------------------------------------------------

const NARRATIVE_MODEL = "gpt-4o";

export async function narrateSkillResult(input: {
  topicName: string;
  score: number;
  passed: boolean;
  topVerified: boolean;
  breakdown: Array<{ cat: string; pct: number; right: number; total: number }>;
}): Promise<string> {
  if (!openaiClient) {
    throw new Error("OpenAI API key not configured.");
  }
  const { system, user } = buildResultNarrativePrompt(input);
  const { text } = await generateText({
    model: openaiClient(NARRATIVE_MODEL),
    system,
    prompt: user,
    maxOutputTokens: 300,
  });
  return text.trim().replace(/^["']|["']$/g, "");
}

// ---------------------------------------------------------------------------
// Resume → profile autofill (structured extraction)
// ---------------------------------------------------------------------------

const resumeAiWorkRowSchema = z.object({
  employerName: z.string(),
  roleTitle: z.string(),
  site: z.string().nullable().optional(),
  sector: z.string().nullable().optional(),
  commodity: z.string().nullable().optional(),
  rotation: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  roleSkills: z.array(z.string()).optional().default([]),
  startDate: z.string(),
  endDate: z.string().nullable().optional(),
  isCurrent: z.boolean().optional(),
});

const resumeAiEducationRowSchema = z.object({
  school: z.string(),
  degree: z.string().nullable().optional(),
  startedYear: z.string().nullable().optional(),
  endedYear: z.string().nullable().optional(),
  details: z.string().nullable().optional(),
});

const resumeAiCertRowSchema = z.object({
  name: z.string(),
  typeHint: z.string().nullable().optional(),
  issuer: z.string().nullable().optional(),
  issuedAt: z.string().nullable().optional(),
  expiresAt: z.string().nullable().optional(),
});

const resumeAiResponseSchema = z.object({
  workHistory: z.array(resumeAiWorkRowSchema).max(15).default([]),
  education: z.array(resumeAiEducationRowSchema).max(12).default([]),
  certifications: z.array(resumeAiCertRowSchema).max(20).default([]),
  coreSkills: z.array(z.string()).max(40).default([]),
});

function stripResumeFences(raw: string): string {
  const t = raw.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)\s*```$/im.exec(t);
  if (fence?.[1]) return fence[1].trim();
  return t;
}

function dedupeTrimmedSkills(list: string[], cap: number): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const s of list) {
    const t = s.trim();
    if (!t) continue;
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t.slice(0, 60));
    if (out.length >= cap) break;
  }
  return out;
}

export function emptyResumeAutofillDraft(): ResumeAutofillDraft {
  return {
    workHistory: [],
    education: [],
    certifications: [],
    coreSkills: [],
  };
}

export function resumeAutofillDraftHasSuggestions(d: ResumeAutofillDraft): boolean {
  return (
    d.workHistory.length > 0 ||
    d.education.length > 0 ||
    d.certifications.length > 0 ||
    d.coreSkills.length > 0
  );
}

function mapAiJsonToResumeDraft(
  parsed: z.infer<typeof resumeAiResponseSchema>,
): ResumeAutofillDraft {
  const workHistory = parsed.workHistory
    .map((row) => {
      const startedAt = flexParseToIsoDate(row.startDate);
      if (
        !row.employerName?.trim() ||
        !row.roleTitle?.trim() ||
        !startedAt
      ) {
        return null;
      }
      const endedAt =
        row.isCurrent === true
          ? null
          : flexParseToIsoDate(row.endDate ?? null);
      return {
        employerName: row.employerName.trim().slice(0, 160),
        roleTitle: row.roleTitle.trim().slice(0, 160),
        site: row.site?.trim().length ? row.site.trim().slice(0, 160) : null,
        sector: normalizeSectorFromAi(row.sector ?? null),
        commodity: row.commodity?.trim().length
          ? row.commodity.trim().slice(0, 120)
          : null,
        rotation: row.rotation?.trim().length
          ? row.rotation.trim().slice(0, 40)
          : null,
        summary: row.summary?.trim().length
          ? row.summary.trim().slice(0, 2000)
          : null,
        skills: dedupeTrimmedSkills(row.roleSkills ?? [], 20),
        startedAt,
        endedAt,
      };
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x));

  const education = parsed.education
    .map((row) => {
      if (!row.school?.trim()) return null;
      return {
        school: row.school.trim().slice(0, 160),
        degree: row.degree?.trim().length ? row.degree.trim().slice(0, 160) : null,
        startedYear: normalizeYear(row.startedYear ?? null),
        endedYear: normalizeYear(row.endedYear ?? null),
        details: row.details?.trim().length ? row.details.trim().slice(0, 500) : null,
      };
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x));

  const certifications = parsed.certifications
    .map((row) => {
      if (!row.name?.trim()) return null;
      const name = row.name.trim().slice(0, 120);
      return {
        type: mapCertificationTypeFromAi(row.typeHint ?? null, name),
        name,
        issuer: row.issuer?.trim().length ? row.issuer.trim().slice(0, 120) : null,
        issuedAt: flexParseToIsoDate(row.issuedAt ?? null),
        expiresAt: flexParseToIsoDate(row.expiresAt ?? null),
      };
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x));

  const coreSkills = dedupeTrimmedSkills(parsed.coreSkills ?? [], 30);

  return { workHistory, education, certifications, coreSkills };
}

/**
 * Uses the configured OpenAI model to turn resume plain text into profile-shaped data.
 * Returns an empty draft when AI is disabled or the model output cannot be parsed.
 */
export async function extractResumeAutofillDraftFromPlainText(
  plainText: string,
): Promise<ResumeAutofillDraft> {
  if (!openaiClient || plainText.trim().length < 40) {
    return emptyResumeAutofillDraft();
  }

  const clipped = plainText.slice(0, 22_000);
  const allowedSectors =
    "oil_gas | renewables | nuclear | utilities | hydrogen | power | other";
  const allowedCertHints =
    "h2s_alive | first_aid | csts | red_seal | p_eng | nace | fall_protection | other";

  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const { text } = await generateText({
        model: openaiClient(env.OPENAI_MODEL),
        system:
          "You extract structured resume data for Energized, a Canadian energy-sector job platform. " +
          "Read the resume text and return ONLY compact JSON (no markdown, no prose). " +
          "Rules: " +
          "(1) Copy employers, roles, schools, and certification names faithfully — do not invent employers, degrees, or tickets. " +
          "(2) If a field is unknown, use null or omit optional arrays. " +
          `(3) Sector on each job must be one of: ${allowedSectors}, or null if unsure. ` +
          `(4) For certifications, set typeHint to the closest bucket: ${allowedCertHints}. ` +
          "(5) Dates: prefer ISO YYYY-MM-DD for startDate, endDate, issuedAt, expiresAt; use null when missing. " +
          "(6) isCurrent true means the role has no end date yet. " +
          "(7) coreSkills: up to 25 concise tools / methods / disciplines (no soft skills). " +
          "(8) roleSkills: skills specifically tied to that job row. " +
          "(9) Keep summaries under 600 characters when possible.",
        prompt:
          "Return JSON with this exact shape: {\n" +
          '  \"workHistory\": [{\n' +
          '      \"employerName\": string,\n' +
          '      \"roleTitle\": string,\n' +
          '      \"site\": string | null,\n' +
          '      \"sector\": string | null,\n' +
          '      \"commodity\": string | null,\n' +
          '      \"rotation\": string | null,\n' +
          '      \"summary\": string | null,\n' +
          '      \"roleSkills\": string[],\n' +
          '      \"startDate\": string,\n' +
          '      \"endDate\": string | null,\n' +
          "      \"isCurrent\": boolean\n" +
          "  }],\n" +
          '  \"education\": [{\n' +
          '      \"school\": string,\n' +
          '      \"degree\": string | null,\n' +
          '      \"startedYear\": string | null,\n' +
          '      \"endedYear\": string | null,\n' +
          '      \"details\": string | null\n' +
          "  }],\n" +
          '  \"certifications\": [{\n' +
          '      \"name\": string,\n' +
          '      \"typeHint\": string | null,\n' +
          '      \"issuer\": string | null,\n' +
          '      \"issuedAt\": string | null,\n' +
          '      \"expiresAt\": string | null\n' +
          "  }],\n" +
          '  \"coreSkills\": string[]\n' +
          "}\n\nRESUME:\n" +
          clipped,
        maxOutputTokens: 4000,
      });

      const cleaned = stripResumeFences(text);
      const match = cleaned.match(/\{[\s\S]*\}/);
      const raw = match ? match[0] : cleaned;
      try {
        const parsed = resumeAiResponseSchema.parse(JSON.parse(raw));
        return mapAiJsonToResumeDraft(parsed);
      } catch {
        if (attempt === 1) return emptyResumeAutofillDraft();
      }
    }
    return emptyResumeAutofillDraft();
  } catch (e) {
    console.error({
      event: "resume_ai_extract_failed",
      message: e instanceof Error ? e.message : String(e),
    });
    return emptyResumeAutofillDraft();
  }
}
