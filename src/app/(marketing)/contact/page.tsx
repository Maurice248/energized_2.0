import type { Metadata } from "next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { SiteHeader } from "@/components/marketing/site-header";
import { CmsPageBody } from "@/components/marketing/cms-page-body";
import { db } from "@/server/db";
import { platformSettings } from "@/server/db/schema";
import {
  buildMarketingMetadata,
  loadMarketingPage,
} from "@/components/marketing/cms-marketing-page";
import { ContactForm } from "./contact-form";
import { ContactSidebar } from "./contact-sidebar";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return buildMarketingMetadata("contact");
}

const FALLBACK_EMAIL = "dev@energized.biz";

function splitMarkdownIntro(body: string): { lede: string; rest: string } {
  const text = body.replace(/\r\n/g, "\n").trim();
  const idx = text.search(/\n#{1,6}\s|\n\s*\n/);
  if (idx === -1) return { lede: text, rest: "" };
  return { lede: text.slice(0, idx).trim(), rest: text.slice(idx).trim() };
}

function EmphasizedTitle({ title }: { title: string }) {
  const words = title.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;
  if (words.length === 1) return <em>{words[0]}</em>;
  const last = words[words.length - 1]!;
  return (
    <>
      {words.slice(0, -1).join(" ")} <em>{last}</em>
    </>
  );
}

async function loadChannels() {
  try {
    const [row] = await db
      .select({
        email: platformSettings.siteEmail,
        phone: platformSettings.sitePhone,
        address: platformSettings.siteAddress,
      })
      .from(platformSettings)
      .limit(1);
    return {
      email: row?.email?.trim() || FALLBACK_EMAIL,
      phone: row?.phone?.trim() || null,
      address: row?.address?.trim() || null,
    };
  } catch {
    return { email: FALLBACK_EMAIL, phone: null, address: null };
  }
}

export default async function ContactPage() {
  const [channels, cms] = await Promise.all([
    loadChannels(),
    loadMarketingPage("contact"),
  ]);
  const intro =
    cms.bodyFormat === "markdown"
      ? splitMarkdownIntro(cms.body)
      : { lede: "", rest: cms.body };

  return (
    <>
      <SiteHeader active="contact" />
      <main className="v2-contact" style={{ flex: 1 }}>
        <section className="v2-contact-hero">
          <div className="v2-container">
            <div className="v2-contact-hero-grid">
              <div>
                <div className="v2-eyebrow">{cms.eyebrow}</div>
                <h1 className="v2-contact-headline">
                  <EmphasizedTitle title={cms.title} />
                </h1>
              </div>
              {cms.bodyFormat === "markdown" && intro.lede ? (
                <div className="v2-contact-lede">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {intro.lede}
                  </ReactMarkdown>
                </div>
              ) : cms.bodyFormat === "html" ? (
                <div className="v2-contact-lede">
                  <CmsPageBody body={cms.body} bodyFormat="html" />
                </div>
              ) : null}
            </div>
          </div>
        </section>

        {cms.bodyFormat === "markdown" && intro.rest ? (
          <section>
            <div className="v2-container">
              <CmsPageBody body={intro.rest} bodyFormat="markdown" />
            </div>
          </section>
        ) : null}

        <section>
          <div className="v2-container">
            <div className="v2-contact-main">
              <ContactForm />
              <ContactSidebar channels={channels} />
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
