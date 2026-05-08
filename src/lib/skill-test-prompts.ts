export type GeneratePromptInput = {
  topicName: string;
  roleName: string;
  level: "entry" | "junior" | "mid" | "senior";
  count: number;
  includeScenarios: boolean;
  includeCalc: boolean;
};

export function buildSkillTestSystemPrompt(): string {
  return [
    "You write energy-sector skill assessments for Canadian professionals on Energized.",
    "Generate multiple-choice questions in JSON only, conforming to the schema below.",
    "Each question: 4 options, exactly 1 correct (correctIdx 0-3), 1-3 short tags, optional tagKind 'scenario' or 'calc'.",
    "Include `context` (a short 'Given:' block) ONLY for calc/scenario questions where it adds value; otherwise null.",
    "Never invent regulations, ticket names, or numbers — keep claims defensible from public sources.",
    "Return ONLY valid JSON in shape: {\"questions\":[{prompt,context,options,correctIdx,tags,tagKind}]}.",
    "No preamble, no code fences, no commentary.",
  ].join(" ");
}

export function buildSkillTestUserPrompt(input: GeneratePromptInput): string {
  const includes: string[] = [];
  if (input.includeScenarios) includes.push("scenario");
  if (input.includeCalc) includes.push("calc");
  return [
    `Topic: ${input.topicName}`,
    `Role: ${input.roleName}`,
    `Level: ${input.level} (calibrate difficulty accordingly)`,
    `Count: ${input.count} questions`,
    `Include question kinds: ${includes.length ? includes.join(", ") : "standard MCQ only"}`,
    "Return JSON only.",
  ].join("\n");
}

export function buildResultNarrativePrompt(input: {
  topicName: string;
  score: number;
  passed: boolean;
  topVerified: boolean;
  breakdown: Array<{ cat: string; pct: number; right: number; total: number }>;
}): { system: string; user: string } {
  const system = [
    "You write 2-3 sentence personalized result narratives for Canadian energy-sector skill assessments.",
    "Be specific to the candidate's strongest and weakest categories from the breakdown.",
    "Confident, active voice. No hedging, no clichés.",
    "If passed: acknowledge strength, name 1 weak area to focus on next.",
    "If failed: name what they showed, what to study before retaking. Encouraging but honest.",
    "Plain text. One short paragraph. Return ONLY the narrative.",
  ].join(" ");

  const breakdownLines = input.breakdown
    .map((c) => `- ${c.cat}: ${c.pct}% (${c.right}/${c.total})`)
    .join("\n");
  const status = input.topVerified
    ? "Top-30% verified pass"
    : input.passed
      ? "Pass"
      : "Did not pass";

  const user = [
    `Topic: ${input.topicName}`,
    `Score: ${input.score}/100 — ${status}`,
    `Category breakdown:\n${breakdownLines}`,
  ].join("\n");

  return { system, user };
}
