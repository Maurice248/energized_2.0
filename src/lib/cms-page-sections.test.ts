import { describe, expect, it } from "vitest";
import {
  classifyStoredHtmlBody,
  normalizeStoredCmsBody,
  parseCmsSectionsFromBody,
  serializeHtmlSectionsToStoredBody,
} from "./cms-page-sections";

describe("cms-page-sections", () => {
  it("parses markdown as a single virtual section", () => {
    const out = parseCmsSectionsFromBody("# Hi", "markdown", "Privacy");
    expect(out).toHaveLength(1);
    expect(out[0]!.id).toBe("markdown-body");
    expect(out[0]!.content).toBe("# Hi");
  });

  it("parses JSON section documents", () => {
    const raw = JSON.stringify([
      { id: "a", type: "text", title: "T", content: "<p>x</p>", order: 1 },
      { id: "b", type: "text", title: "U", content: "<p>y</p>", order: 0 },
    ]);
    const out = parseCmsSectionsFromBody(raw, "html", "X");
    expect(out.map((s) => s.id)).toEqual(["b", "a"]);
  });

  it("classifies HTML legacy blob as plain", () => {
    const c = classifyStoredHtmlBody("<p>ok</p>");
    expect(c.kind).toBe("plain");
    if (c.kind === "plain") expect(c.html).toBe("<p>ok</p>");
  });

  it("normalizes JSON bodies by sanitizing nested HTML only", () => {
    const raw = JSON.stringify([
      {
        id: "a",
        type: "text",
        title: "T",
        content: '<p onclick="evil">x</p>',
        order: 0,
      },
    ]);
    const next = normalizeStoredCmsBody(raw, "html");
    const parsed = JSON.parse(next) as { content: string }[];
    expect(parsed[0]!.content).not.toContain("onclick");
  });

  it("serializes sections with stable order indices", () => {
    const s = serializeHtmlSectionsToStoredBody([
      {
        id: "z",
        type: "text",
        title: "",
        content: "",
        order: 9,
      },
      {
        id: "a",
        type: "text",
        title: "",
        content: "",
        order: 1,
      },
    ]);
    const arr = JSON.parse(s) as { id: string; order: number }[];
    expect(arr.map((x) => x.id)).toEqual(["a", "z"]);
    expect(arr.map((x) => x.order)).toEqual([0, 1]);
  });
});
