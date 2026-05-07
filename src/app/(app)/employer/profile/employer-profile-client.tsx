"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { inferRouterOutputs } from "@trpc/server";
import { Icon, type IconName } from "@/components/shared/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { SuggestionCombobox } from "@/components/shared/suggestion-combobox";
import { api } from "@/lib/trpc/client";
import type { AppRouter } from "@/server/api/root";
import {
  SECTOR_LABELS as JOB_SECTOR_LABELS,
  WORK_SETUP_LABELS as JOB_WORK_SETUP_LABELS,
} from "@/lib/jobs-options";
import { BillingSection } from "./billing-section";
import { DangerZone } from "./danger-zone";

type JobRow = inferRouterOutputs<AppRouter>["jobs"]["listForOrg"][number];

/* ---------- types + constants ---------- */

type CompanySize =
  | "1_10"
  | "11_50"
  | "51_120"
  | "120_250"
  | "250_500"
  | "500_1000"
  | "1000_plus";

type SectorEnum =
  | "oil_gas"
  | "renewables"
  | "nuclear"
  | "utilities"
  | "hydrogen"
  | "power"
  | "other";

type WorkSetup = "onsite" | "hybrid_preferred" | "remote_ok" | "flexible";
type HiringPace =
  | "passive"
  | "when_right"
  | "actively_hiring"
  | "scaling_fast";
type OrgRole = "owner" | "admin" | "recruiter" | "hiring_manager" | "viewer";

const COMPANY_SIZE_LABELS: Record<CompanySize, string> = {
  "1_10": "1–10",
  "11_50": "11–50",
  "51_120": "51–120",
  "120_250": "120–250",
  "250_500": "250–500",
  "500_1000": "500–1000",
  "1000_plus": "1000+",
};

const SECTOR_LABELS: Record<SectorEnum, string> = {
  oil_gas: "Oil & Gas",
  renewables: "Renewable Energy",
  nuclear: "Nuclear",
  utilities: "Power Utilities",
  hydrogen: "Hydrogen",
  power: "Power",
  other: "Other",
};

const WORK_SETUP_OPTIONS: { value: WorkSetup; label: string }[] = [
  { value: "onsite", label: "Onsite" },
  { value: "hybrid_preferred", label: "Hybrid preferred" },
  { value: "remote_ok", label: "Remote OK" },
  { value: "flexible", label: "Flexible" },
];

const HIRING_PACE_LABELS: Record<HiringPace, string> = {
  passive: "Passive / pipeline",
  when_right: "Hiring when right",
  actively_hiring: "Actively hiring",
  scaling_fast: "Scaling fast",
};

const SECTOR_OPTIONS: { value: SectorEnum; label: string }[] = (
  Object.keys(SECTOR_LABELS) as SectorEnum[]
).map((v) => ({ value: v, label: SECTOR_LABELS[v] }));

const COMPANY_SIZE_OPTIONS: { value: CompanySize; label: string }[] = (
  Object.keys(COMPANY_SIZE_LABELS) as CompanySize[]
).map((v) => ({ value: v, label: COMPANY_SIZE_LABELS[v] }));

const HIRING_PACE_OPTIONS: { value: HiringPace; label: string }[] = (
  Object.keys(HIRING_PACE_LABELS) as HiringPace[]
).map((v) => ({ value: v, label: HIRING_PACE_LABELS[v] }));

const FOCUS_ROLE_OPTIONS = [
  "Controls & SCADA",
  "Construction",
  "Project Management",
  "Field Ops",
  "Engineering",
  "Permitting & GIS",
  "Commissioning",
  "Safety (HSE)",
  "Trade Tickets",
];

const SUB_SECTOR_OPTIONS = [
  "Solar PV",
  "Wind Onshore",
  "Wind Offshore",
  "Battery Storage",
  "Hydroelectric",
  "Grid-scale",
  "Distributed",
  "Transmission",
  "Upstream",
  "Downstream",
  "Pipelines",
  "LNG",
  "CCUS",
];

const ORG_ROLE_LABELS: Record<OrgRole, string> = {
  owner: "Owner",
  admin: "Admin",
  recruiter: "Recruiter",
  hiring_manager: "Hiring manager",
  viewer: "Viewer",
};

const EDITABLE_ROLE_OPTIONS: { value: OrgRole; label: string }[] = (
  ["admin", "recruiter", "hiring_manager", "viewer"] as OrgRole[]
).map((v) => ({ value: v, label: ORG_ROLE_LABELS[v] }));

const coverChipStyle: React.CSSProperties = {
  padding: "8px 14px",
  background: "rgba(255,255,255,0.12)",
  backdropFilter: "blur(10px)",
  WebkitBackdropFilter: "blur(10px)",
  border: "1px solid rgba(255,255,255,0.2)",
  borderRadius: 999,
  color: "white",
  fontSize: 12,
  fontFamily: "var(--v2-font-mono)",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
};

const NAV_ITEMS: { id: string; label: string; icon: IconName }[] = [
  { id: "overview", label: "Overview", icon: "building" },
  { id: "about", label: "About & branding", icon: "sparkles" },
  { id: "team", label: "Team", icon: "users" },
  { id: "jobs", label: "Jobs", icon: "briefcase" },
  { id: "prefs", label: "Hiring preferences", icon: "sliders" },
  { id: "billing", label: "Plan & billing", icon: "dollar" },
  { id: "verify", label: "Verification", icon: "shield" },
];

/* ---------- client ---------- */

export function EmployerProfileClient({
  email,
}: {
  email: string;
}) {
  const router = useRouter();
  const orgQuery = api.employer.getMyOrg.useQuery();
  const jobsQuery = api.jobs.listForOrg.useQuery();
  const applicantCounts = api.applications.countsForOrg.useQuery();
  const kpisQuery = api.employer.getKpis.useQuery();

  const [active, setActive] = useState<string>("overview");

  const closeJob = api.jobs.close.useMutation({
    onSuccess: () => void jobsQuery.refetch(),
  });
  const reopenJob = api.jobs.reopen.useMutation({
    onSuccess: () => void jobsQuery.refetch(),
  });
  const deleteDraft = api.jobs.deleteDraft.useMutation({
    onSuccess: () => void jobsQuery.refetch(),
  });
  const duplicateJob = api.jobs.duplicate.useMutation({
    onSuccess: (row) => router.push(`/employer/jobs/${row.id}/edit?step=1`),
  });

  const updateBasics = api.employer.updateBasics.useMutation({
    onSuccess: () => void orgQuery.refetch(),
  });
  const updatePrefs = api.employer.updatePrefs.useMutation({
    onSuccess: () => void orgQuery.refetch(),
  });
  const invite = api.employer.inviteMember.useMutation({
    onSuccess: () => void orgQuery.refetch(),
  });
  const removeMember = api.employer.removeMember.useMutation({
    onSuccess: () => void orgQuery.refetch(),
  });
  const updateMemberRole = api.employer.updateMemberRole.useMutation({
    onSuccess: () => void orgQuery.refetch(),
  });
  const transferOwnership = api.employer.transferOwnership.useMutation({
    onSuccess: () => void orgQuery.refetch(),
  });
  const setCover = api.employer.setCover.useMutation({
    onSuccess: () => void orgQuery.refetch(),
  });

  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const [coverBusy, setCoverBusy] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);

  const setLogo = api.employer.setLogo.useMutation({
    onSuccess: () => void orgQuery.refetch(),
  });

  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);

  const handleLogoFile = async (file: File) => {
    setLogoError(null);
    if (file.size > 2 * 1024 * 1024) {
      setLogoError("Logo must be under 2MB.");
      return;
    }
    if (
      !["image/jpeg", "image/png", "image/webp", "image/svg+xml"].includes(
        file.type,
      )
    ) {
      setLogoError("JPG, PNG, WebP, or SVG only.");
      return;
    }
    setLogoBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload/org-logo", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error ?? "Upload failed");
      }
      const { url } = (await res.json()) as { url: string };
      await setLogo.mutateAsync({ url });
    } catch (e) {
      setLogoError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setLogoBusy(false);
    }
  };

  const handleLogoRemove = async () => {
    setLogoError(null);
    setLogoBusy(true);
    try {
      await setLogo.mutateAsync({ url: null });
    } catch (e) {
      setLogoError(e instanceof Error ? e.message : "Couldn't remove logo");
    } finally {
      setLogoBusy(false);
    }
  };

  const handleCoverFile = async (file: File) => {
    setCoverError(null);
    if (file.size > 5 * 1024 * 1024) {
      setCoverError("Image must be under 5MB.");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setCoverError("JPG, PNG, or WebP only.");
      return;
    }
    setCoverBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload/org-cover", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error ?? "Upload failed");
      }
      const { url } = (await res.json()) as { url: string };
      await setCover.mutateAsync({ url });
    } catch (e) {
      setCoverError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setCoverBusy(false);
    }
  };

  const org = orgQuery.data?.org ?? null;
  const members = orgQuery.data?.members ?? [];

  const saving =
    updateBasics.isPending ||
    updatePrefs.isPending ||
    invite.isPending ||
    removeMember.isPending ||
    updateMemberRole.isPending;

  const completion = useMemo(() => computeCompleteness(org), [org]);

  return (
    <div className="pp-shell v2">
      <div className="pp-body">
        <aside className="pp-side">
          <div className="pp-identity">
            <div
              style={{
                width: 88,
                height: 88,
                borderRadius: 22,
                margin: "0 auto 16px",
                background: org?.logoColor ?? "#FF7A59",
                color: "white",
                display: "grid",
                placeItems: "center",
                fontFamily: "var(--v2-font-serif)",
                fontSize: 42,
                position: "relative",
                overflow: "hidden",
              }}
            >
              {org?.logoUrl ? (
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
                <span>{org?.name.charAt(0).toUpperCase() ?? "?"}</span>
              )}
            </div>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/svg+xml"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void handleLogoFile(f);
              }}
            />
            <div
              style={{
                display: "flex",
                gap: 6,
                justifyContent: "center",
                marginBottom: 12,
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                disabled={logoBusy}
                style={{
                  border: "1px solid var(--v2-ink-200)",
                  background: "white",
                  color: "var(--v2-ink-800)",
                  padding: "4px 10px",
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: logoBusy ? "default" : "pointer",
                  opacity: logoBusy ? 0.6 : 1,
                }}
              >
                {logoBusy
                  ? "Uploading…"
                  : org?.logoUrl
                    ? "Replace logo"
                    : "Upload logo"}
              </button>
              {org?.logoUrl && !logoBusy && (
                <button
                  type="button"
                  onClick={() => void handleLogoRemove()}
                  disabled={logoBusy}
                  style={{
                    border: "1px solid var(--v2-ink-200)",
                    background: "white",
                    color: "var(--v2-ink-600)",
                    padding: "4px 10px",
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Remove
                </button>
              )}
            </div>
            {logoError && (
              <div
                style={{
                  fontSize: 11,
                  color: "#A63A20",
                  textAlign: "center",
                  marginBottom: 10,
                }}
              >
                {logoError}
              </div>
            )}
            <div className="pp-name">{org?.name ?? "Untitled company"}</div>
            {org?.tagline && (
              <div
                style={{
                  marginTop: 6,
                  fontSize: 13,
                  color: "var(--v2-ink-600)",
                  fontStyle: "italic",
                  fontFamily: "var(--v2-font-serif)",
                  lineHeight: 1.35,
                }}
              >
                {org.tagline}
              </div>
            )}
            <div className="pp-title" style={{ marginTop: 8 }}>
              {org?.primarySector ? SECTOR_LABELS[org.primarySector] : "Sector not set"}
              {org?.size ? ` · ${COMPANY_SIZE_LABELS[org.size]} employees` : ""}
            </div>
            {org?.founded && (
              <div
                style={{
                  marginTop: 4,
                  fontSize: 12,
                  color: "var(--v2-ink-500)",
                  fontFamily: "var(--v2-font-mono)",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                Founded {org.founded}
              </div>
            )}
            {org?.hq && (
              <div className="pp-location">
                <Icon name="mapPin" size={11} /> {org.hq}
              </div>
            )}
            {org?.domain && (
              <div
                className="pp-location"
                style={{ marginTop: 4 }}
              >
                <Icon name="globe" size={11} /> {org.domain}
              </div>
            )}
            {org?.website && (
              <div
                className="pp-location"
                style={{ marginTop: 4 }}
              >
                <Icon name="arrowUpRight" size={11} />{" "}
                <a
                  href={org.website}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    color: "inherit",
                    textDecoration: "underline",
                    textUnderlineOffset: 2,
                  }}
                >
                  {org.website.replace(/^https?:\/\//, "")}
                </a>
              </div>
            )}
            {org?.verified && (
              <div
                style={{
                  marginTop: 14,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "5px 12px",
                  background: "var(--v2-accent-soft)",
                  borderRadius: 999,
                  fontSize: 11,
                  fontFamily: "var(--v2-font-mono)",
                  color: "var(--v2-ink-900)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  fontWeight: 600,
                }}
              >
                <Icon name="shield" size={11} /> Verified
              </div>
            )}

            <div className="pp-completeness">
              <div className="pp-completeness-head">
                <span className="pp-completeness-label">Profile strength</span>
                <span className="pp-completeness-pct">{completion}%</span>
              </div>
              <div className="ob-completion-bar">
                <div
                  className="ob-completion-bar-fill"
                  style={{ width: `${completion}%` }}
                />
              </div>
              <div
                style={{
                  marginTop: 12,
                  fontSize: 12,
                  color: "var(--v2-ink-500)",
                  lineHeight: 1.5,
                }}
              >
                {completion < 100
                  ? "Verify the domain and invite teammates to hit 100%."
                  : "Your company profile is complete."}
              </div>
            </div>
          </div>

          <nav className="pp-nav">
            {NAV_ITEMS.map((n) => (
              <div
                key={n.id}
                className={`pp-nav-item ${active === n.id ? "active" : ""}`}
                onClick={() => {
                  setActive(n.id);
                  document
                    .getElementById(`ep-${n.id}`)
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              >
                <Icon name={n.icon} size={16} />
                <span>{n.label}</span>
                {n.id === "verify" && org && !org.verified && (
                  <span className="pp-nav-badge">!</span>
                )}
                {n.id === "team" && members.some((m) => m.status === "pending") && (
                  <span className="pp-nav-badge">
                    {members.filter((m) => m.status === "pending").length}
                  </span>
                )}
              </div>
            ))}
          </nav>

          <div className="pp-side-cta">
            <h4>
              Post a <em>new role</em>.
            </h4>
            <p>
              We&rsquo;ll surface ranked candidates from your talent pool
              within 48 hours.
            </p>
            <button
              className="v2-btn v2-btn-accent v2-btn-sm"
              style={{ marginTop: 16 }}
              onClick={() => router.push("/employer/jobs/new")}
            >
              New job <Icon name="plus" size={14} />
            </button>
            <button
              type="button"
              onClick={() => router.push("/employer/onboarding?retake=1")}
              style={{
                marginTop: 14,
                background: "none",
                border: "none",
                padding: 0,
                color: "rgba(255,255,255,0.75)",
                fontSize: 12,
                fontFamily: "var(--v2-font-mono)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                fontWeight: 700,
                cursor: "pointer",
                textDecoration: "underline",
                textUnderlineOffset: 3,
              }}
            >
              Restart setup wizard
            </button>
          </div>
        </aside>

        <main className="pp-main">
          {/* Editor toolbar — save state + preview public page */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 18,
              flexWrap: "wrap",
            }}
          >
            <div className="pp-crumbs">
              <span>App</span>
              <span className="sep">/</span>
              <span>Employer</span>
              <span className="sep">/</span>
              <span className="current">Company profile</span>
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div className="ob-save-state">
                <span className="dot" />
                <span>{saving ? "Saving…" : "All changes saved"}</span>
              </div>
              <button
                className="v2-btn v2-btn-ghost v2-btn-sm"
                onClick={() => org && window.open(`/c/${org.id}`, "_blank")}
                disabled={!org}
              >
                <Icon name="eye" size={14} /> View public page
              </button>
            </div>
          </div>

          {orgQuery.isLoading && !org && <ProfileSkeleton />}

          {org && (
            <>
              {/* Banner */}
              <div
                id="ep-overview"
                style={{
                  position: "relative",
                  height: 160,
                  borderRadius: "var(--v2-r-xl)",
                  background: org.coverUrl
                    ? `#1D212C`
                    : "linear-gradient(135deg, var(--v2-ink-950) 0%, #1D212C 60%, #2A303F 100%)",
                  overflow: "hidden",
                  scrollMarginTop: 100,
                }}
              >
                {org.coverUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={org.coverUrl}
                    alt=""
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                )}
                {!org.coverUrl && (
                  <>
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background:
                          "radial-gradient(500px circle at 80% 20%, rgba(199,249,86,0.18), transparent 55%), radial-gradient(400px circle at 15% 80%, rgba(124,199,255,0.1), transparent 55%)",
                        pointerEvents: "none",
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        backgroundImage:
                          "repeating-linear-gradient(90deg, rgba(255,255,255,0.04) 0, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 60px)",
                        opacity: 0.6,
                        pointerEvents: "none",
                      }}
                    />
                  </>
                )}
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleCoverFile(f);
                    e.target.value = "";
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    top: 16,
                    right: 16,
                    display: "flex",
                    gap: 8,
                  }}
                >
                  {org.coverUrl && (
                    <button
                      type="button"
                      title="Remove cover"
                      onClick={() => setCover.mutate({ url: null })}
                      disabled={coverBusy || setCover.isPending}
                      style={coverChipStyle}
                    >
                      <Icon name="x" size={12} /> Remove
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    disabled={coverBusy}
                    style={coverChipStyle}
                  >
                    <Icon name="upload" size={12} />{" "}
                    {coverBusy
                      ? "Uploading…"
                      : org.coverUrl
                        ? "Replace cover"
                        : "Edit cover"}
                  </button>
                </div>
                {coverError && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: 12,
                      right: 16,
                      padding: "6px 10px",
                      background: "rgba(166,58,32,0.92)",
                      color: "white",
                      borderRadius: 10,
                      fontSize: 12,
                    }}
                  >
                    {coverError}
                  </div>
                )}
              </div>

              {/* KPI strip */}
              <div className="ep-kpis">
                <KpiCard
                  label="Open roles"
                  value={
                    kpisQuery.data
                      ? String(kpisQuery.data.openRoles)
                      : "—"
                  }
                  trend="published right now"
                />
                <KpiCard
                  label="Applicants · 30d"
                  value={
                    kpisQuery.data
                      ? String(kpisQuery.data.applicantsInRange)
                      : "—"
                  }
                  trend="across all your roles"
                />
                <KpiCard
                  label="Applicants · all time"
                  value={
                    kpisQuery.data
                      ? String(kpisQuery.data.applicantsTotal)
                      : "—"
                  }
                  trend="since you launched"
                />
                <KpiCard
                  label="Profile views · 30d"
                  value={
                    kpisQuery.data
                      ? String(kpisQuery.data.profileViewsInRange)
                      : "—"
                  }
                  trend="visits to your public page"
                />
              </div>

              {/* About */}
              <AboutSection
                id="ep-about"
                initial={org}
                saving={updateBasics.isPending}
                onSave={(input) => updateBasics.mutate(input)}
              />

              {/* Team */}
              <TeamSection
                id="ep-team"
                members={members}
                meEmail={email.toLowerCase()}
                orgDomain={org.domain ?? ""}
                onInvite={(v) => invite.mutate(v)}
                onRemove={(id) => removeMember.mutate({ id })}
                onChangeRole={(id, role) =>
                  updateMemberRole.mutate({ id, role })
                }
                onTransferOwnership={(id) =>
                  transferOwnership.mutate({ toMemberId: id })
                }
                transferBusy={transferOwnership.isPending}
                inviteError={invite.error?.message ?? null}
                inviteBusy={invite.isPending}
              />

              {/* Jobs */}
              <JobsSection
                id="ep-jobs"
                jobs={jobsQuery.data ?? []}
                counts={applicantCounts.data ?? {}}
                onNew={() => router.push("/employer/jobs/new")}
                onEdit={(id) => router.push(`/employer/jobs/${id}/edit?step=1`)}
                onPreview={(id) => router.push(`/employer/jobs/${id}/preview`)}
                onApplicants={(id) =>
                  router.push(`/employer/jobs/${id}/applicants`)
                }
                onCloseJob={(id) => closeJob.mutate({ id })}
                onReopen={(id) => reopenJob.mutate({ id })}
                onDelete={(id) => deleteDraft.mutate({ id })}
                onDuplicate={(id) => duplicateJob.mutate({ id })}
                busy={
                  closeJob.isPending ||
                  reopenJob.isPending ||
                  deleteDraft.isPending ||
                  duplicateJob.isPending
                }
              />

              {/* Hiring prefs */}
              <PrefsSection
                id="ep-prefs"
                initial={org}
                saving={updatePrefs.isPending}
                onSave={(input) => updatePrefs.mutate(input)}
              />

              {/* Plan & billing */}
              <BillingSection id="ep-billing" />

              {/* Verification */}
              <VerificationSection id="ep-verify" org={org} />

              {/* Danger zone — owner sees Delete; everyone else sees Leave. */}
              {(() => {
                const me = members.find(
                  (m) => m.email.toLowerCase() === email.toLowerCase(),
                );
                if (!me) return null;
                return (
                  <DangerZone
                    id="ep-danger"
                    isOwner={me.role === "owner"}
                    orgName={org?.name ?? ""}
                  />
                );
              })()}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

/* ---------- shell pieces ---------- */

function KpiCard({
  label,
  value,
  trend,
}: {
  label: string;
  value: string;
  trend: string;
}) {
  return (
    <div className="ep-kpi">
      <div className="ep-kpi-label">{label}</div>
      <div className="ep-kpi-value">
        <em>{value}</em>
      </div>
      <div className="ep-kpi-trend">{trend}</div>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <>
      <div className="ep-profile-head">
        <Skeleton className="h-44 w-full" />
      </div>
      <div className="ep-kpis">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <section className="pp-section">
        <Skeleton className="h-7 w-32 mb-4" />
        <Skeleton className="h-40 rounded-[14px]" />
      </section>
    </>
  );
}

/* ---------- about section ---------- */

type OrgRow = {
  name: string;
  domain: string | null;
  website: string | null;
  hq: string | null;
  founded: string | null;
  tagline: string | null;
  about: string | null;
  logoColor: string;
  coverUrl: string | null;
  size: CompanySize | null;
  primarySector: SectorEnum | null;
  subSectors: string[];
  verified: boolean;
  verifiedAt: Date | null;
  verificationToken: string | null;
  plan: string;
  planRenewsAt: Date | null;
  defaultWorkSetup: WorkSetup | null;
  hiringPace: HiringPace | null;
  focusRoles: string[];
  autoMatch: boolean;
  prioritizeDiverse: boolean;
};

function AboutSection({
  id,
  initial,
  saving,
  onSave,
}: {
  id?: string;
  initial: OrgRow;
  saving: boolean;
  onSave: (input: {
    name: string;
    tagline: string | null;
    website: string | null;
    domain: string | null;
    hq: string | null;
    founded: string | null;
    about: string | null;
    size: CompanySize | null;
    primarySector: SectorEnum | null;
    subSectors: string[];
  }) => void;
}) {
  const [name, setName] = useState(initial.name);
  const [tagline, setTagline] = useState(initial.tagline ?? "");
  const [website, setWebsite] = useState(initial.website ?? "");
  const [domain, setDomain] = useState(initial.domain ?? "");
  const [hq, setHq] = useState(initial.hq ?? "");
  const [founded, setFounded] = useState(initial.founded ?? "");
  const [about, setAbout] = useState(initial.about ?? "");
  const [size, setSize] = useState<CompanySize | null>(initial.size);
  const [sector, setSector] = useState<SectorEnum | null>(initial.primarySector);
  const [subSectors, setSubSectors] = useState<string[]>(initial.subSectors);

  const dirty =
    name !== initial.name ||
    tagline !== (initial.tagline ?? "") ||
    website !== (initial.website ?? "") ||
    domain !== (initial.domain ?? "") ||
    hq !== (initial.hq ?? "") ||
    founded !== (initial.founded ?? "") ||
    about !== (initial.about ?? "") ||
    size !== initial.size ||
    sector !== initial.primarySector ||
    JSON.stringify(subSectors) !== JSON.stringify(initial.subSectors);

  const toggleSub = (s: string) =>
    setSubSectors((curr) =>
      curr.includes(s)
        ? curr.filter((x) => x !== s)
        : curr.length < 4
          ? [...curr, s]
          : curr,
    );

  return (
    <section id={id} className="pp-section" style={{ scrollMarginTop: 100 }}>
      <div className="pp-section-head">
        <div>
          <div className="pp-section-title">About &amp; branding</div>
          <div className="pp-section-sub">
            Public — shown on every job listing
          </div>
        </div>
        <button
          className="v2-btn v2-btn-primary v2-btn-sm"
          disabled={!dirty || saving || !name.trim()}
          onClick={() =>
            onSave({
              name: name.trim(),
              tagline: tagline.trim() || null,
              website: website.trim() || null,
              domain: domain.trim() || null,
              hq: hq.trim() || null,
              founded: founded.trim() || null,
              about: about.trim() || null,
              size,
              primarySector: sector,
              subSectors,
            })
          }
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      <div className="ob-grid">
        <div className="ob-field">
          <label>Company name</label>
          <input
            className="v2-input-block"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="ob-field">
          <label>Website</label>
          <input
            className="v2-input-block"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://company.ca"
          />
        </div>
        <div className="ob-field">
          <label>Domain (for verification)</label>
          <input
            className="v2-input-block"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="company.ca"
          />
        </div>
        <div className="ob-field">
          <label>Headquarters</label>
          <input
            className="v2-input-block"
            value={hq}
            onChange={(e) => setHq(e.target.value)}
            placeholder="Calgary, AB"
          />
        </div>
        <div className="ob-field">
          <label>Founded</label>
          <input
            className="v2-input-block"
            value={founded}
            onChange={(e) => setFounded(e.target.value)}
            placeholder="2018"
          />
        </div>
        <SuggestionCombobox
          label="Primary sector"
          value={sector ?? ""}
          onChange={(v) => setSector((v as SectorEnum) || null)}
          suggestions={SECTOR_OPTIONS}
          pickPlaceholder="Pick a sector"
          customPlaceholder=""
          otherLabel=""
          allowOther={false}
        />
        <div className="ob-field" style={{ gridColumn: "1/-1" }}>
          <label>Tagline</label>
          <input
            className="v2-input-block"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            placeholder="One line that sums up what you do."
          />
        </div>
        <div className="ob-field" style={{ gridColumn: "1/-1" }}>
          <label>About</label>
          <textarea
            className="v2-input-block"
            value={about}
            onChange={(e) => setAbout(e.target.value)}
            rows={4}
            placeholder="A paragraph on what you build and who you are."
          />
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
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
          Company size
        </div>
        <div className="v2-filter-chips">
          {COMPANY_SIZE_OPTIONS.map((s) => (
            <button
              key={s.value}
              type="button"
              className={`v2-filter-chip ${size === s.value ? "active" : ""}`}
              onClick={() => setSize(s.value)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
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
          Sub-sectors · pick up to 4
        </div>
        <div className="v2-filter-chips">
          {SUB_SECTOR_OPTIONS.map((s) => {
            const active = subSectors.includes(s);
            return (
              <button
                key={s}
                type="button"
                className={`v2-filter-chip ${active ? "active" : ""}`}
                onClick={() => toggleSub(s)}
              >
                {s}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ---------- team section ---------- */

type MemberRow = {
  id: string;
  email: string;
  role: OrgRole;
  status: "active" | "pending" | "revoked";
  userId: string | null;
};

function TeamSection({
  members,
  meEmail,
  orgDomain,
  onInvite,
  onRemove,
  onChangeRole,
  onTransferOwnership,
  transferBusy,
  inviteError,
  inviteBusy,
  id,
}: {
  members: MemberRow[];
  meEmail: string;
  orgDomain: string;
  onInvite: (v: { email: string; role: OrgRole }) => void;
  onRemove: (id: string) => void;
  onChangeRole: (id: string, role: OrgRole) => void;
  onTransferOwnership: (id: string) => void;
  transferBusy: boolean;
  inviteError: string | null;
  inviteBusy: boolean;
  id?: string;
}) {
  const me = members.find((m) => m.email.toLowerCase() === meEmail);
  const iAmOwner = me?.role === "owner";
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<OrgRole>("recruiter");

  const active = members.filter((m) => m.status === "active").length;
  const pending = members.filter((m) => m.status === "pending").length;

  return (
    <section id={id} className="pp-section" style={{ scrollMarginTop: 100 }}>
      <div className="pp-section-head">
        <div>
          <div className="pp-section-title">Team</div>
          <div className="pp-section-sub">
            {active} active · {pending} pending
          </div>
        </div>
      </div>

      <div
        className="ep-invite-row"
        style={{ marginBottom: 16 }}
      >
        <input
          className="v2-input-block"
          placeholder={orgDomain ? `name@${orgDomain}` : "name@company.ca"}
          value={inviteEmail}
          onChange={(e) => setInviteEmail(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && inviteEmail.trim()) {
              e.preventDefault();
              onInvite({
                email: inviteEmail.trim().toLowerCase(),
                role: inviteRole,
              });
              setInviteEmail("");
            }
          }}
        />
        <select
          className="v2-input-block"
          value={inviteRole}
          onChange={(e) => setInviteRole(e.target.value as OrgRole)}
        >
          {EDITABLE_ROLE_OPTIONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="v2-btn v2-btn-primary"
          style={{ width: 40, height: 52, padding: 0, borderRadius: 12 }}
          disabled={!inviteEmail.trim() || inviteBusy}
          onClick={() => {
            if (!inviteEmail.trim()) return;
            onInvite({
              email: inviteEmail.trim().toLowerCase(),
              role: inviteRole,
            });
            setInviteEmail("");
          }}
        >
          <Icon name="plus" size={16} />
        </button>
      </div>

      {inviteError && (
        <div
          role="alert"
          style={{
            marginTop: -8,
            marginBottom: 16,
            padding: "10px 14px",
            background: "var(--v2-coral-soft, #FBEBE4)",
            color: "#A63A20",
            borderRadius: 10,
            fontSize: 13,
          }}
        >
          {inviteError}
        </div>
      )}

      {members.map((m) => {
        const isMe = m.email.toLowerCase() === meEmail;
        const canEditRole = m.role !== "owner" && !isMe;
        return (
          <div
            key={m.id}
            className={`ep-teammate ${m.status === "pending" ? "pending" : ""}`}
          >
            <div
              className="ep-teammate-avatar"
              style={{ background: "#2A303F" }}
            >
              {m.email.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="ep-teammate-name">
                {m.email.split("@")[0]}
                {isMe && (
                  <span
                    style={{
                      marginLeft: 6,
                      color: "var(--v2-ink-500)",
                      fontWeight: 400,
                      fontFamily: "var(--v2-font-mono)",
                      fontSize: 11,
                      textTransform: "uppercase",
                    }}
                  >
                    · you
                  </span>
                )}
              </div>
              <div className="ep-teammate-title">{m.email}</div>
            </div>
            {canEditRole ? (
              <select
                className="v2-input-block"
                style={{ padding: "6px 10px", fontSize: 12, width: "auto" }}
                value={m.role}
                onChange={(e) =>
                  onChangeRole(m.id, e.target.value as OrgRole)
                }
              >
                {EDITABLE_ROLE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            ) : (
              <span
                className={`ep-teammate-role ${m.role === "owner" ? "owner" : ""}`}
              >
                {ORG_ROLE_LABELS[m.role]}
              </span>
            )}
            {m.status === "pending" ? (
              <span className="v2-chip v2-chip-coral">Invite sent</span>
            ) : (
              <span className="v2-chip v2-chip-accent">Active</span>
            )}
            {iAmOwner &&
              m.role !== "owner" &&
              m.status === "active" && (
                <button
                  type="button"
                  onClick={() => {
                    if (
                      !window.confirm(
                        `Make ${m.email} the new owner? You'll be demoted to admin and can no longer delete the org.`,
                      )
                    )
                      return;
                    onTransferOwnership(m.id);
                  }}
                  disabled={transferBusy}
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "4px 10px",
                    borderRadius: 999,
                    border: "1px solid var(--v2-ink-200)",
                    background: "white",
                    color: "var(--v2-ink-700)",
                    cursor: transferBusy ? "not-allowed" : "pointer",
                    whiteSpace: "nowrap",
                  }}
                  title="Transfer ownership"
                >
                  Make owner
                </button>
              )}
            <button
              type="button"
              className="ob-icon-btn danger"
              onClick={() => onRemove(m.id)}
              disabled={m.role === "owner"}
              title={
                m.role === "owner"
                  ? "Owner can't be removed"
                  : "Remove"
              }
            >
              <Icon name="x" size={14} />
            </button>
          </div>
        );
      })}
    </section>
  );
}

/* ---------- jobs section ---------- */

function JobsSection({
  id,
  jobs,
  counts,
  onNew,
  onEdit,
  onPreview,
  onApplicants,
  onCloseJob,
  onReopen,
  onDelete,
  onDuplicate,
  busy,
}: {
  id?: string;
  jobs: JobRow[];
  counts: Record<string, number>;
  onNew: () => void;
  onEdit: (id: string) => void;
  onPreview: (id: string) => void;
  onApplicants: (id: string) => void;
  onCloseJob: (id: string) => void;
  onReopen: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  busy: boolean;
}) {
  const published = jobs.filter((j) => j.status === "published").length;
  const drafts = jobs.filter((j) => j.status === "draft").length;

  return (
    <section id={id} className="pp-section" style={{ scrollMarginTop: 100 }}>
      <div className="pp-section-head">
        <div>
          <div className="pp-section-title">Open roles</div>
          <div className="pp-section-sub">
            {published} published · {drafts} draft
          </div>
        </div>
        <button className="v2-btn v2-btn-primary v2-btn-sm" onClick={onNew}>
          <Icon name="plus" size={14} /> New job
        </button>
      </div>

      {jobs.length === 0 ? (
        <div
          style={{
            padding: 32,
            border: "1px dashed var(--v2-ink-200)",
            borderRadius: "var(--v2-r-lg)",
            textAlign: "center",
            color: "var(--v2-ink-500)",
          }}
        >
          <Icon name="briefcase" size={24} />
          <div
            style={{
              marginTop: 10,
              fontFamily: "var(--v2-font-serif)",
              fontSize: 20,
              color: "var(--v2-ink-900)",
              fontWeight: 400,
            }}
          >
            No roles yet
          </div>
          <div style={{ marginTop: 4, fontSize: 14 }}>
            Post your first role and Ember will start surfacing matches.
          </div>
          <button
            className="v2-btn v2-btn-accent v2-btn-sm"
            style={{ marginTop: 16 }}
            onClick={onNew}
          >
            New job <Icon name="plus" size={14} />
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {jobs.map((j) => {
            const posted = j.publishedAt ?? j.createdAt;
            const postedLabel = new Date(posted).toLocaleDateString("en-CA", {
              month: "short",
              day: "numeric",
            });
            return (
              <div
                key={j.id}
                style={{
                  padding: 18,
                  border: "1px solid var(--v2-ink-200)",
                  borderRadius: "var(--v2-r-lg)",
                  background: "white",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: 17,
                        marginBottom: 4,
                      }}
                    >
                      {j.title || "Untitled role"}
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--v2-font-mono)",
                        fontSize: 11,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        color: "var(--v2-ink-500)",
                      }}
                    >
                      {j.location || "Location TBD"}
                      {j.workSetup && ` · ${JOB_WORK_SETUP_LABELS[j.workSetup]}`}
                      {` · ${
                        j.status === "draft"
                          ? "Created"
                          : j.status === "published"
                            ? "Posted"
                            : "Closed"
                      } ${postedLabel}`}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {j.sector && (
                      <span className="v2-chip">
                        {JOB_SECTOR_LABELS[j.sector]}
                      </span>
                    )}
                    <span
                      className={`v2-chip ${
                        j.status === "published"
                          ? "v2-chip-accent"
                          : j.status === "closed"
                            ? "v2-chip-coral"
                            : "v2-chip-outline"
                      }`}
                    >
                      {j.status === "published"
                        ? "Published"
                        : j.status === "closed"
                          ? "Closed"
                          : "Draft"}
                    </span>
                  </div>
                </div>
                {j.status !== "draft" &&
                  (() => {
                    const count = counts[j.id] ?? 0;
                    return (
                      <div
                        style={{
                          marginTop: 10,
                          fontFamily: "var(--v2-font-mono)",
                          fontSize: 11,
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          color:
                            count > 0
                              ? "var(--v2-ink-700)"
                              : "var(--v2-ink-500)",
                        }}
                      >
                        {count === 0
                          ? "No applicants yet"
                          : `${count} applicant${count === 1 ? "" : "s"}`}
                      </div>
                    );
                  })()}
                <div
                  style={{
                    marginTop: 14,
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  {j.status === "draft" ? (
                    <>
                      <button
                        className="v2-btn v2-btn-ghost v2-btn-sm"
                        onClick={() => onEdit(j.id)}
                      >
                        Resume editing
                      </button>
                      <button
                        className="v2-btn v2-btn-ghost v2-btn-sm"
                        onClick={() => onDuplicate(j.id)}
                        disabled={busy}
                      >
                        Duplicate
                      </button>
                      <button
                        className="v2-btn v2-btn-ghost v2-btn-sm"
                        onClick={() => onDelete(j.id)}
                        disabled={busy}
                      >
                        Delete draft
                      </button>
                    </>
                  ) : j.status === "published" ? (
                    <>
                      <button
                        className="v2-btn v2-btn-primary v2-btn-sm"
                        onClick={() => onApplicants(j.id)}
                      >
                        Applicants ({counts[j.id] ?? 0}){" "}
                        <Icon name="arrowUpRight" size={13} />
                      </button>
                      <button
                        className="v2-btn v2-btn-ghost v2-btn-sm"
                        onClick={() => onEdit(j.id)}
                      >
                        Edit
                      </button>
                      <button
                        className="v2-btn v2-btn-ghost v2-btn-sm"
                        onClick={() => onPreview(j.id)}
                      >
                        Preview
                      </button>
                      <button
                        className="v2-btn v2-btn-ghost v2-btn-sm"
                        onClick={() => onCloseJob(j.id)}
                        disabled={busy}
                      >
                        Close
                      </button>
                      <button
                        className="v2-btn v2-btn-ghost v2-btn-sm"
                        onClick={() => onDuplicate(j.id)}
                        disabled={busy}
                      >
                        Duplicate
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="v2-btn v2-btn-ghost v2-btn-sm"
                        onClick={() => onApplicants(j.id)}
                      >
                        Applicants ({counts[j.id] ?? 0}){" "}
                        <Icon name="arrowUpRight" size={13} />
                      </button>
                      <button
                        className="v2-btn v2-btn-ghost v2-btn-sm"
                        onClick={() => onEdit(j.id)}
                      >
                        Edit
                      </button>
                      <button
                        className="v2-btn v2-btn-ghost v2-btn-sm"
                        onClick={() => onPreview(j.id)}
                      >
                        Preview
                      </button>
                      <button
                        className="v2-btn v2-btn-primary v2-btn-sm"
                        onClick={() => onReopen(j.id)}
                        disabled={busy}
                      >
                        Reopen
                      </button>
                      <button
                        className="v2-btn v2-btn-ghost v2-btn-sm"
                        onClick={() => onDuplicate(j.id)}
                        disabled={busy}
                      >
                        Duplicate
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

/* ---------- hiring prefs ---------- */

function PrefsSection({
  id,
  initial,
  saving,
  onSave,
}: {
  id?: string;
  initial: OrgRow;
  saving: boolean;
  onSave: (input: {
    defaultWorkSetup: WorkSetup | null;
    hiringPace: HiringPace | null;
    focusRoles: string[];
    autoMatch: boolean;
    prioritizeDiverse: boolean;
  }) => void;
}) {
  const [edit, setEdit] = useState(false);
  const [setup, setSetup] = useState<WorkSetup | null>(initial.defaultWorkSetup);
  const [pace, setPace] = useState<HiringPace | null>(initial.hiringPace);
  const [focus, setFocus] = useState<string[]>(initial.focusRoles);
  const [autoMatch, setAutoMatch] = useState(initial.autoMatch);
  const [dei, setDei] = useState(initial.prioritizeDiverse);

  const dirty =
    setup !== initial.defaultWorkSetup ||
    pace !== initial.hiringPace ||
    JSON.stringify(focus) !== JSON.stringify(initial.focusRoles) ||
    autoMatch !== initial.autoMatch ||
    dei !== initial.prioritizeDiverse;

  const toggleFocus = (f: string) =>
    setFocus((curr) =>
      curr.includes(f) ? curr.filter((x) => x !== f) : [...curr, f],
    );

  if (!edit) {
    return (
      <section id={id} className="pp-section" style={{ scrollMarginTop: 100 }}>
        <div className="pp-section-head">
          <div>
            <div className="pp-section-title">Hiring preferences</div>
            <div className="pp-section-sub">
              Defaults applied to every new role
            </div>
          </div>
          <button
            className="v2-btn v2-btn-ghost v2-btn-sm"
            onClick={() => {
              setSetup(initial.defaultWorkSetup);
              setPace(initial.hiringPace);
              setFocus(initial.focusRoles);
              setAutoMatch(initial.autoMatch);
              setDei(initial.prioritizeDiverse);
              setEdit(true);
            }}
          >
            Edit preferences
          </button>
        </div>
        <div className="pp-prefs">
          <PrefTile
            icon="zap"
            label="Hiring pace"
            value={
              initial.hiringPace
                ? HIRING_PACE_LABELS[initial.hiringPace]
                : "Not set"
            }
          />
          <PrefTile
            icon="building"
            label="Default work setup"
            value={
              initial.defaultWorkSetup
                ? WORK_SETUP_OPTIONS.find(
                    (w) => w.value === initial.defaultWorkSetup,
                  )?.label ?? "Not set"
                : "Not set"
            }
          />
          <PrefTile
            icon="sparkles"
            label="Auto-match"
            value={initial.autoMatch ? "On" : "Off"}
          />
          <PrefTile
            icon="users"
            label="Diverse slates"
            value={initial.prioritizeDiverse ? "Prioritized" : "Standard"}
          />
        </div>
        {initial.focusRoles.length > 0 && (
          <div style={{ marginTop: 20 }}>
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
              Focus roles
            </div>
            <div className="v2-filter-chips">
              {initial.focusRoles.map((f) => (
                <span key={f} className="v2-filter-chip active">
                  {f}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>
    );
  }

  return (
    <section id={id} className="pp-section" style={{ scrollMarginTop: 100 }}>
      <div className="pp-section-head">
        <div>
          <div className="pp-section-title">Hiring preferences</div>
          <div className="pp-section-sub">Private · shapes your matches</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="v2-btn v2-btn-ghost v2-btn-sm"
            onClick={() => setEdit(false)}
          >
            Cancel
          </button>
          <button
            className="v2-btn v2-btn-primary v2-btn-sm"
            disabled={!dirty || saving}
            onClick={() => {
              onSave({
                defaultWorkSetup: setup,
                hiringPace: pace,
                focusRoles: focus,
                autoMatch,
                prioritizeDiverse: dei,
              });
              setEdit(false);
            }}
          >
            {saving ? "Saving…" : "Save preferences"}
          </button>
        </div>
      </div>

      <div className="ob-pref-group" style={{ paddingTop: 0, borderTop: 0 }}>
        <div className="ob-pref-title">Focus roles</div>
        <div className="v2-filter-chips">
          {FOCUS_ROLE_OPTIONS.map((f) => {
            const active = focus.includes(f);
            return (
              <button
                key={f}
                type="button"
                className={`v2-filter-chip ${active ? "active" : ""}`}
                onClick={() => toggleFocus(f)}
              >
                {f}
              </button>
            );
          })}
        </div>
      </div>

      <div className="ob-pref-group">
        <div className="ob-pref-title">Default work setup</div>
        <div className="v2-filter-chips">
          {WORK_SETUP_OPTIONS.map((s) => (
            <button
              key={s.value}
              type="button"
              className={`v2-filter-chip ${setup === s.value ? "active" : ""}`}
              onClick={() => setSetup(s.value)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="ob-pref-group">
        <div className="ob-pref-title">Hiring pace</div>
        <div className="v2-filter-chips">
          {HIRING_PACE_OPTIONS.map((p) => (
            <button
              key={p.value}
              type="button"
              className={`v2-filter-chip ${pace === p.value ? "active" : ""}`}
              onClick={() => setPace(p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="ob-pref-group">
        <div className="ob-pref-title">Ember settings</div>
        <div className="ob-toggle-row">
          <div>
            <div className="ob-toggle-label">Auto-match candidates</div>
            <div className="ob-toggle-desc">
              Ember surfaces strong matches in your feed within an hour of
              posting.
            </div>
          </div>
          <div
            className={`ob-toggle ${autoMatch ? "on" : ""}`}
            role="switch"
            aria-checked={autoMatch}
            onClick={() => setAutoMatch(!autoMatch)}
          />
        </div>
        <div className="ob-toggle-row">
          <div>
            <div className="ob-toggle-label">Prioritize diverse slates</div>
            <div className="ob-toggle-desc">
              Ensure at least one under-represented candidate in every top-10
              match list.
            </div>
          </div>
          <div
            className={`ob-toggle ${dei ? "on" : ""}`}
            role="switch"
            aria-checked={dei}
            onClick={() => setDei(!dei)}
          />
        </div>
      </div>
    </section>
  );
}

function PrefTile({
  icon,
  label,
  value,
}: {
  icon: IconName;
  label: string;
  value: string;
}) {
  return (
    <div className="pp-pref">
      <div className="pp-pref-ico">
        <Icon name={icon} size={16} />
      </div>
      <div>
        <div className="pp-pref-label">{label}</div>
        <div className="pp-pref-value">{value}</div>
      </div>
    </div>
  );
}

/* ---------- plan section ---------- */

/* PlanSection removed — replaced by BillingSection (live Stripe-backed). */

/* ---------- verification section ---------- */

function VerificationSection({ id, org }: { id?: string; org: OrgRow }) {
  return (
    <section id={id} className="pp-section" style={{ scrollMarginTop: 100 }}>
      <div className="pp-section-head">
        <div>
          <div className="pp-section-title">Verification</div>
          <div className="pp-section-sub">
            {org.verified
              ? `Verified${org.verifiedAt ? ` ${org.verifiedAt.toLocaleDateString()}` : ""}`
              : "Proves you work at the company"}
          </div>
        </div>
      </div>

      <div className={`ep-verify-status ${org.verified ? "good" : ""}`}>
        <div className="ep-verify-icon">
          <Icon name={org.verified ? "check" : "shield"} size={24} />
        </div>
        <div>
          <div className="ep-verify-title">
            {org.verified ? "Verified" : "Pending verification"}
          </div>
          <div className="ep-verify-desc">
            {org.verified
              ? "Job posting and candidate messaging unlocked."
              : "Head back to onboarding to finish verifying the domain."}
          </div>
        </div>
        <span
          className={`v2-chip ${
            org.verified ? "v2-chip-accent" : "v2-chip-coral"
          }`}
        >
          {org.verified ? "Active" : "Pending"}
        </span>
      </div>
    </section>
  );
}

/* ---------- helpers ---------- */

function computeCompleteness(org: OrgRow | null): number {
  if (!org) return 0;
  let score = 0;
  const total = 7;
  if (org.tagline) score += 1;
  if (org.about) score += 1;
  if (org.hq) score += 1;
  if (org.primarySector) score += 1;
  if (org.size) score += 1;
  if (org.verified) score += 1;
  if (org.focusRoles.length > 0) score += 1;
  return Math.round((score / total) * 100);
}
