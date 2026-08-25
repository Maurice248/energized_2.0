import { describe, it, expect } from "vitest";
import { FAQ_SEEDS } from "@/lib/faq-seeds";

describe("FAQ_SEEDS", () => {
  it("has unique questions", () => {
    const keys = FAQ_SEEDS.map((f) => f.question.trim().toLowerCase());
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("covers every public category", () => {
    const cats = new Set(FAQ_SEEDS.map((f) => f.category));
    expect(cats).toEqual(
      new Set(["general", "seekers", "employers", "billing", "privacy"]),
    );
  });

  it("keeps questions and answers within admin limits", () => {
    for (const seed of FAQ_SEEDS) {
      expect(seed.question.trim().length).toBeGreaterThan(0);
      expect(seed.question.length).toBeLessThanOrEqual(500);
      expect(seed.answer.trim().length).toBeGreaterThan(0);
      expect(seed.answer.length).toBeLessThanOrEqual(50_000);
    }
  });
});
