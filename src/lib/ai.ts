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
