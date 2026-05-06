import type { Metadata } from "next";
import { SiteHeader } from "@/components/marketing/site-header";

export const metadata: Metadata = {
  title: "Accessibility",
  description: "Energized accessibility commitment.",
  alternates: { canonical: "/accessibility" },
};

export default function AccessibilityPage() {
  return (
    <>
      <SiteHeader />
      <main
        className="v2-container"
        style={{ padding: "80px 0 120px", flex: 1 }}
      >
        <div className="v2-eyebrow">Accessibility</div>
        <h1 className="v2-display" style={{ marginTop: 16 }}>
          Accessibility commitment
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
          We&rsquo;re committed to making Energized usable for everyone. If you
          run into a barrier, please write us at{" "}
          <a
            href="mailto:dev@energized.biz"
            style={{ color: "var(--v2-accent-deep)" }}
          >
            dev@energized.biz
          </a>{" "}
          and we&rsquo;ll fix it.
        </p>
      </main>
    </>
  );
}
