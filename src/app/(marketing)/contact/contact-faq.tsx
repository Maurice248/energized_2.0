"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/shared/icon";

type FaqBlock = string | { list: string[] };
type FaqEntry = {
  cat: "seekers" | "employers" | "billing" | "privacy" | "general";
  tag: string;
  q: string;
  a: FaqBlock[];
};

// Honest answers for what we ship today. Update when product changes.
const FAQ_DATA: FaqEntry[] = [
  {
    cat: "seekers",
    tag: "Seekers",
    q: "Is Energized free for jobseekers?",
    a: [
      "Yes. Applying to roles, AI-assisted match scoring, saved searches, and your public profile are all free — no credit card needed.",
      "Paid jobseeker tiers (skills assessments, recruiter messaging, coaching) are on the roadmap but not live yet. The free tier covers the entire core search-and-apply experience.",
    ],
  },
  {
    cat: "seekers",
    tag: "Seekers",
    q: "How does match scoring work?",
    a: [
      "We score every published role against your profile rather than running a keyword search. The signals that weigh heaviest:",
      {
        list: [
          "Sectors you tagged (oil & gas, renewables, nuclear, utilities, hydrogen, power)",
          "Certifications and tickets surfaced on your profile (H2S Alive, Red Seal, P.Eng, NACE, etc.)",
          "Work history depth and skills overlap with the role's requirements",
        ],
      },
      "You'll see why each role surfaced for you alongside its match score.",
    ],
  },
  {
    cat: "seekers",
    tag: "Seekers",
    q: "Which certifications and tickets are first-class on a profile?",
    a: [
      "H2S Alive, First Aid, CSTS, Red Seal, P.Eng, NACE, Fall Protection — these are the credentials energy hiring managers actually filter on, so they're structured fields rather than free text.",
      "If a ticket you carry isn't in our list, add it as a custom certification and we'll periodically promote popular ones to first-class.",
    ],
  },
  {
    cat: "employers",
    tag: "Employers",
    q: "How does pricing work for employers?",
    a: [
      "Three monthly subscription tiers, all in CAD:",
      {
        list: [
          "Package A — C$299/mo, 1 published role per cycle",
          "Package B — C$549/mo, 3 published roles per cycle",
          "Package C — C$749/mo, 5 published roles per cycle",
        ],
      },
      "Stripe-managed, monthly billing, cancel any time from your billing page. No per-hire bounty, no per-applicant fees.",
    ],
  },
  {
    cat: "employers",
    tag: "Employers",
    q: "Can I draft and preview a role before paying?",
    a: [
      "Yes. The job-posting wizard saves drafts as you type and lets you preview the full public-facing role page. Publishing — making the role visible to candidates — is what requires an active subscription.",
      "Once published, you get the applicant pipeline, kanban, recruiter seats, and email automations as part of the same subscription.",
    ],
  },
  {
    cat: "billing",
    tag: "Billing",
    q: "Can I cancel my employer subscription mid-cycle?",
    a: [
      "Yes. Cancel any time from the billing section of your employer profile. The subscription stays active through the end of your current billing cycle, then doesn't renew. Published roles stay live until the cycle ends.",
      "We don't pro-rate refunds for partial months. If you need an exception (org change, error), email us — we work things out.",
    ],
  },
  {
    cat: "privacy",
    tag: "Privacy",
    q: "Who can see my profile and resume?",
    a: [
      "Your public profile page (/p/your-id) is viewable by anyone with the link, and it's surfaced to recruiters when you apply to their roles. The profile shows your headline, sectors, certifications, and work history — the things you'd put on a resume anyway.",
      "Your uploaded resume file is private to you and the specific employers you've applied to. We don't sell candidate data, and we don't share your details with third parties.",
    ],
  },
  {
    cat: "privacy",
    tag: "Privacy",
    q: "Where is my data stored?",
    a: [
      "Candidate and customer data lives in Neon Postgres (US region) and Vercel Blob for file uploads. Application traffic runs through Vercel's Canadian edge regions wherever possible.",
      "Right-to-be-forgotten requests are honored — email dev@energized.biz with the subject 'Data deletion' and we'll process within seven days.",
    ],
  },
  {
    cat: "general",
    tag: "General",
    q: "Is Energized Canada-only?",
    a: [
      "Yes. Our match data and the structured ticket/certification list are sharpest for Canadian energy hiring. Cross-border roles with a Canadian-entity employer are supported, and FIFO international rotations originating from Canadian airports are listed.",
      "International expansion isn't on the near-term roadmap — we'd rather be excellent for Canada first.",
    ],
  },
  {
    cat: "general",
    tag: "General",
    q: "How do I contact support?",
    a: [
      "Email dev@energized.biz, or use the form above. We read every message and reply within one business day.",
    ],
  },
];

const TABS = [
  { id: "all" as const, label: "All" },
  { id: "seekers" as const, label: "Job seekers" },
  { id: "employers" as const, label: "Employers" },
  { id: "billing" as const, label: "Billing" },
  { id: "privacy" as const, label: "Privacy" },
  { id: "general" as const, label: "General" },
];

type TabId = (typeof TABS)[number]["id"];

export function ContactFaq() {
  const [filter, setFilter] = useState<TabId>("all");
  const [query, setQuery] = useState("");
  const [openIdx, setOpenIdx] = useState<number>(0);

  const filtered = useMemo(() => {
    return FAQ_DATA.filter((f) => {
      if (filter !== "all" && f.cat !== filter) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        if (f.q.toLowerCase().includes(q)) return true;
        return f.a.some(
          (b) => typeof b === "string" && b.toLowerCase().includes(q),
        );
      }
      return true;
    });
  }, [filter, query]);

  const tabsWithCounts = TABS.map((t) => ({
    ...t,
    count:
      t.id === "all"
        ? FAQ_DATA.length
        : FAQ_DATA.filter((f) => f.cat === t.id).length,
  }));

  return (
    <section className="v2-faq">
      <div className="v2-container">
        <div className="v2-faq-head">
          <div>
            <div className="v2-eyebrow">Frequently asked</div>
            <h2 style={{ marginTop: 16 }}>
              Answers to the <em>questions</em> that hit our inbox most.
            </h2>
          </div>
          <p>
            Updated regularly based on what people actually ask. Can&rsquo;t
            find what you&rsquo;re looking for? Send a message above —
            we&rsquo;ll add it here.
          </p>
        </div>

        <div className="v2-faq-search">
          <Icon name="search" size={18} />
          <input
            type="text"
            placeholder="Search the FAQ — try 'pricing' or 'cancel'…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="v2-faq-tabs">
          {tabsWithCounts.map((t) => (
            <button
              type="button"
              key={t.id}
              className={`v2-faq-tab ${filter === t.id ? "active" : ""}`}
              onClick={() => {
                setFilter(t.id);
                setOpenIdx(-1);
              }}
            >
              {t.label}
              <span className="count">
                {String(t.count).padStart(2, "0")}
              </span>
            </button>
          ))}
        </div>

        <div className="v2-faq-list">
          {filtered.length === 0 && (
            <div
              style={{
                padding: "48px 16px",
                textAlign: "center",
                color: "var(--v2-ink-500)",
              }}
            >
              <p
                style={{
                  fontFamily: "var(--v2-font-serif)",
                  fontSize: 24,
                  color: "var(--v2-ink-950)",
                  marginBottom: 8,
                }}
              >
                Nothing matches &ldquo;
                <em
                  style={{
                    fontStyle: "italic",
                    color: "var(--v2-accent-deep)",
                  }}
                >
                  {query}
                </em>
                &rdquo;.
              </p>
              <p style={{ fontSize: 14 }}>
                Drop the question into the form above and we&rsquo;ll
                answer it directly.
              </p>
            </div>
          )}
          {filtered.map((item, i) => (
            <FaqItem
              key={item.q}
              item={item}
              index={i}
              open={openIdx === i}
              onToggle={() => setOpenIdx(openIdx === i ? -1 : i)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function FaqItem({
  item,
  index,
  open,
  onToggle,
}: {
  item: FaqEntry;
  index: number;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className={`v2-faq-item ${open ? "open" : ""}`}>
      <button
        type="button"
        className="v2-faq-q"
        onClick={onToggle}
        aria-expanded={open}
      >
        <span className="v2-faq-num">
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className="v2-faq-text">{item.q}</span>
        <span className={`v2-faq-tag ${item.cat}`}>{item.tag}</span>
        <span className="v2-faq-toggle" aria-hidden="true">
          <span className="bar h" />
          <span className="bar v" />
        </span>
      </button>
      {open && (
        <div className="v2-faq-a">
          <div className="v2-faq-a-body">
            {item.a.map((block, i) => {
              if (typeof block === "string") {
                return <p key={i}>{block}</p>;
              }
              return (
                <ul key={i}>
                  {block.list.map((li, j) => (
                    <li key={j}>{li}</li>
                  ))}
                </ul>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
