import { describe, it, expect, vi } from "vitest";
import { createCaller } from "@/server/api/root";

vi.mock("@/server/db", () => ({
  db: {} as Record<string, unknown>,
}));

vi.mock("@/server/auth", () => ({
  getSession: vi.fn(),
}));

const publishedRow = {
  id: "11111111-1111-4111-8111-111111111111",
  category: "general" as const,
  question: "How do I create a profile?",
  answer: "Sign up and complete onboarding.",
  answerFormat: "markdown" as const,
  supportArticleUrl: null,
  sortOrder: 0,
};

function mockDb(rows: typeof publishedRow[]) {
  return {
    select: () => ({
      from: () => ({
        where: () => ({
          orderBy: () => Promise.resolve(rows),
        }),
      }),
    }),
  };
}

function buildCtx(db: ReturnType<typeof mockDb>) {
  return {
    db,
    session: null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe("faqs.list", () => {
  it("returns published FAQs to anonymous callers", async () => {
    const caller = createCaller(buildCtx(mockDb([publishedRow])));
    const result = await caller.faqs.list();
    expect(result).toEqual([publishedRow]);
    expect(result[0]).not.toHaveProperty("updatedByUserId");
    expect(result[0]).not.toHaveProperty("status");
  });

  it("returns an empty list when nothing is published", async () => {
    const caller = createCaller(buildCtx(mockDb([])));
    await expect(caller.faqs.list()).resolves.toEqual([]);
  });
});
