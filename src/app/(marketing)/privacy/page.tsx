import type { Metadata } from "next";
import { SiteHeader } from "@/components/marketing/site-header";

export const metadata: Metadata = {
  title: "Privacy",
  description: "Energized privacy policy.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main
        className="v2-container"
        style={{ padding: "80px 0 120px", flex: 1 }}
      >
        <div className="v2-eyebrow">Legal</div>
        <h1 className="v2-display" style={{ marginTop: 16 }}>
          Privacy policy
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
          We&rsquo;re drafting our privacy policy. In the meantime, reach us at{" "}
          <a
            href="mailto:dev@energized.biz"
            style={{ color: "var(--v2-accent-deep)" }}
          >
            dev@energized.biz
          </a>{" "}
          with any questions about how we handle your data.
        </p>
      </main>
    </>
  );
}
