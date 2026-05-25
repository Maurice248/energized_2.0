"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon, type IconName } from "@/components/shared/icon";
import { PasswordInput } from "@/components/shared/password-input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AddRoleDialog,
  type RoleDialogInitial,
} from "@/components/shared/add-role-dialog";
import {
  AddCertDialog,
  type CertDialogInitial,
} from "@/components/shared/add-cert-dialog";
import {
  AddEducationDialog,
  type EducationDialogInitial,
} from "@/components/shared/add-education-dialog";
import { SkillsPicker } from "@/components/shared/skills-picker";
import {
  SuggestionCombobox,
} from "@/components/shared/suggestion-combobox";
import { LOCATION_SUGGESTIONS } from "@/components/shared/add-role-dialog";
import { api } from "@/lib/trpc/client";
import { authClient, signOut } from "@/lib/auth/client";
import { JobseekerBillingSection } from "./jobseeker-billing-section";
import {
  PROFILE_SIDEBAR_SCROLL_SPY_HOLD_MS,
  useProfileSidebarScrollSpy,
} from "@/hooks/use-profile-sidebar-scroll-spy";
import { ResumeAutofillModal } from "@/components/profile/resume-autofill-modal";
import type { ResumeAutofillDraft } from "@/lib/resume-extraction-map";
import { resumeAutofillSkipMessage } from "@/lib/resume-autofill-messages";
import { toast } from "sonner";

const NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: "user" as IconName },
  { id: "resume", label: "Resume", icon: "fileText" as IconName },
  { id: "work", label: "Work history", icon: "briefcase" as IconName },
  { id: "education", label: "Education", icon: "graduationCap" as IconName },
  { id: "certs", label: "Certifications", icon: "shield" as IconName },
  { id: "skills", label: "Skills", icon: "sparkles" as IconName },
  { id: "preferences", label: "Preferences", icon: "sliders" as IconName },
  { id: "billing", label: "Plan & billing", icon: "dollar" as IconName },
  { id: "account", label: "Account & privacy", icon: "lock" as IconName },
];

/** Stable order for scroll-spy anchors (`#pp-{id}`) in DOM order */
const JOBSEEKER_PROFILE_SCROLL_IDS: readonly string[] = NAV_ITEMS.map(
  (n) => n.id,
);

type SectorEnum =
  | "oil_gas"
  | "renewables"
  | "nuclear"
  | "utilities"
  | "hydrogen"
  | "power"
  | "other";

type RemoteEnum = "on_site" | "hybrid" | "remote" | "flexible";

type AvailabilityEnum =
  | "immediately"
  | "notice_2w"
  | "notice_4w"
  | "notice_3m"
  | "browsing";

const SECTOR_ORDER: { value: SectorEnum; label: string }[] = [
  { value: "oil_gas", label: "Oil & Gas" },
  { value: "renewables", label: "Renewable Energy" },
  { value: "nuclear", label: "Nuclear" },
  { value: "utilities", label: "Power Utilities" },
  { value: "hydrogen", label: "Hydrogen" },
  { value: "power", label: "Power" },
];

const REMOTE_OPTIONS: { value: RemoteEnum; label: string }[] = [
  { value: "on_site", label: "Onsite" },
  { value: "hybrid", label: "Hybrid" },
  { value: "remote", label: "Remote" },
  { value: "flexible", label: "Flexible" },
];

const AVAILABILITY_OPTIONS: { value: AvailabilityEnum; label: string }[] = [
  { value: "immediately", label: "Immediately" },
  { value: "notice_2w", label: "2 weeks notice" },
  { value: "notice_4w", label: "4 weeks notice" },
  { value: "notice_3m", label: "3+ months" },
  { value: "browsing", label: "Just browsing" },
];

export function ProfileClient({
  userId,
  name,
  email,
  initialImage,
  role,
  emailVerified,
  joinedAt,
}: {
  userId: string;
  name: string;
  email: string;
  initialImage: string | null;
  role: string;
  emailVerified: boolean;
  joinedAt: Date | string | null;
}) {
  const router = useRouter();
  const profileQuery = api.profile.get.useQuery();
  const update = api.profile.update.useMutation({
    onSuccess: () => void profileQuery.refetch(),
  });
  const setResume = api.profile.setResume.useMutation({
    onSuccess: () => void profileQuery.refetch(),
  });
  const previewResumeExtraction = api.profile.previewResumeExtraction.useMutation();
  const applyResumeExtraction = api.profile.applyResumeExtraction.useMutation({
    onSuccess: () => void profileQuery.refetch(),
  });
  const removeCert = api.profile.removeCertification.useMutation({
    onSuccess: () => void profileQuery.refetch(),
  });
  const removeWork = api.profile.removeWorkHistory.useMutation({
    onSuccess: () => void profileQuery.refetch(),
  });
  const removeEdu = api.profile.removeEducation.useMutation({
    onSuccess: () => void profileQuery.refetch(),
  });

  const [active, setActive] = useState<string>("overview");
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleDialogInitial | null>(null);
  const [certDialogOpen, setCertDialogOpen] = useState(false);
  const [editingCert, setEditingCert] = useState<CertDialogInitial | null>(null);
  const [eduDialogOpen, setEduDialogOpen] = useState(false);
  const [editingEdu, setEditingEdu] = useState<EducationDialogInitial | null>(
    null,
  );
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialImage);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [resumeAutofillOpen, setResumeAutofillOpen] = useState(false);
  const [resumeAutofillDraft, setResumeAutofillDraft] =
    useState<ResumeAutofillDraft | null>(null);
  const [resumeAutofillSession, setResumeAutofillSession] = useState(0);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const sidebarLocationAlignRef = useRef<HTMLDivElement | null>(null);
  /** Grey rule atop “Profile strength” when `.pp-location` is missing */
  const sidebarDividerFallbackAlignRef = useRef<HTMLDivElement | null>(null);
  const programmaticScrollHoldUntilRef = useRef(0);
  const setAvatar = api.profile.setAvatar.useMutation();

  useProfileSidebarScrollSpy({
    navIdsOrdered: JOBSEEKER_PROFILE_SCROLL_IDS,
    sectionIdPrefix: "pp",
    setActive,
    enabled: true,
    layoutKey: profileQuery.data?.profile?.id ?? "",
    sidebarLocationAlignRef,
    sidebarDividerFallbackAlignRef,
    programmaticScrollHoldUntilRef,
  });

  useEffect(() => {
    function syncFromHash() {
      const h = window.location.hash.slice(1);
      if (!h.startsWith("pp-")) return;
      const id = h.slice(3);
      if (!(JOBSEEKER_PROFILE_SCROLL_IDS as readonly string[]).includes(id)) {
        return;
      }
      setActive(id);
    }
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, [setActive]);

  const handleAvatar = async (file: File) => {
    setAvatarError(null);
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError("Image must be under 2MB.");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setAvatarError("JPG, PNG, or WebP only.");
      return;
    }
    setAvatarBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload/avatar", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = (await res.json()) as { url: string };
      await setAvatar.mutateAsync({ url });
      setAvatarUrl(url);
    } catch (e) {
      setAvatarError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setAvatarBusy(false);
    }
  };

  const [firstName, lastName] = splitName(name);
  const data = profileQuery.data;
  const profile = data?.profile;

  const saving = update.isPending || setResume.isPending;

  const profileChecks = computeProfileChecks(profile, data ?? undefined);
  const completeness =
    profileChecks.length === 0
      ? 0
      : Math.round(
          (profileChecks.filter((c) => c.done).length / profileChecks.length) *
            100,
        );
  const missingFields = profileChecks
    .filter((c) => !c.done)
    .map((c) => c.label);

  const expiringCertCount = (data?.certifications ?? []).filter(
    (c) => expiryState(c.expiresAt) === "warn",
  ).length;

  return (
    <div className="pp-shell v2">
      <div className="pp-body">
        <aside className="pp-side">
          <div className="pp-identity">
            <div
              className="pp-avatar"
              style={
                avatarUrl
                  ? {
                      backgroundImage: `url(${avatarUrl})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      color: "transparent",
                    }
                  : undefined
              }
            >
              {avatarUrl ? "" : initials(name) || "U"}
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: "none" }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleAvatar(f);
                }}
              />
              <button
                className="pp-avatar-edit"
                aria-label="Change photo"
                title={avatarBusy ? "Uploading…" : "Change photo"}
                type="button"
                disabled={avatarBusy}
                onClick={() => avatarInputRef.current?.click()}
              >
                <Icon name="upload" size={12} />
              </button>
            </div>
            {avatarError && (
              <div
                style={{
                  marginTop: 8,
                  fontSize: 12,
                  color: "#A63A20",
                }}
              >
                {avatarError}
              </div>
            )}
            <div className="pp-name">{name || "Your name"}</div>
            <div className="pp-title">
              {profile?.headline || "Add a headline"}
            </div>
            {profile?.location && (
              <div ref={sidebarLocationAlignRef} className="pp-location">
                <Icon name="mapPin" size={11} /> {profile.location}
              </div>
            )}

            <div
              ref={sidebarDividerFallbackAlignRef}
              className="pp-completeness"
            >
              <div className="pp-completeness-head">
                <span className="pp-completeness-label">Profile strength</span>
                <span className="pp-completeness-pct">{completeness}%</span>
              </div>
              <div className="ob-completion-bar">
                <div
                  className="ob-completion-bar-fill"
                  style={{ width: `${completeness}%` }}
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
                {missingFields.length === 0
                  ? "Your profile is complete."
                  : `Add ${profileChecksFormatter.format(missingFields)} to reach 100%.`}
              </div>
            </div>
          </div>

          <nav className="pp-nav">
            {NAV_ITEMS.map((n) => (
              <div
                key={n.id}
                className={`pp-nav-item ${active === n.id ? "active" : ""}`}
                onClick={() => {
                  programmaticScrollHoldUntilRef.current =
                    Date.now() + PROFILE_SIDEBAR_SCROLL_SPY_HOLD_MS;
                  setActive(n.id);
                  document
                    .getElementById(`pp-${n.id}`)
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              >
                <Icon name={n.icon} size={16} />
                <span>{n.label}</span>
                {n.id === "certs" && expiringCertCount > 0 && (
                  <span className="pp-nav-badge">{expiringCertCount}</span>
                )}
              </div>
            ))}
          </nav>

          <div className="pp-side-cta">
            <h4>
              Redo <em>onboarding</em>?
            </h4>
            <p>
              Profile feels stale? Walk through the 6-step wizard again —
              anything you&apos;ve already filled will be pre-filled.
            </p>
            <button
              className="v2-btn v2-btn-accent v2-btn-sm"
              style={{ marginTop: 16 }}
              onClick={() => router.push("/onboarding?retake=1")}
            >
              Restart wizard <Icon name="arrowRight" size={14} />
            </button>
          </div>
        </aside>

        <main className="pp-main">
          <div className="pp-page-head">
            <div>
              <h1 className="pp-page-title">
                Your <em>profile</em>.
              </h1>
              <div className="pp-page-sub">
                Everything employers see — and the signals we use to match
                you to roles.
              </div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div className="ob-save-state">
                <span className="dot" />
                <span>{saving ? "Saving…" : "All changes saved"}</span>
              </div>
              <button
                className="v2-btn v2-btn-ghost v2-btn-sm"
                onClick={() => window.open(`/p/${userId}`, "_blank")}
              >
                <Icon name="eye" size={14} /> Preview public profile
              </button>
            </div>
          </div>

          {profileQuery.isLoading && !data && <ProfileSkeleton />}

          {/* Basics */}
          <div id="pp-overview" style={{ scrollMarginTop: 100 }} />
          {profile && (
            <BasicsForm
              key={profile.id}
              initialHeadline={profile.headline ?? ""}
              initialLocation={profile.location ?? ""}
              initialPhone={profile.phone ?? ""}
              initialSummary={profile.summary ?? ""}
              firstName={firstName}
              lastName={lastName}
              email={email}
              saving={update.isPending}
              onSave={(values) =>
                update.mutate({
                  headline: values.headline || null,
                  location: values.location || null,
                  phone: values.phone || null,
                  summary: values.summary || null,
                  yearsExperience: profile.yearsExperience,
                  sectors: profile.sectors,
                  willingToRelocate: profile.willingToRelocate,
                  remotePreference: profile.remotePreference,
                })
              }
            />
          )}

          {/* Resume */}
          <div id="pp-resume" style={{ scrollMarginTop: 100 }} />
          <ResumeSection
            resumeUrl={profile?.resumeUrl ?? null}
            resumeFilename={profile?.resumeFilename ?? null}
            resumeUploadedAt={profile?.resumeUploadedAt ?? null}
            onUpload={async (file) => {
              const fd = new FormData();
              fd.append("file", file);
              const res = await fetch("/api/upload/resume", {
                method: "POST",
                body: fd,
              });
              if (!res.ok) throw new Error("Upload failed");
              const body = (await res.json()) as {
                url: string;
                filename: string;
              };
              await setResume.mutateAsync(body);
              try {
                const preview = await previewResumeExtraction.mutateAsync({
                  url: body.url,
                  filename: body.filename,
                });
                if (preview.hasSuggestions && "draft" in preview) {
                  setResumeAutofillSession((s) => s + 1);
                  setResumeAutofillDraft(preview.draft);
                  setResumeAutofillOpen(true);
                } else if (!preview.hasSuggestions) {
                  toast.info(resumeAutofillSkipMessage(preview.reason));
                }
              } catch {
                toast.error(
                  "Could not analyze the resume. Your file was saved — try again later.",
                );
              }
            }}
          />

          {/* Work history */}
          <section
            id="pp-work"
            className="pp-section"
            style={{ scrollMarginTop: 100 }}
          >
            <div className="pp-section-head">
              <div>
                <div className="pp-section-title">Work history</div>
                <div className="pp-section-sub">
                  {(data?.workHistory.length ?? 0)} roles · oldest at the
                  bottom
                </div>
              </div>
              <button
                className="ob-add-btn"
                onClick={() => {
                  setEditingRole(null);
                  setRoleDialogOpen(true);
                }}
              >
                <Icon name="plus" size={14} /> Add a role
              </button>
            </div>
            {(data?.workHistory ?? []).length === 0 && (
              <p style={{ color: "var(--v2-ink-500)", fontSize: 14 }}>
                No roles yet.
              </p>
            )}
            {(data?.workHistory ?? []).map((w) => (
              <div key={w.id} className="ob-card">
                <div className="ob-card-head">
                  <div
                    className="ob-card-logo"
                    style={{ background: "var(--v2-ink-700)" }}
                  >
                    {w.employerName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="ob-card-role">{w.roleTitle}</div>
                    <div className="ob-card-company">
                      <strong
                        style={{
                          color: "var(--v2-ink-900)",
                          fontWeight: 600,
                        }}
                      >
                        {w.employerName}
                      </strong>
                      {w.site && (
                        <>
                          <span className="sep">·</span>
                          <span>{w.site}</span>
                        </>
                      )}
                      <span className="sep">·</span>
                      <span>
                        {formatMonth(w.startedAt)} —{" "}
                        {w.endedAt ? formatMonth(w.endedAt) : "Present"}
                      </span>
                      {!w.endedAt && (
                        <span
                          className="v2-chip v2-chip-accent"
                          style={{ padding: "2px 8px", fontSize: 11 }}
                        >
                          Current
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {w.summary && <div className="ob-card-body">{w.summary}</div>}
                {w.skills.length > 0 && (
                  <div className="ob-card-chips">
                    {w.skills.map((s) => (
                      <span key={s} className="v2-chip v2-chip-outline">
                        {s}
                      </span>
                    ))}
                  </div>
                )}
                <div className="ob-card-actions">
                  <button
                    className="ob-icon-btn"
                    onClick={() => {
                      setEditingRole({
                        id: w.id,
                        employerName: w.employerName,
                        roleTitle: w.roleTitle,
                        site: w.site,
                        sector: w.sector,
                        commodity: w.commodity,
                        rotation: w.rotation,
                        startedAt: w.startedAt,
                        endedAt: w.endedAt,
                        summary: w.summary,
                        skills: w.skills,
                      });
                      setRoleDialogOpen(true);
                    }}
                    title="Edit"
                  >
                    <Icon name="settings" size={14} />
                  </button>
                  <button
                    className="ob-icon-btn danger"
                    onClick={() => removeWork.mutate({ id: w.id })}
                    title="Remove"
                  >
                    <Icon name="x" size={14} />
                  </button>
                </div>
              </div>
            ))}
          </section>

          {/* Education */}
          <section
            id="pp-education"
            className="pp-section"
            style={{ scrollMarginTop: 100 }}
          >
            <div className="pp-section-head">
              <div>
                <div className="pp-section-title">Education</div>
                <div className="pp-section-sub">
                  {(data?.education.length ?? 0)} school
                  {(data?.education.length ?? 0) === 1 ? "" : "s"} on file
                </div>
              </div>
              <button
                className="ob-add-btn"
                onClick={() => {
                  setEditingEdu(null);
                  setEduDialogOpen(true);
                }}
              >
                <Icon name="plus" size={14} /> Add education
              </button>
            </div>
            {(data?.education ?? []).length === 0 && (
              <p style={{ color: "var(--v2-ink-500)", fontSize: 14 }}>
                No education on file yet.
              </p>
            )}
            {(data?.education ?? []).map((e) => (
              <div key={e.id} className="ob-card">
                <div className="ob-card-head">
                  <div
                    className="ob-card-logo"
                    style={{ background: "var(--v2-ink-700)" }}
                  >
                    <Icon name="graduationCap" size={20} />
                  </div>
                  <div>
                    <div className="ob-card-role">
                      {e.degree || "Unnamed degree"}
                    </div>
                    <div className="ob-card-company">
                      <strong
                        style={{
                          color: "var(--v2-ink-900)",
                          fontWeight: 600,
                        }}
                      >
                        {e.school}
                      </strong>
                      <span className="sep">·</span>
                      <span>
                        {formatEduYears(e.startedYear, e.endedYear)}
                      </span>
                      {!e.endedYear && (
                        <span
                          className="v2-chip v2-chip-accent"
                          style={{ padding: "2px 8px", fontSize: 11 }}
                        >
                          Current
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {e.details && (
                  <div className="ob-card-body">{e.details}</div>
                )}
                <div className="ob-card-actions">
                  <button
                    className="ob-icon-btn"
                    onClick={() => {
                      setEditingEdu({
                        id: e.id,
                        school: e.school,
                        degree: e.degree,
                        startedYear: e.startedYear,
                        endedYear: e.endedYear,
                        details: e.details,
                      });
                      setEduDialogOpen(true);
                    }}
                    title="Edit"
                  >
                    <Icon name="settings" size={14} />
                  </button>
                  <button
                    className="ob-icon-btn danger"
                    onClick={() => removeEdu.mutate({ id: e.id })}
                    title="Remove"
                  >
                    <Icon name="x" size={14} />
                  </button>
                </div>
              </div>
            ))}
          </section>

          {/* Certifications */}
          <section
            id="pp-certs"
            className="pp-section"
            style={{ scrollMarginTop: 100 }}
          >
            <div className="pp-section-head">
              <div>
                <div className="pp-section-title">
                  Certifications &amp; tickets
                </div>
                <div className="pp-section-sub">
                  {(data?.certifications.length ?? 0)} on file
                  {expiringCertCount > 0 &&
                    ` · ${expiringCertCount} expiring soon`}
                </div>
              </div>
              <button
                className="ob-add-btn"
                onClick={() => {
                  setEditingCert(null);
                  setCertDialogOpen(true);
                }}
              >
                <Icon name="plus" size={14} /> Add certification
              </button>
            </div>
            {(data?.certifications ?? []).length === 0 && (
              <p style={{ color: "var(--v2-ink-500)", fontSize: 14 }}>
                No certifications on file.
              </p>
            )}
            {(data?.certifications ?? []).map((c) => {
              const state = expiryState(c.expiresAt);
              return (
                <div key={c.id} className="ob-cert">
                  <div className="ob-cert-ico">
                    <Icon name={iconForCert(c.type)} size={20} />
                  </div>
                  <div>
                    <div className="ob-cert-name">{c.name}</div>
                    <div className="ob-cert-meta">
                      {c.issuer ?? "Issuer unknown"}
                      {c.issuedAt && ` · Issued ${c.issuedAt.getFullYear()}`}
                    </div>
                  </div>
                  <div className={`ob-cert-expiry ${state}`}>
                    {!c.expiresAt
                      ? "NO EXPIRY"
                      : state === "warn"
                      ? `EXPIRES ${formatMonth(c.expiresAt)}`
                      : `VALID → ${formatMonth(c.expiresAt)}`}
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    {c.documentUrl ? (
                      <a
                        className="ob-icon-btn"
                        href={c.documentUrl}
                        target="_blank"
                        rel="noreferrer"
                        title="View attached document"
                      >
                        <Icon name="fileText" size={14} />
                      </a>
                    ) : (
                      <button
                        className="ob-icon-btn"
                        onClick={() => {
                          setEditingCert({
                            id: c.id,
                            type: c.type as CertDialogInitial["type"],
                            name: c.name,
                            issuer: c.issuer,
                            credentialId: c.credentialId,
                            issuedAt: c.issuedAt,
                            expiresAt: c.expiresAt,
                            documentUrl: c.documentUrl,
                          });
                          setCertDialogOpen(true);
                        }}
                        title="Attach file"
                      >
                        <Icon name="upload" size={14} />
                      </button>
                    )}
                    <button
                      className="ob-icon-btn"
                      onClick={() => {
                        setEditingCert({
                          id: c.id,
                          type: c.type as CertDialogInitial["type"],
                          name: c.name,
                          issuer: c.issuer,
                          credentialId: c.credentialId,
                          issuedAt: c.issuedAt,
                          expiresAt: c.expiresAt,
                          documentUrl: c.documentUrl,
                        });
                        setCertDialogOpen(true);
                      }}
                      title="Edit"
                    >
                      <Icon name="settings" size={14} />
                    </button>
                    <button
                      className="ob-icon-btn danger"
                      onClick={() => removeCert.mutate({ id: c.id })}
                      title="Remove"
                    >
                      <Icon name="x" size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </section>

          {/* Skills */}
          <div id="pp-skills" style={{ scrollMarginTop: 100 }} />
          {profile && (
            <SkillsSection
              key={`skills-${profile.id}-${String(profile.updatedAt)}`}
              initial={profile.skills}
              saving={update.isPending}
              onSave={(next) =>
                update.mutate({
                  headline: profile.headline,
                  yearsExperience: profile.yearsExperience,
                  sectors: profile.sectors,
                  willingToRelocate: profile.willingToRelocate,
                  remotePreference: profile.remotePreference,
                  location: profile.location,
                  skills: next,
                })
              }
            />
          )}

          {/* Preferences */}
          <div id="pp-preferences" style={{ scrollMarginTop: 100 }} />
          {profile && (
            <PreferencesCard
              key={`prefs-${profile.id}`}
              initial={{
                openToWork: profile.openToWork,
                fifoRotational: profile.fifoRotational,
                willingToRelocate: profile.willingToRelocate,
                remotePreference: profile.remotePreference,
                minCompCad: profile.minCompCad,
                availability: profile.availability,
                sectors: profile.sectors,
              }}
              saving={update.isPending}
              onSave={(prefs) =>
                update.mutate({
                  headline: profile.headline,
                  yearsExperience: profile.yearsExperience,
                  location: profile.location,
                  sectors: prefs.sectors,
                  willingToRelocate: prefs.willingToRelocate,
                  remotePreference: prefs.remotePreference,
                  openToWork: prefs.openToWork,
                  fifoRotational: prefs.fifoRotational,
                  minCompCad: prefs.minCompCad,
                  availability: prefs.availability,
                })
              }
            />
          )}

          {/* Plan & billing */}
          <JobseekerBillingSection id="pp-billing" />

          {/* Account & privacy */}
          <div id="pp-account" style={{ scrollMarginTop: 100 }} />
          <AccountSection
            name={name}
            email={email}
            role={role}
            emailVerified={emailVerified}
            joinedAt={joinedAt}
          />
        </main>
      </div>

      <AddRoleDialog
        key={`role-${editingRole?.id ?? "new"}`}
        open={roleDialogOpen}
        onOpenChange={(v) => {
          setRoleDialogOpen(v);
          if (!v) setEditingRole(null);
        }}
        onCreated={() => void profileQuery.refetch()}
        initial={editingRole ?? undefined}
      />
      <AddCertDialog
        key={`cert-${editingCert?.id ?? "new"}`}
        open={certDialogOpen}
        onOpenChange={(v) => {
          setCertDialogOpen(v);
          if (!v) setEditingCert(null);
        }}
        onCreated={() => void profileQuery.refetch()}
        initial={editingCert ?? undefined}
      />
      <AddEducationDialog
        key={`edu-${editingEdu?.id ?? "new"}`}
        open={eduDialogOpen}
        onOpenChange={(v) => {
          setEduDialogOpen(v);
          if (!v) setEditingEdu(null);
        }}
        onCreated={() => void profileQuery.refetch()}
        initial={editingEdu ?? undefined}
      />
      <ResumeAutofillModal
        key={resumeAutofillSession}
        open={resumeAutofillOpen}
        onOpenChange={(v) => {
          setResumeAutofillOpen(v);
          if (!v) setResumeAutofillDraft(null);
        }}
        draft={resumeAutofillDraft}
        applying={applyResumeExtraction.isPending}
        onApply={async (payload) => {
          await applyResumeExtraction.mutateAsync(payload);
          setResumeAutofillOpen(false);
          setResumeAutofillDraft(null);
        }}
      />
    </div>
  );
}

function formatEduYears(
  startedYear: string | null,
  endedYear: string | null,
): string {
  if (startedYear && endedYear) return `${startedYear} — ${endedYear}`;
  if (startedYear && !endedYear) return `${startedYear} — Present`;
  if (!startedYear && endedYear) return `Graduated ${endedYear}`;
  return "Dates not set";
}

/* ---------- subcomponents ---------- */

function SkillsSection({
  initial,
  saving,
  onSave,
}: {
  initial: string[];
  saving: boolean;
  onSave: (next: string[]) => void;
}) {
  const [skills, setSkills] = useState<string[]>(initial);
  const dirty = !sameList(skills, initial);

  return (
    <section className="pp-section">
      <div className="pp-section-head">
        <div>
          <div className="pp-section-title">Core skills</div>
          <div className="pp-section-sub">
            {skills.length} confirmed · pick from the list or add custom
          </div>
        </div>
        <button
          className="v2-btn v2-btn-primary v2-btn-sm"
          disabled={!dirty || saving}
          onClick={() => onSave(skills)}
        >
          {saving ? "Saving…" : "Save skills"}
        </button>
      </div>
      <SkillsPicker skills={skills} setSkills={setSkills} cap={30} />
    </section>
  );
}

function sameList(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function AccountSection({
  name,
  email,
  role,
  emailVerified,
  joinedAt,
}: {
  name: string;
  email: string;
  role: string;
  emailVerified: boolean;
  joinedAt: Date | string | null;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState<
    "signout" | "delete" | "name" | "email" | "password" | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState(name);
  const [newEmail, setNewEmail] = useState("");
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  const deleteMe = api.account.deleteMe.useMutation();

  const handleSignOut = async () => {
    setError(null);
    setBusy("signout");
    try {
      await signOut();
      router.push("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-out failed");
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async () => {
    setError(null);
    setBusy("delete");
    try {
      await deleteMe.mutateAsync();
      try {
        await signOut();
      } catch {
        // session is already invalid — proceed to redirect
      }
      router.push("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
      setBusy(null);
    }
  };

  const handleSaveName = async () => {
    setError(null);
    setNotice(null);
    const next = displayName.trim();
    if (!next || next === name) return;
    setBusy("name");
    try {
      const { error: err } = await authClient.updateUser({ name: next });
      if (err) throw new Error(err.message ?? "Could not update name");
      setNotice("Display name updated.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(null);
    }
  };

  const handleChangeEmail = async () => {
    setError(null);
    setNotice(null);
    const next = newEmail.trim().toLowerCase();
    if (!next || next === email.toLowerCase()) return;
    setBusy("email");
    try {
      const { error: err } = await authClient.changeEmail({ newEmail: next });
      if (err) throw new Error(err.message ?? "Could not change email");
      setNotice(
        `Check ${email} for a link to approve the change to ${next}.`,
      );
      setNewEmail("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Change failed");
    } finally {
      setBusy(null);
    }
  };

  const handleChangePassword = async () => {
    setError(null);
    setNotice(null);
    if (!currentPw || !newPw) return;
    if (newPw.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPw !== confirmPw) {
      setError("New password and confirmation don't match.");
      return;
    }
    setBusy("password");
    try {
      const { error: err } = await authClient.changePassword({
        currentPassword: currentPw,
        newPassword: newPw,
        revokeOtherSessions: true,
      });
      if (err) throw new Error(err.message ?? "Could not change password");
      setNotice("Password updated. Other sessions have been signed out.");
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Password change failed");
    } finally {
      setBusy(null);
    }
  };

  const joined =
    joinedAt instanceof Date
      ? joinedAt
      : joinedAt
        ? new Date(joinedAt)
        : null;

  const nameDirty = displayName.trim() !== name && displayName.trim() !== "";

  return (
    <section className="pp-section">
      <div className="pp-section-head">
        <div>
          <div className="pp-section-title">Account &amp; privacy</div>
          <div className="pp-section-sub">
            Update credentials, session, and irreversible actions
          </div>
        </div>
      </div>

      {notice && (
        <div
          style={{
            padding: "10px 14px",
            background: "var(--v2-ink-50)",
            border: "1px solid var(--v2-ink-200)",
            color: "var(--v2-ink-900)",
            borderRadius: "var(--v2-r-md)",
            fontSize: 13,
            marginBottom: 14,
          }}
        >
          {notice}
        </div>
      )}

      {/* Display name */}
      <div
        style={{
          padding: 18,
          borderRadius: "var(--v2-r-md)",
          border: "1px solid var(--v2-ink-200)",
          marginBottom: 12,
        }}
      >
        <div
          style={{
            fontWeight: 600,
            fontSize: 14,
            marginBottom: 10,
          }}
        >
          Display name
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            className="v2-input-block"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
            style={{ maxWidth: 320 }}
          />
          <button
            className="v2-btn v2-btn-primary v2-btn-sm"
            onClick={handleSaveName}
            disabled={!nameDirty || busy !== null}
          >
            {busy === "name" ? "Saving…" : "Save name"}
          </button>
        </div>
      </div>

      {/* Change email */}
      <div
        style={{
          padding: 18,
          borderRadius: "var(--v2-r-md)",
          border: "1px solid var(--v2-ink-200)",
          marginBottom: 12,
        }}
      >
        <div
          style={{
            fontWeight: 600,
            fontSize: 14,
            marginBottom: 2,
          }}
        >
          Change email
        </div>
        <div
          style={{
            fontSize: 13,
            color: "var(--v2-ink-500)",
            marginBottom: 10,
          }}
        >
          Current: <strong>{email}</strong>{" "}
          {emailVerified ? "· verified" : "· unverified"}. A confirmation link
          will be sent to your current email.
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            className="v2-input-block"
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="new.email@company.ca"
            style={{ maxWidth: 320 }}
            autoComplete="email"
          />
          <button
            className="v2-btn v2-btn-primary v2-btn-sm"
            onClick={handleChangeEmail}
            disabled={
              !newEmail.trim() ||
              newEmail.trim().toLowerCase() === email.toLowerCase() ||
              busy !== null
            }
          >
            {busy === "email" ? "Sending…" : "Send confirmation"}
          </button>
        </div>
      </div>

      {/* Change password */}
      <div
        style={{
          padding: 18,
          borderRadius: "var(--v2-r-md)",
          border: "1px solid var(--v2-ink-200)",
          marginBottom: 18,
        }}
      >
        <div
          style={{
            fontWeight: 600,
            fontSize: 14,
            marginBottom: 2,
          }}
        >
          Change password
        </div>
        <div
          style={{
            fontSize: 13,
            color: "var(--v2-ink-500)",
            marginBottom: 12,
          }}
        >
          You&apos;ll be kept signed in here; other devices will be logged out.
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 10,
          }}
        >
          <PasswordInput
            className="v2-input-block"
            value={currentPw}
            onChange={(e) => setCurrentPw(e.target.value)}
            placeholder="Current password"
            autoComplete="current-password"
          />
          <PasswordInput
            className="v2-input-block"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            placeholder="New password (8+ characters)"
            autoComplete="new-password"
          />
          <PasswordInput
            className="v2-input-block"
            value={confirmPw}
            onChange={(e) => setConfirmPw(e.target.value)}
            placeholder="Confirm new password"
            autoComplete="new-password"
          />
        </div>
        <div style={{ marginTop: 10 }}>
          <button
            className="v2-btn v2-btn-primary v2-btn-sm"
            onClick={handleChangePassword}
            disabled={!currentPw || !newPw || !confirmPw || busy !== null}
          >
            {busy === "password" ? "Saving…" : "Update password"}
          </button>
        </div>
      </div>

      {/* Read-only account info */}
      <div className="ob-grid">
        <LabeledInput
          label="Role"
          value={role.charAt(0).toUpperCase() + role.slice(1)}
          readOnly
        />
        <LabeledInput
          label="Member since"
          value={joined ? joined.toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          }) : "—"}
          readOnly
        />
      </div>

      <div
        style={{
          marginTop: 20,
          padding: 20,
          background: "var(--v2-ink-50)",
          borderRadius: "var(--v2-r-md)",
          border: "1px solid var(--v2-ink-200)",
          display: "flex",
          alignItems: "center",
          gap: 16,
          justifyContent: "space-between",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>End this session</div>
          <div style={{ fontSize: 13, color: "var(--v2-ink-500)", marginTop: 2 }}>
            Sign out on this device. You can sign back in anytime.
          </div>
        </div>
        <button
          className="v2-btn v2-btn-ghost v2-btn-sm"
          onClick={handleSignOut}
          disabled={busy !== null}
        >
          <Icon name="arrowRight" size={14} />{" "}
          {busy === "signout" ? "Signing out…" : "Sign out"}
        </button>
      </div>

      <div
        style={{
          marginTop: 12,
          padding: 20,
          background: "var(--v2-coral-soft, #FBEBE4)",
          borderRadius: "var(--v2-r-md)",
          border: "1px solid rgba(166,58,32,0.15)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 16,
            justifyContent: "space-between",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#A63A20" }}>
              Delete your account
            </div>
            <div
              style={{
                fontSize: 13,
                color: "var(--v2-ink-700)",
                marginTop: 4,
                maxWidth: 520,
              }}
            >
              Removes your profile, resume, work history, certifications, and
              sessions. This cannot be undone.
            </div>
          </div>
          {!confirming && (
            <button
              type="button"
              className="v2-btn v2-btn-ghost v2-btn-sm"
              style={{
                color: "#A63A20",
                borderColor: "rgba(166,58,32,0.3)",
              }}
              onClick={() => setConfirming(true)}
              disabled={busy !== null}
            >
              <Icon name="x" size={14} /> Delete account
            </button>
          )}
        </div>

        {confirming && (
          <div style={{ marginTop: 16 }}>
            <div
              style={{
                fontSize: 13,
                color: "var(--v2-ink-700)",
                marginBottom: 8,
              }}
            >
              Type <strong>DELETE</strong> to confirm.
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input
                className="v2-input-block"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
                style={{ maxWidth: 220 }}
                autoFocus
              />
              <button
                type="button"
                className="v2-btn v2-btn-sm"
                style={{
                  background: "#A63A20",
                  color: "white",
                  borderColor: "#A63A20",
                }}
                onClick={handleDelete}
                disabled={confirmText !== "DELETE" || busy !== null}
              >
                {busy === "delete"
                  ? "Deleting…"
                  : "Permanently delete my account"}
              </button>
              <button
                type="button"
                className="v2-btn v2-btn-ghost v2-btn-sm"
                onClick={() => {
                  setConfirming(false);
                  setConfirmText("");
                }}
                disabled={busy !== null}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {error && (
          <div
            style={{
              marginTop: 12,
              padding: "10px 14px",
              background: "white",
              color: "#A63A20",
              borderRadius: "var(--v2-r-md)",
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}
      </div>
    </section>
  );
}

function BasicsForm({
  initialHeadline,
  initialLocation,
  initialPhone,
  initialSummary,
  firstName,
  lastName,
  email,
  saving,
  onSave,
}: {
  initialHeadline: string;
  initialLocation: string;
  initialPhone: string;
  initialSummary: string;
  firstName: string;
  lastName: string;
  email: string;
  saving: boolean;
  onSave: (values: {
    headline: string;
    location: string;
    phone: string;
    summary: string;
  }) => void;
}) {
  const [headline, setHeadline] = useState(initialHeadline);
  const [location, setLocation] = useState(initialLocation);
  const [phone, setPhone] = useState(initialPhone);
  const [summary, setSummary] = useState(initialSummary);
  const [preBetterSummary, setPreBetterSummary] = useState<string | null>(null);
  const [polishError, setPolishError] = useState<string | null>(null);
  const polish = api.profile.polishSummary.useMutation({
    onSuccess: (data) => {
      // Snapshot the FIRST pre-polish state so multi-tap polishing can still
      // undo back to the user's hand-typed draft, not just the previous AI
      // output.
      setPreBetterSummary((prev) => prev ?? summary);
      setSummary(data.polished);
      setPolishError(null);
    },
    onError: (err) => {
      setPolishError(err.message);
      // Do NOT touch preBetterSummary — preserves Undo if a previous polish
      // succeeded and a subsequent retry errored.
    },
  });
  const dirty =
    headline !== initialHeadline ||
    location !== initialLocation ||
    phone !== initialPhone ||
    summary !== initialSummary;

  return (
    <section className="pp-section">
      <div className="pp-section-head">
        <div>
          <div className="pp-section-title">Basics</div>
          <div className="pp-section-sub">Shown on every match card</div>
        </div>
        <button
          className="v2-btn v2-btn-primary v2-btn-sm"
          disabled={!dirty || saving}
          onClick={() => onSave({ headline, location, phone, summary })}
        >
          {saving ? "Saving…" : "Save basics"}
        </button>
      </div>
      <div className="ob-grid">
        <LabeledInput label="First name" value={firstName} readOnly />
        <LabeledInput label="Last name" value={lastName} readOnly />
        <LabeledInput
          label="Headline"
          value={headline}
          onChange={setHeadline}
          placeholder="e.g. Controls Engineer · Oil & Gas / Renewables"
          full
        />
        <SuggestionCombobox
          label="Location"
          value={location}
          onChange={setLocation}
          suggestions={LOCATION_SUGGESTIONS}
          pickPlaceholder="Pick a Canadian city or site"
          customPlaceholder="Enter a custom location"
          otherLabel="Other — enter a custom location"
        />
        <LabeledInput
          label="Phone"
          value={phone}
          onChange={setPhone}
          placeholder="+1 403 555 0142"
        />
        <LabeledInput label="Work email" value={email} readOnly full />
        <div className="ob-field" style={{ gridColumn: "1 / -1" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              flexWrap: "wrap",
              marginBottom: 6,
            }}
          >
            <label style={{ margin: 0 }}>
              Professional summary · 1–3 sentences
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {preBetterSummary !== null && (
                <button
                  type="button"
                  className="v2-btn v2-btn-ghost v2-btn-sm"
                  onClick={() => {
                    setSummary(preBetterSummary);
                    setPreBetterSummary(null);
                  }}
                  title="Restore the version before AI polish"
                >
                  <Icon name="x" size={12} /> Undo polish
                </button>
              )}
              <button
                type="button"
                className="v2-btn v2-btn-outline v2-btn-sm"
                disabled={polish.isPending || summary.trim().length === 0}
                onClick={() => {
                  setPolishError(null);
                  polish.mutate({ current: summary });
                }}
                title="Rewrite this paragraph with AI to highlight measurable impact (Gold)"
              >
                <Icon name="sparkles" size={12} />
                {polish.isPending ? "Polishing…" : "Polish with AI"}
              </button>
            </div>
          </div>
          <textarea
            className="v2-input-block"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={3}
            placeholder="A few lines on the work you do best and the sectors you&#39;ve shipped in."
          />
          {polishError && (
            <div
              style={{
                marginTop: 8,
                fontSize: 12,
                color: "#A63A20",
                lineHeight: 1.5,
              }}
            >
              {polishError}{" "}
              {polishError.toLowerCase().includes("gold") && (
                <a
                  href="#pp-billing"
                  style={{
                    color: "var(--v2-accent-deep)",
                    textDecoration: "underline",
                  }}
                >
                  See plans
                </a>
              )}
            </div>
          )}
          {preBetterSummary !== null && !polishError && (
            <div
              style={{
                marginTop: 8,
                fontSize: 12,
                color: "var(--v2-ink-500)",
                lineHeight: 1.5,
              }}
            >
              <Icon name="sparkles" size={11} /> AI polish applied. Save basics
              to keep it, or undo above.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  placeholder,
  readOnly,
  full,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  full?: boolean;
}) {
  return (
    <div className="ob-field" style={full ? { gridColumn: "1 / -1" } : undefined}>
      <label>{label}</label>
      <input
        className="v2-input-block"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        style={readOnly ? { background: "var(--v2-ink-50)" } : undefined}
      />
    </div>
  );
}

type PrefsDraft = {
  openToWork: boolean;
  fifoRotational: boolean;
  willingToRelocate: boolean;
  remotePreference: RemoteEnum | null;
  minCompCad: number | null;
  availability: AvailabilityEnum | null;
  sectors: SectorEnum[];
};

function PreferencesCard({
  initial,
  saving,
  onSave,
}: {
  initial: PrefsDraft;
  saving: boolean;
  onSave: (prefs: PrefsDraft) => void;
}) {
  const [prefs, setPrefs] = useState<PrefsDraft>(initial);
  const [mode, setMode] = useState<"overview" | "edit">("overview");
  const dirty = !samePrefs(prefs, initial);

  const toggleSector = (s: SectorEnum) =>
    setPrefs({
      ...prefs,
      sectors: prefs.sectors.includes(s)
        ? prefs.sectors.filter((x) => x !== s)
        : [...prefs.sectors, s],
    });

  if (mode === "overview") {
    return (
      <PreferencesOverview
        prefs={initial}
        onEdit={() => {
          setPrefs(initial);
          setMode("edit");
        }}
      />
    );
  }

  return (
    <section className="pp-section">
      <div className="pp-section-head">
        <div>
          <div className="pp-section-title">Preferences</div>
          <div className="pp-section-sub">Private · shapes your matches</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="v2-btn v2-btn-ghost v2-btn-sm"
            onClick={() => {
              setPrefs(initial);
              setMode("overview");
            }}
          >
            Cancel
          </button>
          <button
            className="v2-btn v2-btn-primary v2-btn-sm"
            disabled={!dirty || saving}
            onClick={() => {
              onSave(prefs);
              setMode("overview");
            }}
          >
            {saving ? "Saving…" : "Save preferences"}
          </button>
        </div>
      </div>

      <div className="ob-pref-group" style={{ paddingTop: 0, borderTop: 0 }}>
        <div className="ob-pref-title">Availability</div>
        <PrefToggle
          label="Open to new opportunities"
          desc="Employers can see your profile in search and send intros."
          on={prefs.openToWork}
          onToggle={() => setPrefs({ ...prefs, openToWork: !prefs.openToWork })}
        />
        <PrefToggle
          label="Open to FIFO / rotational"
          desc="Includes Fort Mac, offshore, remote camps."
          on={prefs.fifoRotational}
          onToggle={() =>
            setPrefs({ ...prefs, fifoRotational: !prefs.fifoRotational })
          }
        />
        <PrefToggle
          label="Open to relocation"
          desc="Inside Canada. Relocation package expected."
          on={prefs.willingToRelocate}
          onToggle={() =>
            setPrefs({ ...prefs, willingToRelocate: !prefs.willingToRelocate })
          }
        />
      </div>

      <div className="ob-pref-group">
        <div className="ob-pref-title">Work setup</div>
        <div className="v2-filter-chips">
          {REMOTE_OPTIONS.map((r) => (
            <button
              key={r.value}
              className={`v2-filter-chip ${prefs.remotePreference === r.value ? "active" : ""}`}
              onClick={() =>
                setPrefs({
                  ...prefs,
                  remotePreference:
                    prefs.remotePreference === r.value ? null : r.value,
                })
              }
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="ob-pref-group">
        <div className="ob-pref-title">Compensation floor</div>
        <div className="ob-pref-hint">
          Minimum base you&apos;d consider. Used to filter matches — never
          shown to employers.
        </div>
        <div className="ob-slider-wrap">
          <div className="ob-slider-head">
            <div className="ob-slider-val">
              C$<em>{prefs.minCompCad ?? 145}</em>K
            </div>
            <div className="ob-slider-unit">base · annual</div>
          </div>
          <input
            className="ob-slider"
            type="range"
            min={60}
            max={280}
            step={5}
            value={prefs.minCompCad ?? 145}
            onChange={(e) =>
              setPrefs({ ...prefs, minCompCad: parseInt(e.target.value, 10) })
            }
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 10,
              fontFamily: "var(--v2-font-mono)",
              fontSize: 11,
              color: "var(--v2-ink-400)",
            }}
          >
            <span>C$60K</span>
            <span>C$280K</span>
          </div>
        </div>
      </div>

      <div className="ob-pref-group">
        <div className="ob-pref-title">Target sectors</div>
        <div className="v2-filter-chips">
          {SECTOR_ORDER.map((s) => (
            <button
              key={s.value}
              className={`v2-filter-chip ${prefs.sectors.includes(s.value) ? "active" : ""}`}
              onClick={() => toggleSector(s.value)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="ob-pref-group">
        <div className="ob-pref-title">How soon can you start?</div>
        <div className="v2-filter-chips">
          {AVAILABILITY_OPTIONS.map((a) => (
            <button
              key={a.value}
              className={`v2-filter-chip ${prefs.availability === a.value ? "active" : ""}`}
              onClick={() =>
                setPrefs({
                  ...prefs,
                  availability:
                    prefs.availability === a.value ? null : a.value,
                })
              }
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

const REMOTE_LABELS: Record<RemoteEnum, string> = {
  on_site: "Onsite",
  hybrid: "Hybrid",
  remote: "Remote",
  flexible: "Flexible",
};

const AVAILABILITY_LABELS: Record<AvailabilityEnum, string> = {
  immediately: "Immediately",
  notice_2w: "2 weeks notice",
  notice_4w: "4 weeks notice",
  notice_3m: "3+ months",
  browsing: "Just browsing",
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

function PreferencesOverview({
  prefs,
  onEdit,
}: {
  prefs: PrefsDraft;
  onEdit: () => void;
}) {
  const tiles: { icon: IconName; label: string; value: string }[] = [
    {
      icon: "zap",
      label: "Status",
      value: prefs.openToWork ? "Open to new roles" : "Not looking",
    },
    {
      icon: "building",
      label: "Work setup",
      value: prefs.remotePreference
        ? REMOTE_LABELS[prefs.remotePreference]
        : "Flexible",
    },
    {
      icon: "dollar",
      label: "Comp floor",
      value: prefs.minCompCad ? `C$${prefs.minCompCad}K base` : "Not set",
    },
    {
      icon: "clock",
      label: "Availability",
      value: prefs.availability
        ? AVAILABILITY_LABELS[prefs.availability]
        : "Not set",
    },
    {
      icon: "globe",
      label: "FIFO / rotational",
      value: prefs.fifoRotational ? "Yes — open" : "No",
    },
    {
      icon: "mapPin",
      label: "Relocation",
      value: prefs.willingToRelocate ? "Open (with package)" : "Home base only",
    },
  ];

  return (
    <section className="pp-section">
      <div className="pp-section-head">
        <div>
          <div className="pp-section-title">Preferences</div>
          <div className="pp-section-sub">Private · shapes your matches</div>
        </div>
        <button
          className="v2-btn v2-btn-ghost v2-btn-sm"
          onClick={onEdit}
        >
          Edit preferences
        </button>
      </div>
      <div className="pp-prefs">
        {tiles.map((t) => (
          <div key={t.label} className="pp-pref">
            <div className="pp-pref-ico">
              <Icon name={t.icon} size={16} />
            </div>
            <div>
              <div className="pp-pref-label">{t.label}</div>
              <div className="pp-pref-value">{t.value}</div>
            </div>
          </div>
        ))}
      </div>
      {prefs.sectors.length > 0 && (
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
            Target sectors
          </div>
          <div className="v2-filter-chips">
            {prefs.sectors.map((s) => (
              <span key={s} className="v2-filter-chip active">
                {SECTOR_LABELS[s]}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function PrefToggle({
  label,
  desc,
  on,
  onToggle,
}: {
  label: string;
  desc: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="ob-toggle-row">
      <div>
        <div className="ob-toggle-label">{label}</div>
        <div className="ob-toggle-desc">{desc}</div>
      </div>
      <div
        className={`ob-toggle ${on ? "on" : ""}`}
        role="switch"
        aria-checked={on}
        onClick={onToggle}
      />
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <>
      <section className="pp-section">
        <div className="pp-section-head">
          <Skeleton className="h-7 w-32" />
        </div>
        <div className="ob-grid">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      </section>
      <section className="pp-section">
        <Skeleton className="h-7 w-24 mb-4" />
        <Skeleton className="h-20 rounded-[14px]" />
      </section>
      <section className="pp-section">
        <Skeleton className="h-7 w-40 mb-4" />
        <Skeleton className="h-24 rounded-[22px] mb-3" />
        <Skeleton className="h-24 rounded-[22px]" />
      </section>
    </>
  );
}

function samePrefs(a: PrefsDraft, b: PrefsDraft): boolean {
  return (
    a.openToWork === b.openToWork &&
    a.fifoRotational === b.fifoRotational &&
    a.willingToRelocate === b.willingToRelocate &&
    a.remotePreference === b.remotePreference &&
    a.minCompCad === b.minCompCad &&
    a.availability === b.availability &&
    a.sectors.length === b.sectors.length &&
    a.sectors.every((s, i) => s === b.sectors[i])
  );
}

function ResumeSection({
  resumeUrl,
  resumeFilename,
  resumeUploadedAt,
  onUpload,
}: {
  resumeUrl: string | null;
  resumeFilename: string | null;
  resumeUploadedAt: Date | null;
  onUpload: (file: File) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFile = async (file: File) => {
    setError(null);
    setBusy(true);
    try {
      await onUpload(file);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="pp-section">
      <div className="pp-section-head">
        <div>
          <div className="pp-section-title">Resume</div>
          <div className="pp-section-sub">Latest version · stored privately</div>
        </div>
        {resumeUrl && (
          <button
            className="v2-btn v2-btn-ghost v2-btn-sm"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
          >
            <Icon name="upload" size={14} />{" "}
            {busy ? "Uploading…" : "Replace file"}
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.doc,.docx"
          style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
        />
      </div>

      {resumeUrl ? (
        <div className="pp-resume">
          <div className="pp-resume-ico">
            <Icon name="fileText" size={24} />
          </div>
          <div>
            <div className="pp-resume-name">{resumeFilename ?? "Resume"}</div>
            <div className="pp-resume-meta">
              {resumeUploadedAt && (
                <>
                  <span>Uploaded {formatDate(resumeUploadedAt)}</span>
                  <span className="sep">·</span>
                </>
              )}
              <span style={{ color: "var(--v2-accent-deep)" }}>✓ Saved</span>
            </div>
          </div>
          <div className="pp-resume-actions">
            <a
              className="v2-btn v2-btn-ghost v2-btn-sm"
              href={resumeUrl}
              target="_blank"
              rel="noreferrer"
            >
              <Icon name="eye" size={14} /> View
            </a>
            <a
              className="v2-btn v2-btn-ghost v2-btn-sm"
              href={resumeUrl}
              download
            >
              <Icon name="download" size={14} /> Download
            </a>
          </div>
        </div>
      ) : (
        <div
          className="ob-drop"
          onClick={() => inputRef.current?.click()}
          style={{ marginTop: 0 }}
        >
          <div className="ob-drop-ico">
            <Icon name="upload" size={24} />
          </div>
          <h3>Upload your resume</h3>
          <div className="ob-drop-hint">PDF or DOCX up to 10MB</div>
        </div>
      )}

      {error && (
        <div
          style={{
            marginTop: 14,
            padding: "10px 14px",
            background: "var(--v2-coral-soft)",
            color: "#A63A20",
            borderRadius: "var(--v2-r-md)",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}
    </section>
  );
}

/* ---------- helpers ---------- */

function splitName(full: string): [string, string] {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 0 || parts[0] === "") return ["", ""];
  const first = parts.shift() ?? "";
  return [first, parts.join(" ")];
}

function initials(full: string) {
  return full
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function formatMonth(d: Date) {
  return d.toLocaleString("en-US", { month: "short", year: "numeric" });
}

function formatDate(d: Date) {
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function iconForCert(type: string): IconName {
  switch (type) {
    case "p_eng":
      return "shield";
    case "h2s_alive":
      return "zap";
    case "csts":
    case "fall_protection":
      return "check";
    default:
      return "settings";
  }
}

function expiryState(expiresAt: Date | null): "warn" | "fresh" | "none" {
  if (!expiresAt) return "none";
  const soon = 90 * 24 * 60 * 60 * 1000;
  if (expiresAt.getTime() - Date.now() < soon) return "warn";
  return "fresh";
}

const profileChecksFormatter = new Intl.ListFormat("en", {
  style: "long",
  type: "conjunction",
});

function computeProfileChecks(
  profile:
    | {
        headline: string | null;
        location: string | null;
        summary: string | null;
        resumeUrl: string | null;
      }
    | undefined,
  data:
    | {
        workHistory: unknown[];
        education: unknown[];
        certifications: unknown[];
      }
    | undefined,
): { label: string; done: boolean }[] {
  if (!profile || !data) return [];
  return [
    { label: "a headline", done: Boolean(profile.headline?.trim()) },
    { label: "your location", done: Boolean(profile.location?.trim()) },
    { label: "an about section", done: Boolean(profile.summary?.trim()) },
    { label: "a resume", done: Boolean(profile.resumeUrl) },
    { label: "a work history role", done: data.workHistory.length > 0 },
    { label: "your education", done: data.education.length > 0 },
    { label: "certifications", done: data.certifications.length > 0 },
  ];
}
