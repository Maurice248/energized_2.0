import { describe, expect, it } from "vitest";
import {
  DEFAULT_SITE_FOOTER,
  FOOTER_SOCIAL_CATALOG,
  FOOTER_SOCIAL_ICONS,
  footerHrefSchema,
  parseSiteFooter,
  siteFooterSchema,
} from "./site-footer";

describe("footerHrefSchema", () => {
  it("accepts internal paths, mailto, and https URLs", () => {
    expect(footerHrefSchema.safeParse("/about").success).toBe(true);
    expect(footerHrefSchema.safeParse("/sign-up?role=employer").success).toBe(true);
    expect(footerHrefSchema.safeParse("mailto:dev@energized.biz").success).toBe(true);
    expect(footerHrefSchema.safeParse("https://linkedin.com").success).toBe(true);
  });

  it("rejects protocol-relative, javascript, and empty values", () => {
    expect(footerHrefSchema.safeParse("//evil.example").success).toBe(false);
    expect(footerHrefSchema.safeParse("javascript:alert(1)").success).toBe(false);
    expect(footerHrefSchema.safeParse("").success).toBe(false);
  });
});

describe("parseSiteFooter", () => {
  it("returns defaults for null or invalid input", () => {
    expect(parseSiteFooter(null)).toEqual(DEFAULT_SITE_FOOTER);
    expect(parseSiteFooter("nope")).toEqual(DEFAULT_SITE_FOOTER);
  });

  it("keeps a valid stored footer", () => {
    const parsed = parseSiteFooter(DEFAULT_SITE_FOOTER);
    expect(siteFooterSchema.safeParse(parsed).success).toBe(true);
    expect(parsed.columns).toHaveLength(3);
    expect(parsed.social).toHaveLength(4);
  });

  it("fills missing tagline from defaults", () => {
    const parsed = parseSiteFooter({
      ...DEFAULT_SITE_FOOTER,
      tagline: "   ",
    });
    expect(parsed.tagline).toBe(DEFAULT_SITE_FOOTER.tagline);
  });
});

describe("FOOTER_SOCIAL_CATALOG", () => {
  it("covers every social icon id", () => {
    for (const id of FOOTER_SOCIAL_ICONS) {
      expect(FOOTER_SOCIAL_CATALOG[id].label.length).toBeGreaterThan(0);
      expect(FOOTER_SOCIAL_CATALOG[id].href.length).toBeGreaterThan(0);
    }
  });
});
