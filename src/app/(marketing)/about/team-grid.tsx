"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/shared/icon";

type TeamMember = {
  slug: string;
  name: string;
  role: string;
  initials: string;
  color: string;
  tag: string;
  bio: string;
  longBio: string[];
  focus: string[];
};

// TODO: replace with real team members before public launch.
// Names/bios are placeholder content from the reference design — shipping
// fictional names + fictional bios on a public site is a trust/legal risk.
// Swap in real data first.
const TEAM: TeamMember[] = [
  {
    slug: "hana-reyes",
    name: "Hana Reyes",
    role: "Co-founder & CEO",
    initials: "HR",
    color: "#1CAAE2",
    tag: "Calgary",
    bio: "12 years building hiring tech for resource industries. Former Head of Talent at PetroLink.",
    longBio: [
      "Hana spent more than a decade building talent infrastructure for Canadian energy companies — including five years leading the talent function at PetroLink, where she rebuilt their early-career pipeline from scratch.",
      "She co-founded Energized in 2026 after watching too many specialized hires fail because the platforms in market couldn't tell a senior controls engineer from a junior one.",
    ],
    focus: ["Hiring strategy", "Energy sector", "Team building"],
  },
  {
    slug: "marc-andre-boucher",
    name: "Marc-André Boucher",
    role: "Co-founder & CTO",
    initials: "MB",
    color: "#0F2545",
    tag: "Montréal",
    bio: "Built the matching engines at three Series-B SaaS companies. Loves grids and graphs.",
    longBio: [
      "Marc-André built the matching infrastructure at three Series-B SaaS companies before co-founding Energized.",
      "His current obsession is making contextual match scoring fast enough to feel like search, transparent enough to feel like reasoning.",
    ],
    focus: ["Matching engines", "Distributed systems", "Realtime infra"],
  },
  {
    slug: "aisha-olatunji",
    name: "Aisha Olatunji",
    role: "Head of Talent Network",
    initials: "AO",
    color: "#004984",
    tag: "Toronto",
    bio: "Spent a decade placing senior energy hires. Now hand-picks our recruiter partners.",
    longBio: [
      "Aisha spent ten years placing senior energy hires across Canada — from drilling supervisors in the oil patch to project leads on Ontario's nuclear refurb program.",
      "She runs Energized's recruiter-partner network, hand-picking the agencies and independent recruiters who get access to our talent pool.",
    ],
    focus: ["Executive search", "Recruiter network", "Senior hires"],
  },
  {
    slug: "jules-tremblay",
    name: "Jules Tremblay",
    role: "Head of Design",
    initials: "JT",
    color: "#FF7A59",
    tag: "Halifax",
    bio: "Editorial obsessive. Believes a job board is a publication first.",
    longBio: [
      "Jules came to Energized after seven years designing editorial products for Canadian publishers.",
      "Their thesis is simple: a job board is a publication first. The way roles are presented, scanned, and saved is a typography problem before it's a database problem.",
    ],
    focus: ["Product design", "Typography", "Information design"],
  },
  {
    slug: "karim-diallo",
    name: "Karim Diallo",
    role: "Head of Field Operations",
    initials: "KD",
    color: "#F59E0B",
    tag: "Edmonton",
    bio: "Former drilling supervisor. Keeps us honest about what techs actually need.",
    longBio: [
      "Before joining Energized, Karim spent eight years as a drilling supervisor across rigs in Alberta and northeastern BC.",
      "He runs our field-operations program — every product feature gets a sanity check from someone who's actually worn the steel-toes.",
    ],
    focus: ["Field operations", "Onsite hiring", "Rotation roles"],
  },
  {
    slug: "priya-anand",
    name: "Priya Anand",
    role: "Head of Employer Success",
    initials: "PA",
    color: "#B9A8FF",
    tag: "Vancouver",
    bio: "Onboarded 600+ employers. Hates a slow applicant pipeline more than anyone.",
    longBio: [
      "Priya has onboarded over 600 employers across her career — the kind of work that teaches you exactly which features get used and which die quiet deaths.",
      "She runs employer success at Energized, with a particular hatred for applicant pipelines that stall between stages.",
    ],
    focus: ["Customer success", "Pipeline operations", "Employer onboarding"],
  },
  {
    slug: "lin-zhao",
    name: "Lin Zhao",
    role: "Head of Data Science",
    initials: "LZ",
    color: "#5B6CFF",
    tag: "Toronto",
    bio: "Built our match model. Publishes annual energy comp reports that everyone reads.",
    longBio: [
      "Lin leads data science at Energized, where she built the match scoring model from the ground up.",
      "Her annual Canadian energy compensation report is widely shared in the industry — partly because it's free, mostly because it's accurate.",
    ],
    focus: ["Match modelling", "Compensation data", "Applied ML"],
  },
  {
    slug: "daniel-okafor",
    name: "Daniel Okafor",
    role: "Head of Policy & Trust",
    initials: "DO",
    color: "#1CAAE2",
    tag: "Ottawa",
    bio: "Keeps the platform honest, fair, and compliant — across 13 provinces and territories.",
    longBio: [
      "Daniel works at the intersection of policy and product, making sure Energized stays honest and compliant across all 13 Canadian provinces and territories.",
      "Before Energized, he advised on labour-platform regulation for two federal commissions.",
    ],
    focus: ["Policy", "Trust & safety", "Compliance"],
  },
];

export function TeamGrid() {
  const [selected, setSelected] = useState<TeamMember | null>(null);

  useEffect(() => {
    if (!selected) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", handleKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [selected]);

  return (
    <>
      <div className="v2-team-grid">
        {TEAM.map((m) => (
          <button
            key={m.slug}
            type="button"
            className="v2-member v2-member-clickable"
            onClick={() => setSelected(m)}
            aria-haspopup="dialog"
          >
            <div
              className="v2-member-photo"
              style={{ ["--mc" as string]: m.color } as React.CSSProperties}
            >
              <div className="v2-member-tag">{m.tag}</div>
              <div className="v2-member-initials">{m.initials}</div>
            </div>
            <div className="v2-member-info">
              <div className="v2-member-name">{m.name}</div>
              <div className="v2-member-role">{m.role}</div>
              <div className="v2-member-bio">{m.bio}</div>
              <div className="v2-member-readmore">
                Read full bio
                <Icon name="arrowRight" size={12} />
              </div>
            </div>
          </button>
        ))}
      </div>

      {selected && (
        <TeamModal
          member={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}

function TeamModal({
  member,
  onClose,
}: {
  member: TeamMember;
  onClose: () => void;
}) {
  return (
    <div
      className="v2-team-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby={`team-modal-title-${member.slug}`}
    >
      <div
        className="v2-team-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="v2-team-modal-close"
          onClick={onClose}
          aria-label="Close bio"
        >
          <Icon name="x" size={18} />
        </button>
        <div
          className="v2-team-modal-photo"
          style={{ ["--mc" as string]: member.color } as React.CSSProperties}
        >
          <div className="v2-team-modal-tag">{member.tag}</div>
          <div className="v2-team-modal-initials">{member.initials}</div>
        </div>
        <div className="v2-team-modal-body">
          <h3
            id={`team-modal-title-${member.slug}`}
            className="v2-team-modal-name"
          >
            {member.name}
          </h3>
          <div className="v2-team-modal-role">{member.role}</div>
          <div className="v2-team-modal-bio">
            {member.longBio.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          {member.focus.length > 0 && (
            <div className="v2-team-modal-focus">
              <div className="v2-team-modal-focus-label">Focus areas</div>
              <div className="v2-team-modal-focus-chips">
                {member.focus.map((f) => (
                  <span key={f} className="v2-team-modal-focus-chip">
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
