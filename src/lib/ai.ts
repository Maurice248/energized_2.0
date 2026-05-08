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
