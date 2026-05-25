import DOMPurify from "isomorphic-dompurify";

/**
 * Sanitize HTML authored in the admin CMS before persist and before
 * `dangerouslySetInnerHTML` on the public site.
 */
export function sanitizeCmsHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
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
    ALLOWED_ATTR: ["href", "target", "rel", "class"],
    ALLOW_DATA_ATTR: false,
  });
}
