import { describe, it, expect, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import {
  MARKETING_STATIC_SLUGS,
  RESERVED_SLUGS,
  slugSchema,
} from "./admin-pages";
import { createCaller } from "@/server/api/root";

vi.mock("@/server/db", () => ({
  db: {} as Record<string, unknown>,
}));

vi.mock("@/server/auth", () => ({
  getSession: vi.fn(),
}));

function buildCtx(overrides?: {
  role?: "admin" | "jobseeker" | "employer" | "recruiter";
  userId?: string;
  db?: Record<string, unknown>;
}) {
  const role = overrides?.role ?? "admin";
  return {
    db: overrides?.db ?? ({} as Record<string, unknown>),
    session: {
      user: {
        id: overrides?.userId ?? "u_admin",
        email: "admin@energized.ca",
        name: "Admin",
        role,
      },
      session: { id: "s_1", userId: overrides?.userId ?? "u_admin" } as Record<
        string,
        unknown
      >,
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe("admin-pages: slugSchema", () => {
  const validSlugs = [
    "about-us",
    "team",
    "press-2026",
    "energy-transition-faq",
    "a",
  ];

  for (const s of validSlugs) {
    it(`accepts "${s}"`, () => {
      const parsed = slugSchema.safeParse(s);
      expect(parsed.success).toBe(true);
    });
  }

  const invalidSlugs = [
    ["About", "uppercase"],
    ["about us", "spaces"],
    ["about_us", "underscore"],
    ["-about", "leading dash"],
    ["about-", "trailing dash"],
    ["about--us", "double dash"],
    ["", "empty"],
    ["x".repeat(81), "too long"],
    ["héllo", "non-ascii"],
  ] as const;

  for (const [s, reason] of invalidSlugs) {
    it(`rejects "${s}" (${reason})`, () => {
      const parsed = slugSchema.safeParse(s);
      expect(parsed.success).toBe(false);
    });
  }

  it("rejects reserved slugs", () => {
    const reserved = [
      "admin",
      "api",
      "jobs",
      "dashboard",
      "sign-in",
      "p",
      "c",
      "faqs",
    ];
    for (const r of reserved) {
      expect(RESERVED_SLUGS.has(r)).toBe(true);
      expect(slugSchema.safeParse(r).success).toBe(false);
    }
  });

  it("allows seeded marketing slugs (they are not reserved — they are seeded as system records)", () => {
    for (const s of MARKETING_STATIC_SLUGS) {
      expect(slugSchema.safeParse(s).success).toBe(true);
    }
  });
});

describe("admin-pages: admin gating", () => {
  it("rejects non-admin callers with FORBIDDEN on list", async () => {
    const caller = createCaller(buildCtx({ role: "jobseeker" }));
    await expect(caller.admin.pages.list()).rejects.toBeInstanceOf(TRPCError);
    await expect(caller.admin.pages.list()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("rejects non-admin callers with FORBIDDEN on stats", async () => {
    const caller = createCaller(buildCtx({ role: "employer" }));
    await expect(caller.admin.pages.stats()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("rejects non-admin callers with FORBIDDEN on delete", async () => {
    const caller = createCaller(buildCtx({ role: "recruiter" }));
    await expect(
      caller.admin.pages.delete({
        id: "00000000-0000-0000-0000-000000000000",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("admin-pages: isSystem protections", () => {
  it("delete throws BAD_REQUEST for system pages", async () => {
    const systemRow = {
      id: "11111111-1111-1111-1111-111111111111",
      slug: "about",
      title: "About",
      body: "",
      bodyFormat: "markdown" as const,
      seoTitle: null,
      seoDescription: null,
      status: "draft",
      isSystem: true,
      updatedByUserId: "u_admin",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const limit = vi.fn().mockResolvedValue([systemRow]);
    const where = vi.fn().mockReturnValue({ limit });
    const from = vi.fn().mockReturnValue({ where });
    const select = vi.fn().mockReturnValue({ from });
    const deleteWhere = vi.fn().mockResolvedValue(undefined);
    const del = vi.fn().mockReturnValue({ where: deleteWhere });
    const insertValues = vi.fn().mockResolvedValue(undefined);
    const insert = vi.fn().mockReturnValue({ values: insertValues });

    const db = { select, delete: del, insert };
    const caller = createCaller(buildCtx({ role: "admin", db }));

    await expect(
      caller.admin.pages.delete({ id: systemRow.id }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });

    expect(del).not.toHaveBeenCalled();
  });

  it("update of system page slug throws BAD_REQUEST", async () => {
    const systemRow = {
      id: "22222222-2222-2222-2222-222222222222",
      slug: "privacy",
      title: "Privacy",
      body: "",
      bodyFormat: "markdown" as const,
      seoTitle: null,
      seoDescription: null,
      status: "draft",
      isSystem: true,
      updatedByUserId: "u_admin",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const limit = vi.fn().mockResolvedValue([systemRow]);
    const where = vi.fn().mockReturnValue({ limit });
    const from = vi.fn().mockReturnValue({ where });
    const select = vi.fn().mockReturnValue({ from });
    const updateReturning = vi.fn().mockResolvedValue([systemRow]);
    const updateWhere = vi.fn().mockReturnValue({ returning: updateReturning });
    const updateSet = vi.fn().mockReturnValue({ where: updateWhere });
    const update = vi.fn().mockReturnValue({ set: updateSet });
    const insertValues = vi.fn().mockResolvedValue(undefined);
    const insert = vi.fn().mockReturnValue({ values: insertValues });

    const db = { select, update, insert };
    const caller = createCaller(buildCtx({ role: "admin", db }));

    await expect(
      caller.admin.pages.update({
        id: systemRow.id,
        slug: "different-slug",
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });

    expect(update).not.toHaveBeenCalled();
  });
});
