"use client";

import { useEffect, useRef } from "react";
import { api } from "@/lib/trpc/client";
import { Icon } from "@/components/shared/icon";

export function IntroContactPanel({
  candidateUserId,
}: {
  candidateUserId: string;
}) {
  const q = api.introRequests.contactForCandidate.useQuery(
    { candidateUserId },
    { staleTime: 30_000 },
  );
  const fired = useRef(false);

  useEffect(() => {
    if (!fired.current && q.data?.unlocked === true) {
      fired.current = true;
      // TODO: Task 16 — wire PostHog `intro.contact_unlocked.viewed` event
    }
  }, [q.data, candidateUserId]);

  if (q.isLoading) {
    return (
      <div className="pub-cta-stack">
        <div style={{ fontSize: 13, color: "var(--v2-ink-700)" }}>Loading contact…</div>
      </div>
    );
  }
  if (!q.data || !q.data.unlocked) {
    return null;
  }

  return (
    <div
      className="pub-cta-stack"
      style={{
        background: "white",
        border: "1px solid var(--v2-ink-200)",
        borderRadius: 12,
        padding: 14,
        gap: 10,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 700, color: "#101820", display: "flex", alignItems: "center", gap: 6 }}>
        <Icon name="check" size={14} /> Contact unlocked
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <ContactRow icon="mail" label="Email" value={q.data.email} hrefScheme="mailto:" />
        {q.data.phone && (
          <ContactRow icon="phone" label="Phone" value={q.data.phone} hrefScheme="tel:" />
        )}
        {q.data.resumeUrl && (
          <ResumeRow url={q.data.resumeUrl} filename={q.data.resumeFilename ?? "resume.pdf"} />
        )}
      </div>
      <div style={{ fontSize: 11, color: "var(--v2-ink-700)" }}>
        Unlocked on {new Date(q.data.acceptedAt).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" })}.
      </div>
    </div>
  );
}

function ContactRow({
  icon,
  label,
  value,
  hrefScheme,
}: {
  icon: "mail" | "phone";
  label: string;
  value: string;
  hrefScheme: "mailto:" | "tel:";
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
      <Icon name={icon} size={14} />
      <span style={{ color: "var(--v2-ink-700)", minWidth: 50 }}>{label}</span>
      <a href={`${hrefScheme}${value}`} style={{ color: "#1CAAE2", textDecoration: "none" }}>
        {value}
      </a>
    </div>
  );
}

function ResumeRow({ url, filename }: { url: string; filename: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
      <Icon name="fileText" size={14} />
      <span style={{ color: "var(--v2-ink-700)", minWidth: 50 }}>Resume</span>
      <a
        href={url}
        download={filename}
        target="_blank"
        rel="noreferrer"
        style={{ color: "#1CAAE2", textDecoration: "none" }}
      >
        {filename}
      </a>
    </div>
  );
}
