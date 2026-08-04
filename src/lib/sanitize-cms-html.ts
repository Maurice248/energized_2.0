import sanitizeHtml from "sanitize-html";

/**
 * Sanitize HTML authored in the admin CMS before persist and before
 * `dangerouslySetInnerHTML` on the public site.
 */
export function sanitizeCmsHtml(dirty: string): string {
  return sanitizeHtml(dirty, {
    allowedTags: [
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
    ],
    allowedAttributes: {
      "*": ["class"],
      a: ["href", "target", "rel"],
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
  });
}
