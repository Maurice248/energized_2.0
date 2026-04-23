"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/shared/icon";
import { api } from "@/lib/trpc/client";

type StepId = "welcome" | "company" | "verify" | "team" | "prefs";
type Step = { id: StepId; title: string; hint: string };

const STEPS: Step[] = [
  { id: "welcome", title: "Welcome", hint: "What to expect" },
  { id: "company", title: "Company details", hint: "The basics" },
  { id: "verify", title: "Verify your domain", hint: "Required to post" },
  { id: "team", title: "Invite your team", hint: "Hiring managers" },
  { id: "prefs", title: "Hiring preferences", hint: "Shape your matches" },
];

const COMPANY_SIZE_OPTIONS: { value: CompanySize; label: string }[] = [
  { value: "1_10", label: "1–10" },
  { value: "11_50", label: "11–50" },
  { value: "51_120", label: "51–120" },
  { value: "120_250", label: "120–250" },
  { value: "250_500", label: "250–500" },
  { value: "500_1000", label: "500–1000" },
  { value: "1000_plus", label: "1000+" },
];

const SECTOR_OPTIONS: { value: SectorEnum; label: string }[] = [
  { value: "oil_gas", label: "Oil & Gas" },
  { value: "renewables", label: "Renewable Energy" },
  { value: "nuclear", label: "Nuclear" },
  { value: "utilities", label: "Power Utilities" },
  { value: "hydrogen", label: "Hydrogen" },
  { value: "power", label: "Power" },
  { value: "other", label: "Other" },
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

const WORK_SETUP_OPTIONS: { value: WorkSetup; label: string }[] = [
  { value: "onsite", label: "Onsite" },
  { value: "hybrid_preferred", label: "Hybrid preferred" },
  { value: "remote_ok", label: "Remote OK" },
  { value: "flexible", label: "Flexible" },
];

const HIRING_PACE_OPTIONS: { value: HiringPace; label: string }[] = [
  { value: "passive", label: "Passive / pipeline" },
  { value: "when_right", label: "Hiring when right" },
  { value: "actively_hiring", label: "Actively hiring" },
  { value: "scaling_fast", label: "Scaling fast" },
];

const ORG_ROLE_OPTIONS: { value: OrgRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "recruiter", label: "Recruiter" },
  { value: "hiring_manager", label: "Hiring manager" },
  { value: "viewer", label: "Viewer" },
];

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

const STORAGE_KEY = "energized:ep-ob-step";

export function EmployerOnboardingClient({
  email,
  firstName,
}: {
  email: string;
  firstName: string;
}) {
  const router = useRouter();

  const orgQuery = api.employer.getMyOrg.useQuery();
  const ensureOrg = api.employer.ensureOrg.useMutation({
    onSuccess: () => void orgQuery.refetch(),
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
  const markVerified = api.employer.markVerified.useMutation({
    onSuccess: () => void orgQuery.refetch(),
  });

  const [current, setCurrent] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    const n = saved ? parseInt(saved, 10) : NaN;
    return !Number.isNaN(n) && n >= 0 && n < STEPS.length ? n : 0;
  });
  const [done, setDone] = useState(false);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, String(current));
  }, [current]);

  const org = orgQuery.data?.org;
  const members = orgQuery.data?.members ?? [];
  const saving =
    ensureOrg.isPending ||
    updateBasics.isPending ||
    updatePrefs.isPending ||
    invite.isPending ||
    removeMember.isPending ||
    markVerified.isPending;

  const go = async (next: number) => {
    if (next < 0) return;
    if (next >= STEPS.length) {
      setDone(true);
      return;
    }
    setCurrent(next);
  };

  const stepId = STEPS[current]?.id ?? "welcome";
  const completion = Math.min(
    100,
    Math.round(((done ? STEPS.length : current) / (STEPS.length - 1)) * 100),
  );

  return (
    <div className="ob-shell v2">
      <header className="ob-top">
        <div style={{ display: "flex", gap: 28, alignItems: "center" }}>
          <Brand />
          <div className="pp-crumbs">
            <span>App</span>
            <span className="sep">/</span>
            <span>Employer</span>
            <span className="sep">/</span>
            <span className="current">Onboarding</span>
          </div>
        </div>
        <div className="ob-top-right">
          <span>{email}</span>
          <div className="ob-save-state">
            <span className="dot" />
            <span>{saving ? "Saving…" : "Draft saved"}</span>
          </div>
          {!done && (
            <button
              className="v2-btn v2-btn-link"
              onClick={() => router.push("/")}
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
              verified={Boolean(org?.verified)}
              teamCount={members.length}
              onEnter={() => {
                window.localStorage.removeItem(STORAGE_KEY);
                router.push("/employer/profile");
              }}
            />
          ) : (
            <>
              {stepId === "welcome" && (
                <WelcomeStep firstName={firstName} companyName={org?.name ?? ""} />
              )}
              {stepId === "company" && (
                <CompanyStep
                  initial={org ?? null}
                  onSave={async (input) => {
                    if (!org) {
                      await ensureOrg.mutateAsync({ name: input.name });
                    }
                    await updateBasics.mutateAsync(input);
                  }}
                  saving={saving}
                />
              )}
              {stepId === "verify" && (
                <VerifyStep
                  org={org ?? null}
                  onMarkVerified={() => markVerified.mutate()}
                />
              )}
              {stepId === "team" && (
                <TeamStep
                  members={members}
                  domain={org?.domain ?? ""}
                  onInvite={(v) => invite.mutate(v)}
                  onRemove={(id) => removeMember.mutate({ id })}
                />
              )}
              {stepId === "prefs" && (
                <PrefsStep
                  initial={org ?? null}
                  onSave={(input) => updatePrefs.mutate(input)}
                  saving={saving}
                />
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
                  {current > 0 && current < STEPS.length - 1 && (
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
                  >
                    {current === STEPS.length - 1
                      ? "Finish & go live"
                      : "Continue"}
                    <Icon name="arrowRight" size={16} />
                  </button>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

/* ---------- shell pieces ---------- */

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
        Set up <em>your company</em>
      </div>
      <div className="ob-rail-sub">
        Five short steps. Editable later in your profile.
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

function WelcomeStep({
  firstName,
  companyName,
}: {
  firstName: string;
  companyName: string;
}) {
  return (
    <>
      <div className="ob-eyebrow-row">
        <div className="v2-eyebrow">Welcome, {firstName}</div>
        <span className="ob-pagenum">01 / 05</span>
      </div>
      <h1 className="ob-hdg">
        Set up {companyName ? <em>{companyName}</em> : <em>your company</em>} on
        Energized.
      </h1>
      <p className="ob-sub">
        Five short steps — company, verification, team, and your first match
        preferences. Post your first role in under 10 minutes.
      </p>

      <div className="ob-welcome-grid">
        <div className="ob-welcome-card">
          <div className="ob-welcome-num">01</div>
          <h4>Tell us about the company</h4>
          <p>
            Industry, size, HQ, sub-sectors. We use this to route talent to
            you.
          </p>
        </div>
        <div className="ob-welcome-card featured">
          <div className="ob-welcome-num">02</div>
          <h4>Verify the domain</h4>
          <p>
            DNS record or a confirmation email from a @company address. Unlocks
            posting &amp; outreach.
          </p>
        </div>
        <div className="ob-welcome-card">
          <div className="ob-welcome-num">03</div>
          <h4>Invite hiring managers</h4>
          <p>
            Bring in engineering leads, ops directors, recruiters — each with
            their own permission level.
          </p>
        </div>
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
            About <em>8 minutes</em>
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
          <Icon name="shield" size={16} /> SOC 2 · encrypted at rest · role-based
          access
        </div>
      </div>
    </>
  );
}

/* ---------- step: company ---------- */

type OrgRow = {
  name: string;
  domain: string | null;
  website: string | null;
  hq: string | null;
  founded: string | null;
  tagline: string | null;
  about: string | null;
  logoColor: string;
  size: CompanySize | null;
  primarySector: SectorEnum | null;
  subSectors: string[];
};

type CompanyInput = {
  name: string;
  domain: string | null;
  website: string | null;
  hq: string | null;
  founded: string | null;
  tagline: string | null;
  about: string | null;
  logoColor: string;
  size: CompanySize | null;
  primarySector: SectorEnum | null;
  subSectors: string[];
};

function CompanyStep({
  initial,
  onSave,
  saving,
}: {
  initial: OrgRow | null;
  onSave: (input: CompanyInput) => Promise<void>;
  saving: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [domain, setDomain] = useState(initial?.domain ?? "");
  const [website, setWebsite] = useState(initial?.website ?? "");
  const [hq, setHq] = useState(initial?.hq ?? "");
  const [founded, setFounded] = useState(initial?.founded ?? "");
  const [tagline, setTagline] = useState(initial?.tagline ?? "");
  const [about, setAbout] = useState(initial?.about ?? "");
  const [size, setSize] = useState<CompanySize | null>(initial?.size ?? null);
  const [sector, setSector] = useState<SectorEnum | null>(
    initial?.primarySector ?? null,
  );
  const [subSectors, setSubSectors] = useState<string[]>(
    initial?.subSectors ?? [],
  );

  const dirty =
    name !== (initial?.name ?? "") ||
    domain !== (initial?.domain ?? "") ||
    website !== (initial?.website ?? "") ||
    hq !== (initial?.hq ?? "") ||
    founded !== (initial?.founded ?? "") ||
    tagline !== (initial?.tagline ?? "") ||
    about !== (initial?.about ?? "") ||
    size !== (initial?.size ?? null) ||
    sector !== (initial?.primarySector ?? null) ||
    JSON.stringify(subSectors) !== JSON.stringify(initial?.subSectors ?? []);

  const toggleSub = (s: string) =>
    setSubSectors((curr) =>
      curr.includes(s)
        ? curr.filter((x) => x !== s)
        : curr.length < 4
          ? [...curr, s]
          : curr,
    );

  const save = () =>
    onSave({
      name: name.trim(),
      domain: domain.trim() || null,
      website: website.trim() || null,
      hq: hq.trim() || null,
      founded: founded.trim() || null,
      tagline: tagline.trim() || null,
      about: about.trim() || null,
      logoColor: "#FF7A59",
      size,
      primarySector: sector,
      subSectors,
    });

  return (
    <>
      <div className="ob-eyebrow-row">
        <div className="v2-eyebrow">Company details</div>
        <span className="ob-pagenum">02 / 05</span>
      </div>
      <h1 className="ob-hdg">
        Who are you <em>hiring for</em>?
      </h1>
      <p className="ob-sub">
        The basics that appear on your public company page and next to every
        role you post.
      </p>

      <div className="ob-section">
        <div className="ob-grid">
          <Field label="Company name" required>
            <input
              className="v2-input-block"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Helios Renewables"
            />
          </Field>
          <Field label="Website">
            <input
              className="v2-input-block"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://heliosrenew.ca"
            />
          </Field>
          <Field label="Domain (for verification)">
            <input
              className="v2-input-block"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="heliosrenew.ca"
            />
          </Field>
          <Field label="Headquarters">
            <input
              className="v2-input-block"
              value={hq}
              onChange={(e) => setHq(e.target.value)}
              placeholder="Calgary, AB"
            />
          </Field>
          <Field label="Founded">
            <input
              className="v2-input-block"
              value={founded}
              onChange={(e) => setFounded(e.target.value)}
              placeholder="2018"
            />
          </Field>
          <div style={{ gridColumn: "1/-1" }}>
            <Field label="One-line tagline">
              <input
                className="v2-input-block"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="Western Canada's busiest utility-scale solar developer."
              />
            </Field>
          </div>
          <div style={{ gridColumn: "1/-1" }}>
            <Field label="About the company">
              <textarea
                className="v2-input-block"
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                rows={4}
                placeholder="One paragraph on what you build and who you are."
              />
            </Field>
          </div>
        </div>
      </div>

      <div className="ob-section">
        <div className="ob-section-head">
          <div className="ob-section-title">Company size</div>
        </div>
        <div className="v2-filter-chips">
          {COMPANY_SIZE_OPTIONS.map((s) => (
            <button
              key={s.value}
              className={`v2-filter-chip ${size === s.value ? "active" : ""}`}
              onClick={() => setSize(s.value)}
              type="button"
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="ob-section">
        <div className="ob-section-head">
          <div className="ob-section-title">Primary sector</div>
        </div>
        <div className="v2-filter-chips">
          {SECTOR_OPTIONS.map((s) => (
            <button
              key={s.value}
              className={`v2-filter-chip ${sector === s.value ? "active" : ""}`}
              onClick={() => setSector(s.value)}
              type="button"
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="ob-section">
        <div className="ob-section-head">
          <div className="ob-section-title">
            Sub-sectors <em>· pick up to 4</em>
          </div>
        </div>
        <div className="v2-filter-chips">
          {SUB_SECTOR_OPTIONS.map((s) => {
            const active = subSectors.includes(s);
            return (
              <button
                key={s}
                className={`v2-filter-chip ${active ? "active" : ""}`}
                onClick={() => toggleSub(s)}
                type="button"
              >
                {s}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <button
          className="v2-btn v2-btn-primary v2-btn-sm"
          onClick={save}
          disabled={!dirty || !name.trim() || saving}
        >
          {saving ? "Saving…" : "Save company details"}
        </button>
      </div>
    </>
  );
}

/* ---------- step: verify ---------- */

function VerifyStep({
  org,
  onMarkVerified,
}: {
  org: (OrgRow & { verified: boolean; verificationToken: string | null }) | null;
  onMarkVerified: () => void;
}) {
  const domain = org?.domain ?? "your-company.ca";
  const token = org?.verificationToken ?? "energized-verify=pending";

  if (!org) {
    return (
      <>
        <div className="ob-eyebrow-row">
          <div className="v2-eyebrow">Verify your domain</div>
          <span className="ob-pagenum">03 / 05</span>
        </div>
        <h1 className="ob-hdg">
          Finish step 2 <em>first</em>.
        </h1>
        <p className="ob-sub">
          Company details need to be saved before we can issue a verification
          token.
        </p>
      </>
    );
  }

  return (
    <>
      <div className="ob-eyebrow-row">
        <div className="v2-eyebrow">Verify your domain</div>
        <span className="ob-pagenum">03 / 05</span>
      </div>
      <h1 className="ob-hdg">
        Prove you work at <em>{org.name}</em>.
      </h1>
      <p className="ob-sub">
        We require this to protect candidates — only verified employers can
        post roles or message people directly.
      </p>

      <div className={`ep-verify-status ${org.verified ? "good" : ""}`}>
        <div className="ep-verify-icon">
          <Icon name={org.verified ? "check" : "shield"} size={24} />
        </div>
        <div>
          <div className="ep-verify-title">
            {org.verified ? "Verified" : "Waiting on verification"}
          </div>
          <div className="ep-verify-desc">
            {org.verified
              ? "Your domain is linked. You can post roles and message candidates."
              : "Pick a method below. Most domains verify in under 15 minutes."}
          </div>
        </div>
        <span
          className={`v2-chip ${org.verified ? "v2-chip-accent" : "v2-chip-coral"}`}
        >
          {org.verified ? "Active" : "Pending"}
        </span>
      </div>

      {!org.verified && (
        <>
          <div className="ep-method-grid">
            <div className="ep-method recommended">
              <div className="ep-method-badge">Recommended</div>
              <div className="ep-method-ico">
                <Icon name="globe" size={20} />
              </div>
              <div className="ep-method-title">DNS TXT record</div>
              <div className="ep-method-desc">
                Add a single TXT record to <strong>{domain}</strong>. We check
                every 60 seconds and flip you live automatically.
              </div>
              <ul className="ep-method-steps">
                <li>Log in to your DNS provider</li>
                <li>Add the record below</li>
                <li>Click &ldquo;Check now&rdquo;</li>
              </ul>
              <div className="ep-dns">
                <div className="ep-dns-row">
                  <span className="ep-dns-label">Type</span>
                  <span className="ep-dns-val">TXT</span>
                  <span />
                </div>
                <div className="ep-dns-row">
                  <span className="ep-dns-label">Host</span>
                  <span className="ep-dns-val">_energized.{domain}</span>
                  <button
                    type="button"
                    className="ep-dns-copy"
                    onClick={() =>
                      navigator.clipboard.writeText(`_energized.${domain}`)
                    }
                  >
                    Copy
                  </button>
                </div>
                <div className="ep-dns-row">
                  <span className="ep-dns-label">Value</span>
                  <span className="ep-dns-val">{token}</span>
                  <button
                    type="button"
                    className="ep-dns-copy"
                    onClick={() => navigator.clipboard.writeText(token)}
                  >
                    Copy
                  </button>
                </div>
              </div>
              <button
                type="button"
                className="v2-btn v2-btn-primary v2-btn-sm"
                style={{ marginTop: 18 }}
                onClick={onMarkVerified}
              >
                Mark as verified <Icon name="arrowRight" size={14} />
              </button>
            </div>

            <div className="ep-method">
              <div className="ep-method-ico">
                <Icon name="mail" size={20} />
              </div>
              <div className="ep-method-title">Email confirmation</div>
              <div className="ep-method-desc">
                We send a verification link to an address at{" "}
                <strong>@{domain}</strong>. Good when you don&rsquo;t control
                DNS.
              </div>
              <div className="ob-field" style={{ marginTop: 16 }}>
                <label>Send to</label>
                <input
                  className="v2-input-block"
                  defaultValue={`hr@${domain}`}
                />
              </div>
              <button
                type="button"
                className="v2-btn v2-btn-ghost v2-btn-sm"
                style={{ marginTop: 14 }}
                disabled
                title="Email verification coming soon"
              >
                Send verification email
              </button>
            </div>
          </div>

          <div
            style={{
              marginTop: 24,
              padding: 18,
              background: "white",
              border: "1px solid var(--v2-ink-200)",
              borderRadius: 14,
              display: "flex",
              gap: 14,
              alignItems: "center",
            }}
          >
            <Icon name="users" size={20} />
            <div style={{ fontSize: 14, color: "var(--v2-ink-700)" }}>
              <strong>Enterprise?</strong> SSO &amp; manual verification
              available.
            </div>
          </div>
        </>
      )}
    </>
  );
}

/* ---------- step: team ---------- */

type MemberRow = {
  id: string;
  email: string;
  role: OrgRole;
  status: "active" | "pending" | "revoked";
  userId: string | null;
};

function TeamStep({
  members,
  domain,
  onInvite,
  onRemove,
}: {
  members: MemberRow[];
  domain: string;
  onInvite: (v: { email: string; role: OrgRole }) => void;
  onRemove: (id: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<OrgRole>("recruiter");

  const submit = () => {
    if (!email.trim()) return;
    onInvite({ email: email.trim().toLowerCase(), role });
    setEmail("");
  };

  return (
    <>
      <div className="ob-eyebrow-row">
        <div className="v2-eyebrow">Invite your team</div>
        <span className="ob-pagenum">04 / 05</span>
      </div>
      <h1 className="ob-hdg">
        Who else <em>hires</em> here?
      </h1>
      <p className="ob-sub">
        Give hiring managers their own logins. Recruiters see pipelines;
        hiring managers see only their own jobs.
      </p>

      <div className="ob-section">
        <div className="ob-section-head">
          <div className="ob-section-title">Invite by email</div>
        </div>
        <div className="ep-invite-row">
          <input
            className="v2-input-block"
            placeholder={domain ? `name@${domain}` : "name@company.ca"}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              }
            }}
          />
          <select
            className="v2-input-block"
            value={role}
            onChange={(e) => setRole(e.target.value as OrgRole)}
          >
            {ORG_ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="v2-btn v2-btn-primary"
            style={{ width: 40, height: 52, padding: 0, borderRadius: 12 }}
            onClick={submit}
            disabled={!email.trim()}
          >
            <Icon name="plus" size={16} />
          </button>
        </div>
        <div
          style={{
            fontSize: 12,
            color: "var(--v2-ink-500)",
            fontFamily: "var(--v2-font-mono)",
            marginTop: 8,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          Invites are stored now · emails go out in Phase 2
        </div>
      </div>

      <div className="ob-section">
        <div className="ob-section-head">
          <div className="ob-section-title">
            Team <em>· {members.length} members</em>
          </div>
        </div>
        {members.map((m) => (
          <div
            key={m.id}
            className={`ep-teammate ${m.status === "pending" ? "pending" : ""}`}
          >
            <div className="ep-teammate-avatar" style={{ background: "#2A303F" }}>
              {m.email.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="ep-teammate-name">{m.email.split("@")[0]}</div>
              <div className="ep-teammate-title">{m.email}</div>
            </div>
            <span
              className={`ep-teammate-role ${m.role === "owner" ? "owner" : ""}`}
            >
              {labelForRole(m.role)}
            </span>
            {m.status === "pending" ? (
              <span className="v2-chip v2-chip-coral">Invited</span>
            ) : (
              <span className="v2-chip v2-chip-accent">Active</span>
            )}
            <button
              type="button"
              className="ob-icon-btn danger"
              onClick={() => m.role !== "owner" && onRemove(m.id)}
              disabled={m.role === "owner"}
              title={m.role === "owner" ? "Owner can't be removed" : "Remove"}
            >
              <Icon name="x" size={14} />
            </button>
          </div>
        ))}
      </div>
    </>
  );
}

function labelForRole(r: OrgRole): string {
  return ORG_ROLE_OPTIONS.find((o) => o.value === r)?.label ?? (r === "owner" ? "Owner" : r);
}

/* ---------- step: prefs ---------- */

type PrefsInput = {
  defaultWorkSetup: WorkSetup | null;
  hiringPace: HiringPace | null;
  focusRoles: string[];
  autoMatch: boolean;
  prioritizeDiverse: boolean;
};

type OrgPrefsRow = {
  defaultWorkSetup: WorkSetup | null;
  hiringPace: HiringPace | null;
  focusRoles: string[];
  autoMatch: boolean;
  prioritizeDiverse: boolean;
};

function PrefsStep({
  initial,
  onSave,
  saving,
}: {
  initial: OrgPrefsRow | null;
  onSave: (input: PrefsInput) => void;
  saving: boolean;
}) {
  const [setup, setSetup] = useState<WorkSetup | null>(
    initial?.defaultWorkSetup ?? null,
  );
  const [pace, setPace] = useState<HiringPace | null>(
    initial?.hiringPace ?? null,
  );
  const [focus, setFocus] = useState<string[]>(initial?.focusRoles ?? []);
  const [autoMatch, setAutoMatch] = useState(initial?.autoMatch ?? true);
  const [dei, setDei] = useState(initial?.prioritizeDiverse ?? false);

  const toggleFocus = (f: string) =>
    setFocus((curr) =>
      curr.includes(f) ? curr.filter((x) => x !== f) : [...curr, f],
    );

  const dirty =
    setup !== (initial?.defaultWorkSetup ?? null) ||
    pace !== (initial?.hiringPace ?? null) ||
    JSON.stringify(focus) !== JSON.stringify(initial?.focusRoles ?? []) ||
    autoMatch !== (initial?.autoMatch ?? true) ||
    dei !== (initial?.prioritizeDiverse ?? false);

  return (
    <>
      <div className="ob-eyebrow-row">
        <div className="v2-eyebrow">Hiring preferences</div>
        <span className="ob-pagenum">05 / 05</span>
      </div>
      <h1 className="ob-hdg">
        How does <em>Ember</em> work for you?
      </h1>
      <p className="ob-sub">
        Defaults for every role you&rsquo;ll post. You can override these
        per-job at posting time.
      </p>

      <div className="ob-section">
        <div className="ob-pref-group">
          <div className="ob-pref-title">Focus roles</div>
          <div className="ob-pref-hint">
            Role families you hire most often. Used to prioritize talent in your
            feed.
          </div>
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
              onClick={() => setAutoMatch(!autoMatch)}
              role="switch"
              aria-checked={autoMatch}
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
              onClick={() => setDei(!dei)}
              role="switch"
              aria-checked={dei}
            />
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <button
          className="v2-btn v2-btn-primary v2-btn-sm"
          onClick={() =>
            onSave({
              defaultWorkSetup: setup,
              hiringPace: pace,
              focusRoles: focus,
              autoMatch,
              prioritizeDiverse: dei,
            })
          }
          disabled={!dirty || saving}
        >
          {saving ? "Saving…" : "Save preferences"}
        </button>
      </div>
    </>
  );
}

/* ---------- finish ---------- */

function Finish({
  verified,
  teamCount,
  onEnter,
}: {
  verified: boolean;
  teamCount: number;
  onEnter: () => void;
}) {
  return (
    <div className="ob-finish">
      <div className="ob-finish-medal">
        <Icon name="check" size={48} />
      </div>
      <h1>
        You&rsquo;re <em>live</em>.
      </h1>
      <p>
        Your company is set up. Post your first role, or head to the dashboard
        to see Ember&rsquo;s talent suggestions.
      </p>

      <div className="ob-finish-stats">
        <div className="ob-finish-stat">
          <div className="ob-finish-stat-v">
            <em>{verified ? "✓" : "…"}</em>
          </div>
          <div className="ob-finish-stat-l">
            {verified ? "Verified" : "Verification pending"}
          </div>
        </div>
        <div className="ob-finish-stat">
          <div className="ob-finish-stat-v">
            <em>{teamCount}</em>
          </div>
          <div className="ob-finish-stat-l">Teammates</div>
        </div>
        <div className="ob-finish-stat">
          <div className="ob-finish-stat-v">
            <em>Soon</em>
          </div>
          <div className="ob-finish-stat-l">Talent matches</div>
        </div>
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
          Go to company profile <Icon name="arrowRight" size={16} />
        </button>
      </div>
    </div>
  );
}

/* ---------- small helpers ---------- */

function Field({
  label,
  children,
  required,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div className="ob-field">
      <label>
        {label}
        {required && <span style={{ color: "var(--v2-coral)" }}> *</span>}
      </label>
      {children}
    </div>
  );
}
