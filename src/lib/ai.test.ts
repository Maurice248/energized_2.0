// src/lib/ai.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import { generateSkillTest } from "./ai";

vi.mock("@/env", () => ({
  env: {
    OPENAI_API_KEY: "test-key",
    OPENAI_MODEL: "gpt-4o",
  },
}));

vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: () => () => "mock-model",
}));

const generateTextMock = vi.fn();
vi.mock("ai", () => ({
  generateText: (...args: unknown[]) => generateTextMock(...args),
}));

beforeEach(() => {
  generateTextMock.mockReset();
});

describe("generateSkillTest", () => {
  it("parses a valid JSON response with N questions", async () => {
    const validQ = {
      prompt: "What is the primary purpose of a diaphragm in an alkaline electrolyzer?",
      context: null,
      options: [
        "Cross-over prevention between H2 and O2",
        "Pressure relief",
        "Catalyst protection",
        "Heat exchange",
      ],
      correctIdx: 0,
      tags: ["Stack"],
      tagKind: null,
    };
    generateTextMock.mockResolvedValueOnce({
      text: JSON.stringify({ questions: [validQ, validQ, validQ] }),
    });

    const result = await generateSkillTest({
      topicName: "Hydrogen",
      roleName: "Process engineer",
      level: "mid",
      count: 3,
      includeScenarios: true,
      includeCalc: true,
    });

    expect(result.questions).toHaveLength(3);
    expect(result.questions[0].prompt).toContain("diaphragm");
    expect(result.questions[0].options).toHaveLength(4);
    expect(result.questions[0].correctIdx).toBe(0);
  });

  it("retries once on invalid JSON, then throws", async () => {
    generateTextMock
      .mockResolvedValueOnce({ text: "not json at all" })
      .mockResolvedValueOnce({ text: "still not json" });

    await expect(
      generateSkillTest({
        topicName: "Hydrogen",
        roleName: "Process engineer",
        level: "mid",
        count: 3,
        includeScenarios: true,
        includeCalc: true,
      }),
    ).rejects.toThrow(/parse/i);

    expect(generateTextMock).toHaveBeenCalledTimes(2);
  });
});
