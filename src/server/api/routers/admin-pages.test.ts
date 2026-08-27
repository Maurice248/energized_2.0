import { describe, it, expect, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import {
  MARKETING_STATIC_SLUGS,
  RESERVED_SLUGS,
  contactEmailSchema,
  slugSchema,
} from "./admin-pages";
import { PUBLIC_CONTACT_EMAIL } from "@/lib/public-contact-email";
import { DEFAULT_SITE_FOOTER } from "@/lib/site-footer";
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

describe("admin-pages: contactEmailSchema", () => {
  it("accepts a valid email", () => {
    expect(contactEmailSchema.safeParse("hello@energized.biz").success).toBe(
      true,
    );
  });

  it("trims whitespace", () => {
    const parsed = contactEmailSchema.safeParse("  hello@energized.biz  ");
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data).toBe("hello@energized.biz");
  });

  it("rejects empty and invalid values", () => {
    expect(contactEmailSchema.safeParse("").success).toBe(false);
    expect(contactEmailSchema.safeParse("not-an-email").success).toBe(false);
    expect(contactEmailSchema.safeParse("dev@").success).toBe(false);
  });
});

describe("admin-pages: contact email", () => {
  it("rejects non-admin callers on getContactEmail", async () => {
    const caller = createCaller(buildCtx({ role: "jobseeker" }));
    await expect(caller.admin.pages.getContactEmail()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("rejects non-admin callers on updateContactEmail", async () => {
    const caller = createCaller(buildCtx({ role: "employer" }));
    await expect(
      caller.admin.pages.updateContactEmail({ email: "hello@energized.biz" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("getContactEmail returns the stored site email", async () => {
    const limit = vi.fn().mockResolvedValue([{ email: "inbox@energized.biz" }]);
    const from = vi.fn().mockReturnValue({ limit });
    const select = vi.fn().mockReturnValue({ from });
    const caller = createCaller(buildCtx({ db: { select } }));

    await expect(caller.admin.pages.getContactEmail()).resolves.toEqual({
      email: "inbox@energized.biz",
    });
  });

  it("getContactEmail falls back when siteEmail is empty", async () => {
    const limit = vi.fn().mockResolvedValue([{ email: "  " }]);
    const from = vi.fn().mockReturnValue({ limit });
    const select = vi.fn().mockReturnValue({ from });
    const caller = createCaller(buildCtx({ db: { select } }));

    await expect(caller.admin.pages.getContactEmail()).resolves.toEqual({
      email: PUBLIC_CONTACT_EMAIL,
    });
  });

  it("updateContactEmail writes siteEmail on an existing settings row", async () => {
    const settingsId = "33333333-3333-3333-3333-333333333333";
    const selectLimit = vi.fn().mockResolvedValue([{ id: settingsId }]);
    const selectFrom = vi.fn().mockReturnValue({ limit: selectLimit });
    const select = vi.fn().mockReturnValue({ from: selectFrom });

    const updateReturning = vi.fn().mockResolvedValue([{ id: settingsId }]);
    const updateWhere = vi.fn().mockReturnValue({ returning: updateReturning });
    const updateSet = vi.fn().mockReturnValue({ where: updateWhere });
    const update = vi.fn().mockReturnValue({ set: updateSet });

    const insertValues = vi.fn().mockResolvedValue(undefined);
    const insert = vi.fn().mockReturnValue({ values: insertValues });

    const caller = createCaller(
      buildCtx({ db: { select, update, insert } }),
    );

    await expect(
      caller.admin.pages.updateContactEmail({ email: "new@energized.biz" }),
    ).resolves.toEqual({ email: "new@energized.biz" });

    expect(updateSet).toHaveBeenCalledWith(
      expect.objectContaining({ siteEmail: "new@energized.biz" }),
    );
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "platform_settings.site_email.updated",
        entityId: settingsId,
      }),
    );
  });

  it("updateContactEmail inserts a settings row when none exists", async () => {
    const settingsId = "44444444-4444-4444-4444-444444444444";
    const selectLimit = vi.fn().mockResolvedValue([]);
    const selectFrom = vi.fn().mockReturnValue({ limit: selectLimit });
    const select = vi.fn().mockReturnValue({ from: selectFrom });

    const insertReturning = vi
      .fn()
      .mockResolvedValueOnce([{ id: settingsId }])
      .mockResolvedValueOnce(undefined);
    const insertValues = vi.fn().mockReturnValue({ returning: insertReturning });
    const insert = vi.fn().mockReturnValue({ values: insertValues });

    const caller = createCaller(buildCtx({ db: { select, insert } }));

    await expect(
      caller.admin.pages.updateContactEmail({ email: "fresh@energized.biz" }),
    ).resolves.toEqual({ email: "fresh@energized.biz" });

    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ siteEmail: "fresh@energized.biz" }),
    );
  });
});

describe("admin-pages: footer", () => {
  it("rejects non-admin callers on getFooter", async () => {
    const caller = createCaller(buildCtx({ role: "jobseeker" }));
    await expect(caller.admin.pages.getFooter()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("getFooter returns defaults when footer is null", async () => {
    const limit = vi.fn().mockResolvedValue([{ footer: null }]);
    const from = vi.fn().mockReturnValue({ limit });
    const select = vi.fn().mockReturnValue({ from });
    const caller = createCaller(buildCtx({ db: { select } }));

    await expect(caller.admin.pages.getFooter()).resolves.toEqual(
      DEFAULT_SITE_FOOTER,
    );
  });

  it("updateFooter writes the footer JSON on an existing settings row", async () => {
    const settingsId = "55555555-5555-5555-5555-555555555555";
    const selectLimit = vi.fn().mockResolvedValue([{ id: settingsId }]);
    const selectFrom = vi.fn().mockReturnValue({ limit: selectLimit });
    const select = vi.fn().mockReturnValue({ from: selectFrom });

    const updateReturning = vi.fn().mockResolvedValue([{ id: settingsId }]);
    const updateWhere = vi.fn().mockReturnValue({ returning: updateReturning });
    const updateSet = vi.fn().mockReturnValue({ where: updateWhere });
    const update = vi.fn().mockReturnValue({ set: updateSet });

    const insertValues = vi.fn().mockResolvedValue(undefined);
    const insert = vi.fn().mockReturnValue({ values: insertValues });

    const caller = createCaller(buildCtx({ db: { select, update, insert } }));
    const payload = {
      ...DEFAULT_SITE_FOOTER,
      tagline: "Updated tagline for Canada's energy network.",
    };

    await expect(caller.admin.pages.updateFooter(payload)).resolves.toMatchObject({
      tagline: payload.tagline,
    });

    expect(updateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        footer: expect.objectContaining({ tagline: payload.tagline }),
      }),
    );
  });
});
