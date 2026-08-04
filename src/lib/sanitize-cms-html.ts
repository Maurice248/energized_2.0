import sanitizeHtml from "sanitize-html";

const CMS_ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "strike",
  "h1",
  "h2",
  "h3",
  "h4",
  "ul",
  "ol",
  "li",
  "a",
  "blockquote",
  "div",
  "span",
  "pre",
  "code",
  "hr",
] as const;

const CMS_ALLOWED_ATTRIBUTES: Record<string, string[]> = {
  a: ["href", "target", "rel", "class"],
  blockquote: ["class"],
  code: ["class"],
  div: ["class"],
  h1: ["class"],
  h2: ["class"],
  h3: ["class"],
  h4: ["class"],
  li: ["class"],
  ol: ["class"],
  p: ["class"],
  pre: ["class"],
  span: ["class"],
  strong: ["class"],
  ul: ["class"],
};

/**
 * Sanitize HTML authored in the admin CMS before persist and before
 * `dangerouslySetInnerHTML` on the public site.
 *
 * Uses `sanitize-html` (no jsdom) so SSR works on Vercel serverless.
 */
export function sanitizeCmsHtml(dirty: string): string {
  return sanitizeHtml(dirty, {
    allowedTags: [...CMS_ALLOWED_TAGS],
    allowedAttributes: CMS_ALLOWED_ATTRIBUTES,
    allowedSchemes: ["http", "https", "mailto"],
    allowProtocolRelative: false,
  });
}
