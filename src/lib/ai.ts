import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { env } from "@/env";

export const EMBER_ENABLED = Boolean(env.OPENAI_API_KEY);

const openaiClient = EMBER_ENABLED
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
      "Rewrite the candidate's 'About' summary to: " +
      "(1) lead with the strongest credential or experience; " +
      "(2) quantify impact wherever the source allows it (volumes, %, sites, durations); " +
      "(3) use confident, active voice — no hedging, no buzzword soup; " +
      "(4) match the original length within ±20%; " +
      "(5) keep references to specific certs, commodities, and locations the candidate mentioned. " +
      "One paragraph. No bullets. No headings. No quotes. No preamble like 'Here is...'. " +
      "Return ONLY the rewritten summary text. " +
      "If the original is empty or has no factual content to work from, return the exact string: INSUFFICIENT_INPUT",
    prompt: `CONTEXT (do not echo):\n${context}\n\nCURRENT SUMMARY:\n${input.current}\n\nRewrite the summary now.`,
    maxOutputTokens: 400,
  });

  const cleaned = text.trim().replace(/^["']|["']$/g, "");
  if (cleaned === "INSUFFICIENT_INPUT" || cleaned.length === 0) {
    throw new Error(
      "Add a draft sentence or two first — Profile Polish needs something to work from.",
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
      "Open by connecting the candidate's strongest credential to the role. " +
      "Reference ONE specific element from the posting (sector / ticket / location / rotation). " +
      "Cite ONE concrete piece of the candidate's experience (project, ticket, or quantified result). " +
      "Close with a grounded note of fit — no generic enthusiasm. " +
      "Active voice. No clichés (\"passionate\", \"team player\", \"dynamic\"). " +
      "No salutation. No signature. No \"Dear Hiring Manager\". " +
      "Plain text only — no bullets, no headings, no quotes, no preamble. " +
      "If the candidate or job has no specifics to ground the note in, return the exact string: INSUFFICIENT_INPUT",
    prompt: `CANDIDATE:\n${candidateBlock}\n\nJOB:\n${jobBlock}\n\nDraft the cover note now.`,
    maxOutputTokens: 350,
  });

  const cleaned = text.trim().replace(/^["']|["']$/g, "");
  if (cleaned === "INSUFFICIENT_INPUT" || cleaned.length === 0) {
    throw new Error(
      "Not enough on your profile yet for a grounded draft — add a summary or a recent role first.",
    );
  }
  return cleaned;
}
