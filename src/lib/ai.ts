import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { env } from "@/env";

export const EMBER_ENABLED = Boolean(env.ANTHROPIC_API_KEY);

const anthropicClient = EMBER_ENABLED
  ? createAnthropic({ apiKey: env.ANTHROPIC_API_KEY })
  : null;

export type MatchScore = {
  score: number;
  reason: string;
};

export async function scoreJobMatch(input: {
  profile: string;
  job: string;
}): Promise<MatchScore> {
  if (!anthropicClient) {
    throw new Error("Anthropic API key not configured.");
  }

  const { text } = await generateText({
    model: anthropicClient("claude-haiku-4-5-20251001"),
    system:
      "You are an energy-sector recruiter scoring candidate-job fit. " +
      "Return ONLY JSON: {\"score\": <0-100 integer>, \"reason\": \"<one sentence, under 140 chars, grounded in specifics>\"}. " +
      "Score 85+ only for unambiguous fits. Consider sector, ticket alignment, experience level, rotation, and location.",
    prompt: `PROFILE:\n${input.profile}\n\nJOB:\n${input.job}\n\nJSON only.`,
    maxOutputTokens: 200,
  });

  // Claude sometimes wraps JSON in prose; extract the first JSON block.
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
