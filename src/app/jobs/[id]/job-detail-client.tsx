"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/shared/icon";
import {
  formatSalary,
  type JobExperienceLevel,
  type JobSector,
  type JobWorkSetup,
} from "@/lib/jobs-options";
import {
  ApplyButtonAndModal,
  type ApplyViewerState,
} from "./apply-modal";
import { SaveButton, type SaveViewer } from "./save-button";
import { CopyLinkButton } from "../jobs-client-bits";
import { EmberCard } from "./ember-card";

type ScreeningQuestion = { q: string; required: boolean };

type Job = {
  id: string;
  title: string | null;
  summary: string | null;
  description: string | null;
  sector: JobSector | null;
  subSectors: string[];
  experienceLevel: JobExperienceLevel | null;
  location: string | null;
  workSetup: JobWorkSetup | null;
  rotationSchedule: string | null;
  hoursPerWeek: number | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  salaryPeriod: string | null;
  requiredCertifications: string[];
  screeningQuestions: ScreeningQuestion[];
  publishedAt: Date | null;
};

type Org = {
  id: string;
  name: string;
  tagline: string | null;
  about: string | null;
  website: string | null;
  hq: string | null;
  founded: string | null;
  size: string | null;
  primarySector: JobSector | null;
  subSectors: string[];
  logoUrl: string | null;
  logoColor: string;
  verified: boolean;
};

type Similar = {
  id: string;
  title: string | null;
  sector: JobSector | null;
  location: string | null;
  workSetup: JobWorkSetup | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  salaryPeriod: string | null;
  orgName: string;
  orgLogoUrl: string | null;
  orgLogoColor: string;
};

type Props = {
  job: Job;
  org: Org;
  similar: Similar[];
  labels: {
    sector: Record<JobSector, string>;
    workSetup: Record<JobWorkSetup, string>;
    experienceLevel: Record<JobExperienceLevel, string>;
  };
  viewer: ApplyViewerState;
  signInHref: string;
  saveViewer: SaveViewer;
};

const COMPANY_SIZE_LABELS: Record<string, string> = {
  "1_10": "1–10",
  "11_50": "11–50",
  "51_120": "51–120",
  "120_250": "120–250",
  "250_500": "250–500",
  "500_1000": "500–1000",
  "1000_plus": "1000+",
};

export function JobDetailClient({
  job,
  org,
  similar,
  labels,
  viewer,
  signInHref,
  saveViewer,
}: Props) {
  const [tab, setTab] = useState<"overview" | "company">("overview");

  const postedLabel = job.publishedAt
    ? new Date(job.publishedAt).toLocaleDateString("en-CA", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) 340px",
        gap: 32,
        alignItems: "start",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            background: "white",
            border: "1px solid var(--v2-ink-200)",
            borderRadius: "var(--v2-r-xl)",
            padding: 32,
          }}
        >
          <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: 16,
                background: org.logoColor,
                color: "white",
                display: "grid",
                placeItems: "center",
                fontFamily: "var(--v2-font-serif)",
                fontSize: 22,
                fontWeight: 900,
                overflow: "hidden",
                position: "relative",
              }}
            >
              {org.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={org.logoUrl}
                  alt={org.name}
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                org.name.charAt(0).toUpperCase()
              )}
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13,
                  color: "var(--v2-ink-500)",
                  fontFamily: "var(--v2-font-mono)",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                <Link href={`/c/${org.id}`} style={{ color: "inherit" }}>
                  {org.name}
                </Link>
                {org.primarySector && ` · ${labels.sector[org.primarySector]}`}
              </div>
              {job.sector && (
                <span
                  className="v2-chip v2-chip-accent"
                  style={{ marginTop: 6 }}
                >
                  {labels.sector[job.sector]}
                </span>
              )}
            </div>
          </div>

          <h1
            className="v2-h2"
            style={{
              fontStyle: "italic",
              fontWeight: 900,
              marginTop: 18,
              marginBottom: 16,
            }}
          >
            {job.title ?? "Untitled role"}
          </h1>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 18,
              fontSize: 14,
              color: "var(--v2-ink-600)",
              marginBottom: 18,
            }}
          >
            {job.location && (
              <span
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <Icon name="mapPin" size={14} /> {job.location}
              </span>
            )}
            {job.workSetup && (
              <span
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <Icon name="briefcase" size={14} />{" "}
                {labels.workSetup[job.workSetup]}
                {job.rotationSchedule && ` · Rotation ${job.rotationSchedule}`}
              </span>
            )}
            <span
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <Icon name="dollar" size={14} />{" "}
              {formatSalary(
                job.salaryMin,
                job.salaryMax,
                job.salaryCurrency,
                job.salaryPeriod,
              )}
            </span>
            {postedLabel && (
              <span
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <Icon name="check" size={14} /> Posted {postedLabel}
              </span>
            )}
            {job.experienceLevel && (
              <span
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <Icon name="sparkles" size={14} />{" "}
                {labels.experienceLevel[job.experienceLevel]}
              </span>
            )}
          </div>

          {job.requiredCertifications.length > 0 && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                marginBottom: 24,
              }}
            >
              {job.requiredCertifications.map((c) => (
                <span key={c} className="v2-chip v2-chip-outline">
                  {c}
                </span>
              ))}
            </div>
          )}

          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <ApplyButtonAndModal
              jobId={job.id}
              jobTitle={job.title ?? "Untitled role"}
              companyName={org.name}
              screeningQuestions={job.screeningQuestions}
              viewer={viewer}
              signInHref={signInHref}
            />
            <SaveButton jobId={job.id} viewer={saveViewer} />
            <CopyLinkButton variant="button" ariaLabel="Copy role URL" />
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 4,
            marginTop: 24,
            padding: 4,
            background: "white",
            border: "1px solid var(--v2-ink-200)",
            borderRadius: 999,
            width: "fit-content",
          }}
        >
          {(["overview", "company"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: "8px 18px",
                borderRadius: 999,
                fontSize: 14,
                fontWeight: 700,
                background: tab === t ? "var(--v2-ink-950)" : "transparent",
                color: tab === t ? "white" : "var(--v2-ink-700)",
                transition: "background .15s ease",
              }}
            >
              {t === "overview" ? "Overview" : "About the company"}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <div
            style={{
              marginTop: 20,
              background: "white",
              border: "1px solid var(--v2-ink-200)",
              borderRadius: "var(--v2-r-xl)",
              padding: 32,
            }}
          >
            {job.summary && (
              <p
                style={{
                  fontSize: 17,
                  lineHeight: 1.55,
                  color: "var(--v2-ink-700)",
                  marginBottom: 24,
                }}
              >
                {job.summary}
              </p>
            )}

            <h3
              className="v2-h3"
              style={{ marginBottom: 12, letterSpacing: "-0.015em" }}
            >
              About the role
            </h3>
            <div
              style={{
                whiteSpace: "pre-wrap",
                lineHeight: 1.65,
                color: "var(--v2-ink-700)",
              }}
            >
              {job.description ??
                "The hiring team hasn't shared a full description yet."}
            </div>

            {job.subSectors.length > 0 && (
              <div style={{ marginTop: 32 }}>
                <div
                  style={{
                    fontFamily: "var(--v2-font-mono)",
                    fontSize: 11,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--v2-ink-500)",
                    marginBottom: 10,
                  }}
                >
                  Sub-sectors
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {job.subSectors.map((s) => (
                    <span key={s} className="v2-chip">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {job.screeningQuestions.length > 0 && (
              <div style={{ marginTop: 32 }}>
                <h3
                  className="v2-h3"
                  style={{ marginBottom: 12, letterSpacing: "-0.015em" }}
                >
                  Questions you&apos;ll answer
                </h3>
                <ol
                  style={{
                    paddingLeft: 20,
                    display: "grid",
                    gap: 10,
                    color: "var(--v2-ink-700)",
                  }}
                >
                  {job.screeningQuestions.map((q, i) => (
                    <li key={i}>
                      {q.q}
                      {q.required && (
                        <span
                          style={{
                            marginLeft: 8,
                            fontSize: 11,
                            color: "#A63A20",
                            fontFamily: "var(--v2-font-mono)",
                            letterSpacing: "0.06em",
                            textTransform: "uppercase",
                          }}
                        >
                          Required
                        </span>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}

        {tab === "company" && (
          <div
            style={{
              marginTop: 20,
              background: "white",
              border: "1px solid var(--v2-ink-200)",
              borderRadius: "var(--v2-r-xl)",
              padding: 32,
            }}
          >
            <h3
              className="v2-h3"
              style={{ marginBottom: 12, letterSpacing: "-0.015em" }}
            >
              About {org.name}
            </h3>
            {org.tagline && (
              <p
                style={{
                  fontStyle: "italic",
                  color: "var(--v2-ink-600)",
                  fontFamily: "var(--v2-font-serif)",
                  fontSize: 18,
                  marginBottom: 14,
                }}
              >
                {org.tagline}
              </p>
            )}
            <div
              style={{
                whiteSpace: "pre-wrap",
                lineHeight: 1.65,
                color: "var(--v2-ink-700)",
              }}
            >
              {org.about ?? "This company hasn't written an about yet."}
            </div>

            <div
              style={{
                marginTop: 28,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: 16,
              }}
            >
              {org.founded && <StatTile label="Founded" value={org.founded} />}
              {org.hq && <StatTile label="HQ" value={org.hq} />}
              {org.size && (
                <StatTile
                  label="Team size"
                  value={COMPANY_SIZE_LABELS[org.size] ?? org.size}
                />
              )}
              {org.primarySector && (
                <StatTile
                  label="Sector"
                  value={labels.sector[org.primarySector]}
                />
              )}
            </div>

            {org.subSectors.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <div
                  style={{
                    fontFamily: "var(--v2-font-mono)",
                    fontSize: 11,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--v2-ink-500)",
                    marginBottom: 10,
                  }}
                >
                  Focus areas
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {org.subSectors.map((s) => (
                    <span key={s} className="v2-chip">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div
              style={{
                marginTop: 28,
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <Link
                href={`/c/${org.id}`}
                className="v2-btn v2-btn-ghost v2-btn-sm"
              >
                View company page <Icon name="arrowUpRight" size={14} />
              </Link>
              {org.website && (
                <a
                  href={org.website}
                  target="_blank"
                  rel="noreferrer"
                  className="v2-btn v2-btn-ghost v2-btn-sm"
                >
                  <Icon name="globe" size={14} /> Website
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      <aside style={{ display: "grid", gap: 16 }}>
        <EmberCard
          jobId={job.id}
          showForViewer={
            viewer.kind === "eligible" || viewer.kind === "applied"
          }
        />
        <div
          style={{
            background: "white",
            border: "1px solid var(--v2-ink-200)",
            borderRadius: "var(--v2-r-xl)",
            padding: 22,
          }}
        >
          <div
            style={{
              fontFamily: "var(--v2-font-mono)",
              fontSize: 11,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--v2-ink-500)",
              marginBottom: 14,
            }}
          >
            Posted by
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: org.logoColor,
                color: "white",
                display: "grid",
                placeItems: "center",
                fontFamily: "var(--v2-font-serif)",
                fontSize: 18,
                fontWeight: 900,
                overflow: "hidden",
                position: "relative",
              }}
            >
              {org.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={org.logoUrl}
                  alt={org.name}
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                org.name.charAt(0).toUpperCase()
              )}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700 }}>{org.name}</div>
              {org.hq && (
                <div style={{ fontSize: 12, color: "var(--v2-ink-500)" }}>
                  {org.hq}
                </div>
              )}
            </div>
          </div>
          {org.verified && (
            <div
              style={{
                marginTop: 12,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 10px",
                background: "var(--v2-accent-soft)",
                borderRadius: 999,
                fontSize: 11,
                fontFamily: "var(--v2-font-mono)",
                color: "var(--v2-ink-900)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                fontWeight: 700,
              }}
            >
              <Icon name="shield" size={11} /> Verified
            </div>
          )}
        </div>

        {similar.length > 0 && (
          <div
            style={{
              background: "white",
              border: "1px solid var(--v2-ink-200)",
              borderRadius: "var(--v2-r-xl)",
              padding: 22,
            }}
          >
            <h3
              style={{
                fontFamily: "var(--v2-font-serif)",
                fontSize: 20,
                fontWeight: 400,
                letterSpacing: "-0.015em",
                marginBottom: 14,
              }}
            >
              Similar roles
            </h3>
            <div style={{ display: "grid", gap: 10 }}>
              {similar.map((s) => (
                <Link
                  key={s.id}
                  href={`/jobs/${s.id}`}
                  style={{
                    padding: 12,
                    border: "1px solid var(--v2-ink-200)",
                    borderRadius: 12,
                    display: "block",
                    color: "inherit",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: s.orgLogoColor,
                        color: "white",
                        fontSize: 11,
                        fontWeight: 700,
                        display: "grid",
                        placeItems: "center",
                        overflow: "hidden",
                        position: "relative",
                        flexShrink: 0,
                      }}
                    >
                      {s.orgLogoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={s.orgLogoUrl}
                          alt={s.orgName}
                          style={{
                            position: "absolute",
                            inset: 0,
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        s.orgName.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {s.title ?? "Untitled role"}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--v2-ink-500)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {s.orgName}
                        {s.location && ` · ${s.location}`}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: 14,
        background: "var(--v2-ink-50)",
        borderRadius: 12,
      }}
    >
      <div
        style={{
          fontFamily: "var(--v2-font-mono)",
          fontSize: 11,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--v2-ink-500)",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--v2-font-serif)",
          fontSize: 20,
          fontWeight: 900,
          marginTop: 4,
        }}
      >
        {value}
      </div>
    </div>
  );
}
