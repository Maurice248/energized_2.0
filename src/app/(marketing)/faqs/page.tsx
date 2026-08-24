import type { Metadata } from "next";
import Link from "next/link";
import { api } from "@/lib/trpc/server";
import { SiteHeader } from "@/components/marketing/site-header";
import { FaqsList, type PublicFaq } from "@/components/marketing/faqs-list";

export const dynamic = "force-dynamic";

const TITLE = "FAQs";
const DESCRIPTION =
  "Answers for Canadian energy job seekers and employers — profiles, applications, billing, and privacy on Energized.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/faqs" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/faqs" },
};

function jsonLd(items: PublicFaq[]): string {
  const payload = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text:
          item.answerFormat === "html"
            ? item.answer.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
            : item.answer.replace(/\s+/g, " ").trim(),
      },
    })),
  };
  return JSON.stringify(payload).replace(/</g, "\\u003c");
}

export default async function FaqsPage() {
  const items = await api.faqs.list();

  return (
    <>
      <SiteHeader />
      {items.length > 0 ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(items) }}
        />
      ) : null}
      <main className="v2-faq-page">
        <section className="v2-faq">
          <div className="v2-container">
            <div className="v2-faq-head">
              <h1>
                Questions, <em>answered.</em>
              </h1>
              <p>
                Straight answers for job seekers and hiring teams on Energized —
                tickets, applications, billing, and how your data is used.
              </p>
            </div>

            <FaqsList items={items} />

            <div className="v2-faq-stuck">
              <div>
                <h2>
                  Still <em>stuck?</em>
                </h2>
                <p>
                  Write us and we&rsquo;ll get a human on it — usually within
                  one business day.
                </p>
              </div>
              <div className="v2-faq-stuck-actions">
                <Link href="/contact" className="v2-btn v2-btn-accent">
                  Contact us
                </Link>
                <a
                  href="mailto:dev@energized.biz"
                  className="v2-btn v2-btn-ghost-on-dark"
                >
                  Email support
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
