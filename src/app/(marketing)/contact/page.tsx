import type { Metadata } from "next";
import { SiteHeader } from "@/components/marketing/site-header";
import { ContactForm } from "./contact-form";
import { ContactFaq } from "./contact-faq";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with the Energized team — we read every message and reply within one business day.",
  alternates: { canonical: "/contact" },
};

const HERO_STATS = [
  { k: "Reply time", v: <><em>&lt; 1</em> business day</> },
  { k: "Read by", v: <em>Humans</em> },
  { k: "Languages", v: <>EN</> },
  { k: "Inbox", v: <>dev@energized.biz</> },
];

export default function ContactPage() {
  return (
    <>
      <SiteHeader active="contact" />
      <main className="v2-contact" style={{ flex: 1 }}>
        <Hero />
        <section>
          <div className="v2-container">
            <div
              className="v2-contact-main"
              style={{ gridTemplateColumns: "1fr" }}
            >
              <ContactForm />
            </div>
          </div>
        </section>
        <ContactFaq />
      </main>
    </>
  );
}

function Hero() {
  return (
    <section className="v2-contact-hero">
      <div className="v2-container">
        <div className="v2-contact-hero-grid">
          <div>
            <div className="v2-eyebrow">Get in touch</div>
            <h1 className="v2-contact-headline">
              Real <em>humans</em>,
              <br />
              fast <span className="pill">replies</span>.
            </h1>
          </div>
          <p className="v2-contact-lede">
            Whether you&rsquo;re hiring fifty wind techs in Halifax or
            wondering why your match score moved —{" "}
            <strong>we read every message that comes in.</strong> We reply
            within one business day.
          </p>
        </div>

        <div className="v2-contact-strip">
          {HERO_STATS.map((s) => (
            <div key={s.k} className="v2-contact-strip-item">
              <span className="v2-contact-strip-k">{s.k}</span>
              <span
                className="v2-contact-strip-v"
                style={{
                  fontSize: s.k === "Inbox" ? 16 : undefined,
                }}
              >
                {s.v}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
