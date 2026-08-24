"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { sanitizeCmsHtml } from "@/lib/sanitize-cms-html";

type Props = {
  answer: string;
  answerFormat: "markdown" | "html";
};

export function FaqAnswerBody({ answer, answerFormat }: Props) {
  const trimmed = answer.trim();
  if (trimmed.length === 0) return null;

  if (answerFormat === "html") {
    return (
      <div
        className="v2-faq-a-body"
        dangerouslySetInnerHTML={{ __html: sanitizeCmsHtml(trimmed) }}
      />
    );
  }

  return (
    <div className="v2-faq-a-body">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{trimmed}</ReactMarkdown>
    </div>
  );
}
