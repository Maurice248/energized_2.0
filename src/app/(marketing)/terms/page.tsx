import type { Metadata } from "next";
import { SiteHeader } from "@/components/marketing/site-header";

export const metadata: Metadata = {
  title: "Terms",
  description: "Energized terms of service.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <>
      <SiteHeader />
      <main
        className="v2-container"
        style={{ padding: "80px 0 120px", flex: 1 }}
      >
        <div className="v2-eyebrow">Legal</div>
        <h1 className="v2-display" style={{ marginTop: 16 }}>
          Terms of service
        </h1>
        <p
          style={{
            marginTop: 24,
            fontSize: 18,
            color: "var(--v2-ink-500)",
            maxWidth: 640,
            lineHeight: 1.6,
          }}
        >
          We&rsquo;re drafting our terms of service. In the meantime, reach us
          at{" "}
          <a
            href="mailto:dev@energized.biz"
            style={{ color: "var(--v2-accent-deep)" }}
          >
            dev@energized.biz
          </a>{" "}
          with any questions about using Energized.
        </p>
      </main>
    </>
  );
}
