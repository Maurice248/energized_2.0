import { FaqAnswerBody } from "@/components/marketing/faq-answer-body";

export type PublicFaq = {
  id: string;
  category: "general" | "seekers" | "employers" | "billing" | "privacy";
  question: string;
  answer: string;
  answerFormat: "markdown" | "html";
  supportArticleUrl: string | null;
  sortOrder: number;
};

const TAG_LABEL: Record<PublicFaq["category"], string> = {
  general: "General",
  seekers: "Seekers",
  employers: "Employers",
  billing: "Billing",
  privacy: "Privacy",
};

type Props = {
  item: PublicFaq;
  index: number;
};

export function FaqItem({ item, index }: Props) {
  return (
    <details className="v2-faq-item">
      <summary className="v2-faq-q">
        <span className="v2-faq-num">{String(index + 1).padStart(2, "0")}</span>
        <span className="v2-faq-text">{item.question}</span>
        <span
          className={`v2-faq-tag${item.category === "general" ? "" : ` ${item.category}`}`}
        >
          {TAG_LABEL[item.category]}
        </span>
        <span className="v2-faq-toggle" aria-hidden>
          <span className="bar h" />
          <span className="bar v" />
        </span>
      </summary>
      <div className="v2-faq-a">
        <FaqAnswerBody answer={item.answer} answerFormat={item.answerFormat} />
        {item.supportArticleUrl ? (
          <div className="v2-faq-a-foot">
            <a
              href={item.supportArticleUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Read the full article →
            </a>
          </div>
        ) : null}
      </div>
    </details>
  );
}
