import { describe, it, expect } from "vitest";
import { sanitizeCmsHtml } from "./sanitize-cms-html";

describe("sanitizeCmsHtml", () => {
  it("strips script tags and keeps safe markup", () => {
    const dirty =
      '<p>Hello</p><script>alert(1)</script><a href="https://x.com" onclick="evil()">x</a>';
    const clean = sanitizeCmsHtml(dirty);
    expect(clean).not.toMatch(/script/i);
    expect(clean).not.toMatch(/onclick/i);
    expect(clean).toMatch(/Hello/);
    expect(clean).toMatch(/href="https:\/\/x.com"/);
  });

  it("allows basic rich-text tags", () => {
    const html = "<h2>Title</h2><p><strong>Bold</strong> and <em>em</em></p><ul><li>a</li></ul>";
    expect(sanitizeCmsHtml(html)).toContain("<h2>");
    expect(sanitizeCmsHtml(html)).toContain("<strong>");
  });
});
