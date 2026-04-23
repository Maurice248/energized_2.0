"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Icon, type IconName } from "@/components/shared/icon";
import {
  AddRoleDialog,
  type RoleDialogInitial,
} from "@/components/shared/add-role-dialog";
import {
  AddCertDialog,
  type CertDialogInitial,
  type CertDialogPrefill,
} from "@/components/shared/add-cert-dialog";
import { api } from "@/lib/trpc/client";

type SectorEnum =
  | "oil_gas"
  | "renewables"
  | "nuclear"
  | "utilities"
  | "hydrogen"
  | "power";

type RemoteEnum = "on_site" | "hybrid" | "remote" | "flexible";

type AvailabilityEnum =
  | "immediately"
  | "notice_2w"
  | "notice_4w"
  | "notice_3m"
  | "browsing";

const SECTOR_LABEL_TO_ENUM: Record<string, SectorEnum> = {
  "Oil & Gas": "oil_gas",
  "Renewable Energy": "renewables",
  Midstream: "oil_gas",
  "Power Utilities": "power",
  Nuclear: "nuclear",
  Mining: "utilities",
  Geothermal: "utilities",
  Hydrogen: "hydrogen",
};

const REMOTE_TO_ENUM: Record<string, RemoteEnum> = {
  Onsite: "on_site",
  Hybrid: "hybrid",
  Remote: "remote",
  Flexible: "flexible",
};

const AVAILABILITY_TO_ENUM: Record<string, AvailabilityEnum> = {
  Immediately: "immediately",
  "2 weeks notice": "notice_2w",
  "4 weeks notice": "notice_4w",
  "3+ months": "notice_3m",
  "Just browsing": "browsing",
};

type StepId = "welcome" | "resume" | "review" | "certs" | "prefs";
type Step = { id: StepId; title: string; hint: string };

const STEPS: Step[] = [
  { id: "welcome", title: "Welcome", hint: "What to expect" },
  { id: "resume", title: "Upload resume", hint: "Ember reads it" },
  { id: "review", title: "Review work & skills", hint: "Confirm the facts" },
  { id: "certs", title: "Certifications", hint: "Tickets & expiries" },
  { id: "prefs", title: "Preferences", hint: "Shape your matches" },
];

const STORAGE_KEY = "energized:ob-step";

const SUGGESTED_SKILLS = [
  "Field Engineering",
  "Battery Storage",
  "IEC 61131-3",
  "OSHA 30",
];

const POPULAR_CERTS = [
  "OSSA Regional Orientation",
  "Fall Protection",
  "Confined Space",
  "WHMIS 2015",
  "Ground Disturbance L2",
  "First Aid / CPR-C",
  "TDG Certified",
  "Boom Truck Op",
];

const WORK_SETUPS = ["Onsite", "Hybrid", "Remote", "Flexible"] as const;
const SECTOR_OPTIONS = [
  "Oil & Gas",
  "Renewable Energy",
  "Midstream",
  "Power Utilities",
  "Nuclear",
  "Mining",
  "Geothermal",
  "Hydrogen",
];
const AVAILABILITY = [
  "Immediately",
  "2 weeks notice",
  "4 weeks notice",
  "3+ months",
  "Just browsing",
];

type Prefs = {
  openToWork: boolean;
  fifo: boolean;
  relocation: boolean;
  remote: (typeof WORK_SETUPS)[number];
  minComp: number;
  sectors: string[];
  availability: string;
};

const DEFAULT_PREFS: Prefs = {
  openToWork: true,
  fifo: true,
  relocation: false,
  remote: "Hybrid",
  minComp: 145,
  sectors: ["Renewable Energy", "Oil & Gas"],
  availability: "4 weeks notice",
};

export function OnboardingClient({
  email,
  firstName,
}: {
  email: string;
  firstName: string;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState(0);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [skills, setSkills] = useState<string[]>([]);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const n = raw ? parseInt(raw, 10) : 0;
    if (!Number.isNaN(n) && n >= 0 && n < STEPS.length) {
      // Reading localStorage post-mount is the React.dev pattern for avoiding
      // hydration mismatch when the persisted step differs from the SSR default.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrent(n);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, String(current));
  }, [current]);

  const profileQuery = api.profile.get.useQuery();
  const update = api.profile.update.useMutation();
  const markComplete = api.onboarding.markComplete.useMutation();
  const [finishError, setFinishError] = useState<string | null>(null);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleDialogInitial | null>(null);
  const [certDialogOpen, setCertDialogOpen] = useState(false);
  const [editingCert, setEditingCert] = useState<CertDialogInitial | null>(null);
  const [certPrefill, setCertPrefill] = useState<CertDialogPrefill | null>(null);

  const finishing = update.isPending || markComplete.isPending;

  const finish = async () => {
    setFinishError(null);
    const profile = profileQuery.data?.profile;
    if (!profile) {
      setFinishError("Profile not found. Reload and try again.");
      return;
    }
    try {
      await update.mutateAsync({
        headline: profile.headline,
        yearsExperience: profile.yearsExperience,
        sectors: dedupe(
          prefs.sectors
            .map((l) => SECTOR_LABEL_TO_ENUM[l])
            .filter((v): v is SectorEnum => Boolean(v)),
        ),
        willingToRelocate: prefs.relocation,
        remotePreference: REMOTE_TO_ENUM[prefs.remote] ?? null,
        location: profile.location,
        skills,
        openToWork: prefs.openToWork,
        fifoRotational: prefs.fifo,
        minCompCad: prefs.minComp,
        availability: AVAILABILITY_TO_ENUM[prefs.availability] ?? null,
      });
      await markComplete.mutateAsync();
      setDone(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setFinishError(err instanceof Error ? err.message : "Could not save");
    }
  };

  const go = (nextIdx: number) => {
    setSaving(true);
    window.setTimeout(() => setSaving(false), 700);
    if (nextIdx < 0) return;
    if (nextIdx >= STEPS.length) {
      void finish();
      return;
    }
    setCurrent(nextIdx);
    setDone(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const completion = Math.round(
    ((done ? STEPS.length : current) / STEPS.length) * 100,
  );

  const stepId = STEPS[current]?.id ?? "welcome";

  return (
    <div className="ob-shell v2">
      <header className="ob-top">
        <div style={{ display: "flex", gap: 28, alignItems: "center" }}>
          <Brand />
          <div className="pp-crumbs">
            <span>App</span>
            <span className="sep">/</span>
            <span className="current">Onboarding</span>
          </div>
        </div>
        <div className="ob-top-right">
          <span>{email}</span>
          <SaveState saving={saving} />
          {!done && (
            <button
              className="v2-btn v2-btn-link"
              onClick={() => router.push("/profile")}
            >
              Skip for now →
            </button>
          )}
        </div>
      </header>

      <div className="ob-body">
        <StepRail
          current={done ? STEPS.length : current}
          completion={done ? 100 : completion}
          onGo={(i) => {
            if (done) setDone(false);
            go(i);
          }}
        />

        <main className="ob-main">
          {done ? (
            <Finish
              onEnter={() => {
                window.localStorage.removeItem(STORAGE_KEY);
                router.push("/profile");
              }}
              counts={{
                roles: profileQuery.data?.workHistory.length ?? 0,
                skills: skills.length,
                certs: profileQuery.data?.certifications.length ?? 0,
              }}
            />
          ) : (
            <>
              {stepId === "welcome" && <Welcome firstName={firstName} />}
              {stepId === "resume" && (
                <ResumeStep
                  existing={profileQuery.data?.profile.resumeFilename ?? null}
                  onUploaded={() => profileQuery.refetch()}
                />
              )}
              {stepId === "review" && (
                <ReviewStep
                  work={profileQuery.data?.workHistory ?? []}
                  skills={skills}
                  setSkills={setSkills}
                  reload={() => profileQuery.refetch()}
                  onAddRole={() => {
                    setEditingRole(null);
                    setRoleDialogOpen(true);
                  }}
                  onEditRole={(row) => {
                    setEditingRole(row);
                    setRoleDialogOpen(true);
                  }}
                />
              )}
              {stepId === "certs" && (
                <CertsStep
                  certs={profileQuery.data?.certifications ?? []}
                  reload={() => profileQuery.refetch()}
                  onAddCert={() => {
                    setEditingCert(null);
                    setCertPrefill(null);
                    setCertDialogOpen(true);
                  }}
                  onEditCert={(row) => {
                    setEditingCert(row);
                    setCertPrefill(null);
                    setCertDialogOpen(true);
                  }}
                  onPrefillCert={(prefill) => {
                    setEditingCert(null);
                    setCertPrefill(prefill);
                    setCertDialogOpen(true);
                  }}
                />
              )}
              {stepId === "prefs" && (
                <PreferencesStep prefs={prefs} setPrefs={setPrefs} />
              )}

              <div className="ob-actions">
                <button
                  className="v2-btn v2-btn-link"
                  onClick={() => go(current - 1)}
                  disabled={current === 0}
                >
                  ← Previous
                </button>
                <div className="ob-actions-right">
                  {current > 0 && (
                    <button
                      className="v2-btn v2-btn-ghost"
                      onClick={() => go(current + 1)}
                    >
                      Skip step
                    </button>
                  )}
                  <button
                    className="v2-btn v2-btn-primary v2-btn-lg"
                    onClick={() => go(current + 1)}
                    disabled={finishing}
                  >
                    {current === STEPS.length - 1
                      ? finishing
                        ? "Publishing…"
                        : "Finish & publish"
                      : "Continue"}
                    <Icon name="arrowRight" size={16} />
                  </button>
                </div>
              </div>

              {finishError && (
                <div
                  style={{
                    marginTop: 16,
                    padding: "12px 16px",
                    background: "var(--v2-coral-soft)",
                    color: "#A63A20",
                    borderRadius: "var(--v2-r-md)",
                    fontSize: 13,
                  }}
                >
                  {finishError}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      <AddRoleDialog
        key={`role-${editingRole?.id ?? "new"}`}
        open={roleDialogOpen}
        onOpenChange={(v) => {
          setRoleDialogOpen(v);
          if (!v) setEditingRole(null);
        }}
        onCreated={() => profileQuery.refetch()}
        initial={editingRole ?? undefined}
      />
      <AddCertDialog
        key={`cert-${editingCert?.id ?? certPrefill?.name ?? "new"}`}
        open={certDialogOpen}
        onOpenChange={(v) => {
          setCertDialogOpen(v);
          if (!v) {
            setEditingCert(null);
            setCertPrefill(null);
          }
        }}
        onCreated={() => profileQuery.refetch()}
        initial={editingCert ?? undefined}
        prefill={certPrefill ?? undefined}
      />
    </div>
  );
}

function dedupe<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

/* ---------- shared bits ---------- */

function Brand() {
  return (
    <Image
      src="/energized-logo.svg"
      alt="Energized"
      width={144}
      height={80}
      priority
      style={{ height: 40, width: "auto" }}
    />
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <div className="v2-eyebrow">{children}</div>;
}

function SaveState({ saving }: { saving: boolean }) {
  return (
    <div className="ob-save-state">
      <span className="dot" />
      <span>{saving ? "Saving…" : "Draft saved"}</span>
    </div>
  );
}

function StepRail({
  current,
  completion,
  onGo,
}: {
  current: number;
  completion: number;
  onGo: (i: number) => void;
}) {
  return (
    <aside className="ob-rail">
      <div className="ob-rail-title">
        Build your <em>profile</em>
      </div>
      <div className="ob-rail-sub">
        Five short steps. You can edit anything later.
      </div>

      <div className="ob-steps">
        {STEPS.map((s, i) => {
          const state = i < current ? "done" : i === current ? "active" : "";
          return (
            <button
              key={s.id}
              className={`ob-step-row ${state}`}
              onClick={() => onGo(i)}
            >
              <div className="ob-step-pip">
                {i < current ? (
                  <Icon name="check" size={14} />
                ) : (
                  (i + 1).toString().padStart(2, "0")
                )}
              </div>
              <div>
                <div className="ob-step-label">{s.title}</div>
                <div className="ob-step-hint">{s.hint}</div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="ob-rail-completion">
        <div className="ob-completion-label">
          <span>Completeness</span>
          <span className="ob-completion-pct">{completion}%</span>
        </div>
        <div className="ob-completion-bar">
          <div
            className="ob-completion-bar-fill"
            style={{ width: `${completion}%` }}
          />
        </div>
      </div>
    </aside>
  );
}

/* ---------- step: welcome ---------- */

function Welcome({ firstName }: { firstName: string }) {
  return (
    <>
      <div className="ob-eyebrow-row">
        <Eyebrow>Welcome, {firstName}</Eyebrow>
        <span className="ob-pagenum">01 / 05</span>
      </div>
      <h1 className="ob-hdg">
        Let&apos;s turn your resume into a profile the <em>industry</em> can
        find.
      </h1>
      <p className="ob-sub">
        Ember — our matching AI — needs a little bit more than &quot;ten years
        controls.&quot; She&apos;ll read your resume, confirm a few things, and
        hand you back real matches in under five minutes.
      </p>

      <div className="ob-welcome-grid">
        <WelcomeCard
          n="01"
          title="Upload your resume"
          body="PDF or DOCX. Ember reads it and extracts your roles, skills, and tickets."
        />
        <WelcomeCard
          n="02"
          title="Confirm the facts"
          body="Review what she found. Fix anything she misread, add nuance, and flag the work you're proudest of."
          featured
        />
        <WelcomeCard
          n="03"
          title="Set your preferences"
          body="Tell us what a good role means — FIFO tolerance, comp band, sector focus, how soon you're moving."
        />
      </div>

      <div className="ob-welcome-time">
        <div>
          <div
            style={{
              fontFamily: "var(--v2-font-mono)",
              fontSize: 11,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--v2-ink-500)",
            }}
          >
            Time needed
          </div>
          <div className="ob-welcome-time-val">
            About <em>4 minutes</em>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            gap: 14,
            alignItems: "center",
            fontSize: 13,
            color: "var(--v2-ink-500)",
          }}
        >
          <Icon name="shield" size={16} /> Your data is visible only to verified
          employers.
        </div>
      </div>
    </>
  );
}

function WelcomeCard({
  n,
  title,
  body,
  featured,
}: {
  n: string;
  title: string;
  body: string;
  featured?: boolean;
}) {
  return (
    <div className={`ob-welcome-card ${featured ? "featured" : ""}`}>
      <div className="ob-welcome-num">{n}</div>
      <h4>{title}</h4>
      <p>{body}</p>
    </div>
  );
}

/* ---------- step: resume ---------- */

function ResumeStep({
  existing,
  onUploaded,
}: {
  existing: string | null;
  onUploaded: () => void;
}) {
  const setResume = api.profile.setResume.useMutation();
  const [drag, setDrag] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState<{
    filename: string;
    size: string;
  } | null>(existing ? { filename: existing, size: "—" } : null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFile = async (file: File) => {
    setError(null);
    if (file.size > 10 * 1024 * 1024) {
      setError("That file is over 10MB. Try a compressed PDF.");
      return;
    }
    const allowed = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowed.includes(file.type)) {
      setError("Only PDF or DOCX are supported.");
      return;
    }

    setUploading(true);
    setUploaded({ filename: file.name, size: prettyBytes(file.size) });

    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload/resume", {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "upload_failed" }));
        throw new Error(typeof body?.error === "string" ? body.error : "upload_failed");
      }
      const { url, filename } = (await res.json()) as {
        url: string;
        filename: string;
      };
      await setResume.mutateAsync({ url, filename });
      onUploaded();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
      setUploaded(null);
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <div className="ob-eyebrow-row">
        <Eyebrow>Resume</Eyebrow>
        <span className="ob-pagenum">02 / 05</span>
      </div>
      <h1 className="ob-hdg">
        Upload the <em>one document</em> that does most of the work.
      </h1>
      <p className="ob-sub">
        Drop your most recent resume. Ember will extract your work history,
        skills, and certifications — you&apos;ll confirm everything on the next
        step.
      </p>

      <div
        className={`ob-drop ${drag ? "drag" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const file = e.dataTransfer.files?.[0];
          if (file) void handleFile(file);
        }}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.doc,.docx"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
        <div className="ob-drop-ico">
          <Icon name="upload" size={28} />
        </div>
        <h3>Drop your resume here</h3>
        <div className="ob-drop-hint">
          or <kbd>click</kbd> to browse — PDF or DOCX up to 10MB
        </div>
        <div className="ob-drop-meta">
          <Icon name="shield" size={12} /> Encrypted at rest · never shared
          without your OK
        </div>
      </div>

      {error && (
        <div
          style={{
            marginTop: 14,
            padding: "12px 16px",
            background: "var(--v2-coral-soft)",
            color: "#A63A20",
            borderRadius: "var(--v2-r-md)",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {uploaded && (
        <>
          <div className="ob-file">
            <div className="ob-file-ico">
              <Icon name="fileText" size={22} />
            </div>
            <div>
              <div className="ob-file-name">{uploaded.filename}</div>
              <div className="ob-file-meta">
                <span>{uploaded.size}</span>
                <span>·</span>
                <span>
                  {uploading ? "Uploading…" : "Uploaded"}
                </span>
              </div>
              <div className="ob-file-progress">
                <div
                  className="ob-file-progress-fill"
                  style={{ width: uploading ? "64%" : "100%" }}
                />
              </div>
            </div>
            <button
              className="ob-icon-btn danger"
              onClick={(e) => {
                e.stopPropagation();
                setUploaded(null);
              }}
            >
              <Icon name="x" size={16} />
            </button>
          </div>

          {!uploading && (
            <div className="ob-parse">
              <div className="ob-parse-ico">
                <Icon name="sparkles" size={22} strokeWidth={2.5} />
              </div>
              <div>
                <div className="ob-parse-title">
                  Ember will read your resume next.{" "}
                  <em>We&apos;ll extract roles, skills, and certifications.</em>
                </div>
                <div className="ob-parse-sub">
                  Upload complete · review on next step
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}

function prettyBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/* ---------- step: review ---------- */

type WorkRow = {
  id: string;
  employerName: string;
  roleTitle: string;
  site: string | null;
  sector: string | null;
  commodity: string | null;
  rotation: string | null;
  summary: string | null;
  skills: string[];
  startedAt: Date;
  endedAt: Date | null;
};

function ReviewStep({
  work,
  skills,
  setSkills,
  reload,
  onAddRole,
  onEditRole,
}: {
  work: WorkRow[];
  skills: string[];
  setSkills: (next: string[]) => void;
  reload: () => void;
  onAddRole: () => void;
  onEditRole: (row: RoleDialogInitial) => void;
}) {
  const remove = api.profile.removeWorkHistory.useMutation({
    onSuccess: () => reload(),
  });
  const toggleSkill = (s: string) =>
    setSkills(skills.includes(s) ? skills.filter((x) => x !== s) : [...skills, s]);
  const [customSkillOpen, setCustomSkillOpen] = useState(false);
  const [customSkill, setCustomSkill] = useState("");
  const addCustomSkill = () => {
    const s = customSkill.trim();
    if (!s || skills.includes(s) || skills.length >= 30) return;
    setSkills([...skills, s]);
    setCustomSkill("");
    setCustomSkillOpen(false);
  };

  return (
    <>
      <div className="ob-eyebrow-row">
        <Eyebrow>Review &amp; confirm</Eyebrow>
        <span className="ob-pagenum">03 / 05</span>
      </div>
      <h1 className="ob-hdg">
        Does this look <em>right</em>?
      </h1>
      <p className="ob-sub">
        Everything below was extracted from your resume. Edit anything out of
        place, or remove it. The closer to truth, the better your matches.
      </p>

      <div className="ob-review-banner">
        <div className="ob-review-banner-ico">
          <Icon name="sparkles" size={18} />
        </div>
        <div className="ob-review-banner-text">
          <strong>
            We found {work.length} role{work.length === 1 ? "" : "s"} on your
            profile.
          </strong>{" "}
          You can add more manually below.
        </div>
      </div>

      <div className="ob-section">
        <div className="ob-section-head">
          <div className="ob-section-title">
            Work history <em>· {work.length}</em>
          </div>
          <button className="ob-add-btn" onClick={onAddRole}>
            <Icon name="plus" size={14} /> Add a role
          </button>
        </div>
        {work.length === 0 && (
          <p style={{ color: "var(--v2-ink-500)", fontSize: 14 }}>
            Nothing yet — upload a resume on the previous step or add roles
            manually.
          </p>
        )}
        {work.map((w) => (
          <WorkCard
            key={w.id}
            item={w}
            onEdit={() =>
              onEditRole({
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
              })
            }
            onRemove={() => remove.mutate({ id: w.id })}
          />
        ))}
      </div>

      <div className="ob-section">
        <div className="ob-section-head">
          <div className="ob-section-title">
            Core skills <em>· {skills.length} selected</em>
          </div>
          <button
            type="button"
            className="ob-add-btn"
            onClick={() => setCustomSkillOpen((v) => !v)}
            disabled={skills.length >= 30}
          >
            <Icon name="plus" size={14} /> Add custom
          </button>
        </div>
        {customSkillOpen && (
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input
              className="v2-input-block"
              autoFocus
              value={customSkill}
              onChange={(e) => setCustomSkill(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustomSkill();
                } else if (e.key === "Escape") {
                  setCustomSkillOpen(false);
                  setCustomSkill("");
                }
              }}
              placeholder="e.g. HAZOP facilitation, PI System, SAP PM"
              style={{ maxWidth: 360 }}
            />
            <button
              type="button"
              className="v2-btn v2-btn-primary v2-btn-sm"
              onClick={addCustomSkill}
              disabled={!customSkill.trim() || skills.includes(customSkill.trim())}
            >
              Add
            </button>
            <button
              type="button"
              className="v2-btn v2-btn-ghost v2-btn-sm"
              onClick={() => {
                setCustomSkillOpen(false);
                setCustomSkill("");
              }}
            >
              Cancel
            </button>
          </div>
        )}
        <div className="v2-filter-chips">
          {skills.map((s) => (
            <button
              key={s}
              className="v2-filter-chip active"
              onClick={() => toggleSkill(s)}
            >
              {s} <span style={{ marginLeft: 6, opacity: 0.6 }}>×</span>
            </button>
          ))}
          {SUGGESTED_SKILLS.filter((s) => !skills.includes(s)).map((s) => (
            <button
              key={s}
              className="v2-filter-chip"
              onClick={() => toggleSkill(s)}
            >
              + {s}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

function WorkCard({
  item,
  onEdit,
  onRemove,
}: {
  item: WorkRow;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const initial = item.employerName.charAt(0).toUpperCase();
  return (
    <div className="ob-card">
      <div className="ob-card-head">
        <div
          className="ob-card-logo"
          style={{ background: "var(--v2-ink-700)" }}
        >
          {initial}
        </div>
        <div>
          <div className="ob-card-role">{item.roleTitle}</div>
          <div className="ob-card-company">
            <strong
              style={{ color: "var(--v2-ink-900)", fontWeight: 600 }}
            >
              {item.employerName}
            </strong>
            {item.site && (
              <>
                <span className="sep">·</span>
                <span>{item.site}</span>
              </>
            )}
            <span className="sep">·</span>
            <span>
              {formatMonth(item.startedAt)} —{" "}
              {item.endedAt ? formatMonth(item.endedAt) : "Present"}
            </span>
            {!item.endedAt && (
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
      {item.summary && <div className="ob-card-body">{item.summary}</div>}
      <div className="ob-card-actions">
        <button className="ob-icon-btn" onClick={onEdit} title="Edit">
          <Icon name="settings" size={14} />
        </button>
        <button className="ob-icon-btn danger" onClick={onRemove} title="Remove">
          <Icon name="x" size={14} />
        </button>
      </div>
    </div>
  );
}

function formatMonth(d: Date) {
  return d.toLocaleString("en-US", { month: "short", year: "numeric" });
}

/* ---------- step: certs ---------- */

type CertRow = {
  id: string;
  type: string;
  name: string;
  issuer: string | null;
  credentialId: string | null;
  issuedAt: Date | null;
  expiresAt: Date | null;
  documentUrl: string | null;
};

function CertsStep({
  certs,
  reload,
  onAddCert,
  onEditCert,
  onPrefillCert,
}: {
  certs: CertRow[];
  reload: () => void;
  onAddCert: () => void;
  onEditCert: (row: CertDialogInitial) => void;
  onPrefillCert: (prefill: CertDialogPrefill) => void;
}) {
  const remove = api.profile.removeCertification.useMutation({
    onSuccess: () => reload(),
  });

  return (
    <>
      <div className="ob-eyebrow-row">
        <Eyebrow>Certifications &amp; tickets</Eyebrow>
        <span className="ob-pagenum">04 / 05</span>
      </div>
      <h1 className="ob-hdg">
        Your <em>tickets</em> open doors.
      </h1>
      <p className="ob-sub">
        Energy employers filter hard on safety and trade tickets. Add expiry
        dates so we can remind you — and your matches — before they lapse.
      </p>

      <div className="ob-section" style={{ marginTop: 32 }}>
        <div className="ob-section-head">
          <div className="ob-section-title">
            On file <em>· {certs.length}</em>
          </div>
          <button className="ob-add-btn" onClick={onAddCert}>
            <Icon name="plus" size={14} /> Add certification
          </button>
        </div>
        {certs.length === 0 && (
          <p style={{ color: "var(--v2-ink-500)", fontSize: 14 }}>
            No certifications on file yet.
          </p>
        )}
        {certs.map((c) => {
          const state: "warn" | "fresh" | "none" = expiryState(c.expiresAt);
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
                <button
                  className="ob-icon-btn"
                  onClick={() =>
                    onEditCert({
                      id: c.id,
                      type: c.type as CertDialogInitial["type"],
                      name: c.name,
                      issuer: c.issuer,
                      credentialId: c.credentialId,
                      issuedAt: c.issuedAt,
                      expiresAt: c.expiresAt,
                      documentUrl: c.documentUrl,
                    })
                  }
                  title="Edit"
                >
                  <Icon name="settings" size={14} />
                </button>
                <button
                  className="ob-icon-btn danger"
                  onClick={() => remove.mutate({ id: c.id })}
                  title="Remove"
                >
                  <Icon name="x" size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="ob-section">
        <div className="ob-section-head">
          <div className="ob-section-title">
            Popular in your sector <em>· tap to add</em>
          </div>
        </div>
        <div className="v2-filter-chips">
          {POPULAR_CERTS.map((c) => (
            <button
              key={c}
              className="v2-filter-chip"
              onClick={() =>
                onPrefillCert({ name: c, type: certTypeForLabel(c) })
              }
            >
              + {c}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

function certTypeForLabel(label: string): CertDialogInitial["type"] {
  const l = label.toLowerCase();
  if (l.includes("fall protection")) return "fall_protection";
  if (l.includes("first aid") || l.includes("cpr")) return "first_aid";
  if (l.includes("h2s")) return "h2s_alive";
  if (l.includes("csts")) return "csts";
  if (l.includes("red seal")) return "red_seal";
  if (l.includes("p.eng") || l.includes("peng") || l.includes("p eng"))
    return "p_eng";
  if (l.includes("nace")) return "nace";
  return "other";
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
  const now = Date.now();
  const soon = 90 * 24 * 60 * 60 * 1000;
  if (expiresAt.getTime() - now < soon) return "warn";
  return "fresh";
}

/* ---------- step: preferences (UI-only for now) ---------- */

function PreferencesStep({
  prefs,
  setPrefs,
}: {
  prefs: Prefs;
  setPrefs: (next: Prefs) => void;
}) {
  const toggle = (k: "openToWork" | "fifo" | "relocation") =>
    setPrefs({ ...prefs, [k]: !prefs[k] });
  const setComp = (v: number) => setPrefs({ ...prefs, minComp: v });

  return (
    <>
      <div className="ob-eyebrow-row">
        <Eyebrow>Preferences</Eyebrow>
        <span className="ob-pagenum">05 / 05</span>
      </div>
      <h1 className="ob-hdg">
        What does a <em>good role</em> look like?
      </h1>
      <p className="ob-sub">
        This stays private — employers only see that you matched, not what you
        asked for.
      </p>

      <div className="ob-section">
        <div className="ob-pref-group">
          <div className="ob-pref-title">Availability</div>
          <div className="ob-pref-hint">
            Set your work status. You can change this in one click anywhere in
            the app.
          </div>
          <ToggleRow
            label="Open to new opportunities"
            desc="Employers can see your profile in search and send intros."
            on={prefs.openToWork}
            onToggle={() => toggle("openToWork")}
          />
          <ToggleRow
            label="Open to FIFO / rotational"
            desc="Includes Fort Mac, offshore, remote camps."
            on={prefs.fifo}
            onToggle={() => toggle("fifo")}
          />
          <ToggleRow
            label="Open to relocation"
            desc="Inside Canada. Relocation package expected."
            on={prefs.relocation}
            onToggle={() => toggle("relocation")}
          />
        </div>

        <div className="ob-pref-group">
          <div className="ob-pref-title">Work setup</div>
          <div className="ob-pref-hint">Pick the setup that fits your life.</div>
          <div className="v2-filter-chips">
            {WORK_SETUPS.map((s) => (
              <button
                key={s}
                className={`v2-filter-chip ${prefs.remote === s ? "active" : ""}`}
                onClick={() => setPrefs({ ...prefs, remote: s })}
              >
                {s}
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
                C$<em>{prefs.minComp}</em>K
              </div>
              <div className="ob-slider-unit">base · annual</div>
            </div>
            <input
              className="ob-slider"
              type="range"
              min={60}
              max={280}
              step={5}
              value={prefs.minComp}
              onChange={(e) => setComp(parseInt(e.target.value, 10))}
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
          <div className="ob-pref-title">Sectors you&apos;re focused on</div>
          <div className="ob-pref-hint">
            Pick one or many. Matches are ranked across all selected sectors.
          </div>
          <div className="v2-filter-chips">
            {SECTOR_OPTIONS.map((s) => {
              const active = prefs.sectors.includes(s);
              return (
                <button
                  key={s}
                  className={`v2-filter-chip ${active ? "active" : ""}`}
                  onClick={() =>
                    setPrefs({
                      ...prefs,
                      sectors: active
                        ? prefs.sectors.filter((x) => x !== s)
                        : [...prefs.sectors, s],
                    })
                  }
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>

        <div className="ob-pref-group">
          <div className="ob-pref-title">How soon can you start?</div>
          <div className="v2-filter-chips">
            {AVAILABILITY.map((s) => (
              <button
                key={s}
                className={`v2-filter-chip ${prefs.availability === s ? "active" : ""}`}
                onClick={() => setPrefs({ ...prefs, availability: s })}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function ToggleRow({
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

/* ---------- finish ---------- */

function Finish({
  onEnter,
  counts,
}: {
  onEnter: () => void;
  counts: { roles: number; skills: number; certs: number };
}) {
  return (
    <div className="ob-finish">
      <div className="ob-finish-medal">
        <Icon name="check" size={48} />
      </div>
      <h1>
        You&apos;re <em>energized</em>.
      </h1>
      <p>
        Your profile is live. Ember is already looking — you should see your
        first matches in a few minutes.
      </p>

      <div className="ob-finish-stats">
        <FinishStat v={counts.roles} label="Roles added" />
        <FinishStat v={counts.skills} label="Skills confirmed" />
        <FinishStat v={counts.certs} label="Certifications" />
      </div>

      <div
        style={{
          marginTop: 40,
          display: "flex",
          justifyContent: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <button className="v2-btn v2-btn-primary v2-btn-lg" onClick={onEnter}>
          Go to my matches <Icon name="arrowRight" size={16} />
        </button>
        <button className="v2-btn v2-btn-ghost v2-btn-lg" onClick={onEnter}>
          Review my profile
        </button>
      </div>
    </div>
  );
}

function FinishStat({ v, label }: { v: number; label: string }) {
  return (
    <div className="ob-finish-stat">
      <div className="ob-finish-stat-v">
        <em>{v}</em>
      </div>
      <div className="ob-finish-stat-l">{label}</div>
    </div>
  );
}

