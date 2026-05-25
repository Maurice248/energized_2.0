import type { CSSProperties } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { classifyStoredHtmlBody } from "@/lib/cms-page-sections";
import { sanitizeCmsHtml } from "@/lib/sanitize-cms-html";

const proseStyle: CSSProperties = {
  marginTop: 28,
  fontSize: 17,
  lineHeight: 1.65,
  maxWidth: 720,
  color: "var(--v2-ink-700, inherit)",
};

type CmsBodyFormat = "markdown" | "html";

type Props = {
  body: string;
  bodyFormat: CmsBodyFormat;
};

export function CmsPageBody({ body, bodyFormat }: Props) {
  if (bodyFormat === "html") {
    const classified = classifyStoredHtmlBody(body);
    if (classified.kind === "sections") {
      return (
        <div className="v2-prose" style={proseStyle}>
          {classified.sections.map((s) => (
            <section key={s.id} className="cms-page-section">
              {s.title.trim().length > 0 ? (
                <h2 className="v2-display" style={{ fontSize: "1.5rem", marginTop: 32 }}>
                  {s.title}
                </h2>
              ) : null}
              <div
                dangerouslySetInnerHTML={{
                  __html: sanitizeCmsHtml(s.content),
                }}
              />
            </section>
          ))}
        </div>
      );
    }
    return (
      <div
        className="v2-prose"
        style={proseStyle}
        dangerouslySetInnerHTML={{ __html: sanitizeCmsHtml(classified.html) }}
      />
    );
  }

  return (
    <div className="v2-prose" style={proseStyle}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
    </div>
  );
}
