import { sanitizeCmsHtml } from "@/lib/sanitize-cms-html";

export type CmsPageSectionRecord = {
  id: string;
  type: string;
  title: string;
  content: string;
  order: number;
  isVisible?: boolean;
  data?: Record<string, unknown>;
};

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

function coerceSection(
  raw: unknown,
  index: number,
): CmsPageSectionRecord | null {
  if (!isRecord(raw)) return null;
  const id =
    typeof raw.id === "string" && raw.id.trim() ? raw.id : `section-${index}`;
  const content = typeof raw.content === "string" ? raw.content : "";
  const type =
    typeof raw.type === "string" && raw.type.trim() ? raw.type : "text";
  const title = typeof raw.title === "string" ? raw.title : "";
  const order =
    typeof raw.order === "number" && Number.isFinite(raw.order)
      ? raw.order
      : index;
  const isVisible =
    typeof raw.isVisible === "boolean" ? raw.isVisible : undefined;
  const data = isRecord(raw.data) ? raw.data : undefined;
  return { id, type, title, content, order, isVisible, data };
}

/**
 * Parse stored `pages.body` into editable sections for the admin UI.
 * - Markdown pages are always a single virtual section.
 * - HTML may be legacy full-document HTML, or a JSON array of section objects.
 */
export function parseCmsSectionsFromBody(
  body: string,
  bodyFormat: "markdown" | "html",
  pageTitleFallback: string,
): CmsPageSectionRecord[] {
  if (bodyFormat === "markdown") {
    if (!body.trim()) return [];
    return [
      {
        id: "markdown-body",
        type: "text",
        title: pageTitleFallback.trim() || "Page content",
        content: body,
        order: 0,
      },
    ];
  }

  const trimmed = body.trim();
  if (trimmed.startsWith("[")) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        const out = parsed
          .map((item, i) => coerceSection(item, i))
          .filter((x): x is CmsPageSectionRecord => x !== null);
        if (out.length > 0) {
          return [...out].sort((a, b) => a.order - b.order);
        }
        return [];
      }
    } catch {
      /* fall through */
    }
  }

  if (!trimmed) return [];
  return [
    {
      id: "legacy-html",
      type: "text",
      title: pageTitleFallback.trim() || "Page content",
      content: trimmed,
      order: 0,
    },
  ];
}

export function normalizeSectionOrders(
  sections: CmsPageSectionRecord[],
): CmsPageSectionRecord[] {
  return [...sections]
    .sort((a, b) => a.order - b.order)
    .map((s, idx) => ({ ...s, order: idx }));
}

export function serializeHtmlSectionsToStoredBody(
  sections: CmsPageSectionRecord[],
): string {
  return JSON.stringify(normalizeSectionOrders(sections));
}

function sanitizeSectionRecordsForPersist(
  sections: CmsPageSectionRecord[],
): CmsPageSectionRecord[] {
  return sections.map((s) => ({
    ...s,
    content: sanitizeCmsHtml(s.content),
  }));
}

/**
 * Normalizes HTML CMS bodies on write: legacy HTML is fully sanitized; JSON
 * section documents sanitize each section's `content` only so the JSON wrapper
 * is preserved.
 */
export function normalizeStoredCmsBody(
  raw: string,
  format: "markdown" | "html",
): string {
  if (format === "markdown") return raw;
  const trimmed = raw.trim();
  if (trimmed.startsWith("[")) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (!Array.isArray(parsed)) {
        return sanitizeCmsHtml(raw);
      }
      const coerced = parsed
        .map((item, i) => coerceSection(item, i))
        .filter((x): x is CmsPageSectionRecord => x !== null);
      if (coerced.length === 0) return "[]";
      const sanitized = sanitizeSectionRecordsForPersist(
        normalizeSectionOrders(coerced),
      );
      return JSON.stringify(sanitized);
    } catch {
      return sanitizeCmsHtml(raw);
    }
  }
  return sanitizeCmsHtml(raw);
}

export type ClassifiedHtmlBody =
  | { kind: "plain"; html: string }
  | { kind: "sections"; sections: CmsPageSectionRecord[] };

export function classifyStoredHtmlBody(body: string): ClassifiedHtmlBody {
  const trimmed = body.trim();
  if (trimmed.startsWith("[")) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        const sections = parsed
          .map((item, i) => coerceSection(item, i))
          .filter((x): x is CmsPageSectionRecord => x !== null);
        if (sections.length > 0) {
          return {
            kind: "sections",
            sections: normalizeSectionOrders(sections),
          };
        }
        return { kind: "plain", html: "" };
      }
    } catch {
      /* fall through */
    }
  }
  return { kind: "plain", html: trimmed };
}
