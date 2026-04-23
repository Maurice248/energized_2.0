"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Building2, User } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import {
  ONBOARDING_DRAFT_KEY,
  type OnboardingDraft,
  type StoredDraft,
} from "@/lib/onboarding";

type Role = "jobseeker" | "employer";
type Plan = "free" | "pro" | "placement";
type EmployerPlan = "starter" | "growth" | "scale";

const ROLE_OPTIONS: {
  id: Role;
  icon: typeof User;
  title: string;
  description: string;
}[] = [
  {
    id: "jobseeker",
    icon: User,
    title: "I'm looking for work",
    description: "Job seeker, career changer, or passive candidate.",
  },
  {
    id: "employer",
    icon: Building2,
    title: "I'm hiring",
    description: "Talent lead, HR, or hiring manager posting roles.",
  },
];

const SECTORS = [
  "Oil & Gas",
  "Renewable Energy",
  "Midstream",
  "Power Utilities",
  "Nuclear",
  "Mining",
];

const LEVELS = [
  "Apprentice / 0–2y",
  "Mid / 3–6y",
  "Senior / 7–12y",
  "Lead / 13+y",
];

const SKILL_OPTIONS = [
  "PLC/SCADA",
  "Project Mgmt",
  "Welding",
  "P.Eng",
  "Hydraulics",
  "Safety (CSTS)",
  "Python",
  "AutoCAD",
  "Drilling",
  "Rope access",
  "Electrical",
  "Instrumentation",
];

const PLAN_OPTIONS: {
  id: Plan;
  title: string;
  price: string;
  description: string;
  recommended?: boolean;
}[] = [
  {
    id: "free",
    title: "Starter",
    price: "Free",
    description: "AI matches · Profile · Save jobs",
  },
  {
    id: "pro",
    title: "Pro",
    price: "C$12 / mo",
    description:
      "Priority matches · Ember unlimited · Direct messages · Resume tailoring",
    recommended: true,
  },
  {
    id: "placement",
    title: "Placement concierge",
    price: "Free — paid by employer",
    description: "Dedicated talent partner for senior roles",
  },
];

const COMPANY_SIZES = ["1–10", "11–50", "51–200", "201–1000", "1000+"];

const EMPLOYER_PLAN_OPTIONS: {
  id: EmployerPlan;
  title: string;
  price: string;
  description: string;
  recommended?: boolean;
}[] = [
  {
    id: "starter",
    title: "Starter",
    price: "Free",
    description: "1 active posting · Basic candidate search",
  },
  {
    id: "growth",
    title: "Growth",
    price: "C$299 / mo",
    description: "5 active postings · Boost credits · Priority matching",
    recommended: true,
  },
  {
    id: "scale",
    title: "Scale",
    price: "C$899 / mo",
    description: "Unlimited postings · 3 recruiter seats · Priority support",
  },
];

export default function SignUpPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [role, setRole] = useState<Role | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(true);
  const [sector, setSector] = useState<string | null>(null);
  const [level, setLevel] = useState<string | null>(null);
  const [skills, setSkills] = useState<string[]>([]);
  const [plan, setPlan] = useState<Plan>("pro");
  const [company, setCompany] = useState("");
  const [companySize, setCompanySize] = useState<string | null>(null);
  const [hiringSectors, setHiringSectors] = useState<string[]>([]);
  const [location, setLocation] = useState("");
  const [employerPlan, setEmployerPlan] = useState<EmployerPlan>("growth");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleSkill(s: string) {
    setSkills((prev) => {
      if (prev.includes(s)) return prev.filter((x) => x !== s);
      if (prev.length >= 6) return prev;
      return [...prev, s];
    });
  }

  function toggleHiringSector(s: string) {
    setHiringSectors((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  }

  function canAdvance(): boolean {
    if (step === 0) return role !== null;
    if (step === 1)
      return (
        name.trim().length > 0 &&
        /\S+@\S+\.\S+/.test(email) &&
        password.length >= 12 &&
        agreed
      );
    if (step === 2) {
      if (role === "employer") {
        return company.trim().length > 0 && companySize !== null;
      }
      return true;
    }
    return true;
  }

  async function handleComplete() {
    if (!role) return;
    setError(null);
    setSubmitting(true);

    const postVerifyPath = role === "jobseeker" ? "/onboarding" : "/";
    const { error: signUpError } = await authClient.signUp.email({
      name,
      email,
      password,
      callbackURL: postVerifyPath,
    });

    if (signUpError) {
      setSubmitting(false);
      setError(signUpError.message ?? "Sign-up failed. Try again.");
      return;
    }

    // With requireEmailVerification the user has no session yet, so
    // protected mutations can't run. Stash role + profile draft in
    // localStorage (sessionStorage doesn't survive the email-link tab switch);
    // the OnboardingPersister drains it on the first authenticated page load.
    if (typeof window !== "undefined") {
      const draft: OnboardingDraft =
        role === "employer"
          ? {
              role,
              company,
              companySize,
              hiringSectors,
              location,
              plan: employerPlan,
            }
          : { role, sector, level, skills, plan };
      const stored: StoredDraft = {
        savedAt: Date.now(),
        forUserEmail: email,
        draft,
      };
      localStorage.setItem(ONBOARDING_DRAFT_KEY, JSON.stringify(stored));
    }

    setSubmitting(false);
    router.push(
      `/verify-email?email=${encodeURIComponent(email)}&next=${encodeURIComponent(postVerifyPath)}`,
    );
  }

  async function handleNext() {
    if (!canAdvance()) return;
    if (step < 3) {
      setStep(step + 1);
      return;
    }
    await handleComplete();
  }

  function handlePrev() {
    if (step > 0) {
      setStep(step - 1);
    } else {
      router.push("/");
    }
  }

  return (
    <div className="v2-auth">
      <aside className="v2-auth-side">
        <Link
          href="/"
          style={{ cursor: "pointer", display: "inline-block" }}
        >
          <Image
            src="/energized-logo-white.svg"
            alt="Energized"
            width={180}
            height={100}
            priority
            style={{ height: "auto", width: "180px" }}
          />
        </Link>
        <div style={{ flex: 1 }} />
        <div>
          {role === "employer" ? (
            <>
              <div className="v2-eyebrow v2-eyebrow-light">
                Hiring on Energized
              </div>
              <h2 style={{ marginTop: 20 }}>
                Meet the <em>specialists</em> the sector needs.
              </h2>
              <p>
                Four quick steps to post your first role and reach a curated
                pool of Canadian energy talent.
              </p>
            </>
          ) : (
            <>
              <div className="v2-eyebrow v2-eyebrow-light">
                Welcome to Energized
              </div>
              <h2 style={{ marginTop: 20 }}>
                Build a profile the <em>industry</em> wants to find.
              </h2>
              <p>
                Tell us about your work in four short steps. Ember will surface
                roles matched to your actual expertise — not just your
                keywords.
              </p>
            </>
          )}
        </div>
        <div className="v2-auth-testimonial">
          <p>
            &ldquo;The only job platform that knew what a &lsquo;Class-4
            estimator&rsquo; actually meant.&rdquo;
          </p>
          <div className="v2-auth-testimonial-author">
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "var(--v2-coral)",
                color: "white",
                display: "grid",
                placeItems: "center",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              RS
            </div>
            <div>
              <div style={{ color: "white", fontWeight: 600 }}>Raj Sandhu</div>
              <div>Estimator · Calgary</div>
            </div>
          </div>
        </div>
      </aside>

      <main className="v2-auth-main">
        <div className="v2-auth-progress">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`v2-auth-step ${i <= step ? "active" : ""}`}
            />
          ))}
        </div>

        <div className="v2-auth-card">
          {step === 0 && (
            <>
              <div className="v2-eyebrow">Step 01 of 04</div>
              <h1 style={{ marginTop: 14 }}>
                First, who are you <em>here</em> as?
              </h1>
              <p className="lead">Your experience will be tuned differently.</p>
              <div className="v2-role-grid">
                {ROLE_OPTIONS.map((r) => {
                  const Icon = r.icon;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      className={`v2-role ${role === r.id ? "selected" : ""}`}
                      onClick={() => setRole(r.id)}
                    >
                      <div className="v2-role-ico">
                        <Icon size={24} />
                      </div>
                      <h3>{r.title}</h3>
                      <p>{r.description}</p>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div className="v2-eyebrow">Step 02 of 04</div>
              <h1 style={{ marginTop: 14 }}>
                Create your <em>account</em>.
              </h1>
              <p className="lead">
                We&rsquo;ll use this to save your profile and alert you about
                matches.
              </p>
              <div style={{ display: "grid", gap: 18, marginTop: 32 }}>
                <div>
                  <label className="v2-field-label" htmlFor="name">
                    Full name
                  </label>
                  <input
                    id="name"
                    className="v2-input-block"
                    placeholder="Alex Tremblay"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                  />
                </div>
                <div>
                  <label className="v2-field-label" htmlFor="email">
                    Work email
                  </label>
                  <input
                    id="email"
                    className="v2-input-block"
                    type="email"
                    placeholder="alex@energy.ca"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>
                <div>
                  <label className="v2-field-label" htmlFor="password">
                    Password
                  </label>
                  <input
                    id="password"
                    className="v2-input-block"
                    type="password"
                    placeholder="Minimum 12 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
                <label
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "flex-start",
                    fontSize: 13,
                    color: "var(--v2-ink-600)",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    style={{
                      marginTop: 3,
                      accentColor: "var(--v2-ink-950)",
                    }}
                  />
                  I agree to the Terms of Service and Privacy Policy.
                </label>
              </div>
            </>
          )}

          {step === 2 && role === "jobseeker" && (
            <>
              <div className="v2-eyebrow">Step 03 of 04</div>
              <h1 style={{ marginTop: 14 }}>
                Your <em>specialty</em>.
              </h1>
              <p className="lead">
                Select what fits best — the more specific, the better the
                matches.
              </p>
              <div style={{ marginTop: 32 }}>
                <label className="v2-field-label">Primary sector</label>
                <div className="v2-filter-chips">
                  {SECTORS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`v2-filter-chip ${sector === s ? "active" : ""}`}
                      onClick={() => setSector(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ marginTop: 32 }}>
                <label className="v2-field-label">Experience level</label>
                <div className="v2-filter-chips">
                  {LEVELS.map((l) => (
                    <button
                      key={l}
                      type="button"
                      className={`v2-filter-chip ${level === l ? "active" : ""}`}
                      onClick={() => setLevel(l)}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ marginTop: 32 }}>
                <label className="v2-field-label">
                  Top skills &amp; certs · pick up to 6
                </label>
                <div className="v2-filter-chips">
                  {SKILL_OPTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`v2-filter-chip ${skills.includes(s) ? "active" : ""}`}
                      onClick={() => toggleSkill(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {step === 2 && role === "employer" && (
            <>
              <div className="v2-eyebrow">Step 03 of 04</div>
              <h1 style={{ marginTop: 14 }}>
                Your <em>company</em>.
              </h1>
              <p className="lead">
                A few details about your team so we can surface the right
                candidates.
              </p>
              <div style={{ display: "grid", gap: 20, marginTop: 32 }}>
                <div>
                  <label className="v2-field-label" htmlFor="company">
                    Company name
                  </label>
                  <input
                    id="company"
                    className="v2-input-block"
                    placeholder="Ark Energy"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    autoComplete="organization"
                  />
                </div>
                <div>
                  <label className="v2-field-label">Company size</label>
                  <div className="v2-filter-chips">
                    {COMPANY_SIZES.map((s) => (
                      <button
                        key={s}
                        type="button"
                        className={`v2-filter-chip ${companySize === s ? "active" : ""}`}
                        onClick={() => setCompanySize(s)}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="v2-field-label">
                    Sectors you hire for
                  </label>
                  <div className="v2-filter-chips">
                    {SECTORS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        className={`v2-filter-chip ${hiringSectors.includes(s) ? "active" : ""}`}
                        onClick={() => toggleHiringSector(s)}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="v2-field-label" htmlFor="location">
                    Primary location
                  </label>
                  <input
                    id="location"
                    className="v2-input-block"
                    placeholder="Calgary, AB"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    autoComplete="address-level2"
                  />
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="v2-eyebrow">Step 04 of 04</div>
              <h1 style={{ marginTop: 14 }}>
                Choose your <em>plan</em>.
              </h1>
              <p className="lead">
                {role === "employer"
                  ? "Billed monthly. Change or cancel anytime."
                  : "Candidates are always free. Upgrade anytime for faster matches and direct intros."}
              </p>
              <div style={{ display: "grid", gap: 14, marginTop: 32 }}>
                {role === "employer"
                  ? EMPLOYER_PLAN_OPTIONS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className={`v2-role ${employerPlan === p.id ? "selected" : ""}`}
                        onClick={() => setEmployerPlan(p.id)}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr auto",
                          gap: 20,
                          alignItems: "center",
                          padding: 24,
                        }}
                      >
                        <div style={{ textAlign: "left" }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <h3 style={{ fontSize: 18 }}>{p.title}</h3>
                            {p.recommended && (
                              <span
                                className="v2-chip v2-chip-accent"
                                style={{ fontSize: 10 }}
                              >
                                Recommended
                              </span>
                            )}
                          </div>
                          <p style={{ marginTop: 4, fontSize: 13 }}>
                            {p.description}
                          </p>
                        </div>
                        <div
                          style={{
                            fontFamily: "var(--v2-font-serif)",
                            fontSize: 22,
                          }}
                        >
                          {p.price}
                        </div>
                      </button>
                    ))
                  : PLAN_OPTIONS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className={`v2-role ${plan === p.id ? "selected" : ""}`}
                        onClick={() => setPlan(p.id)}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr auto",
                          gap: 20,
                          alignItems: "center",
                          padding: 24,
                        }}
                      >
                        <div style={{ textAlign: "left" }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <h3 style={{ fontSize: 18 }}>{p.title}</h3>
                            {p.recommended && (
                              <span
                                className="v2-chip v2-chip-accent"
                                style={{ fontSize: 10 }}
                              >
                                Recommended
                              </span>
                            )}
                          </div>
                          <p style={{ marginTop: 4, fontSize: 13 }}>
                            {p.description}
                          </p>
                        </div>
                        <div
                          style={{
                            fontFamily: "var(--v2-font-serif)",
                            fontSize: 22,
                          }}
                        >
                          {p.price}
                        </div>
                      </button>
                    ))}
              </div>
            </>
          )}

          {error && (
            <div
              role="alert"
              style={{
                marginTop: 20,
                padding: "10px 14px",
                borderRadius: "var(--v2-r-md)",
                background: "var(--v2-coral-soft)",
                color: "#A63A20",
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}

          <div className="v2-form-actions">
            <button
              type="button"
              className="v2-btn v2-btn-link"
              onClick={handlePrev}
            >
              ← {step === 0 ? "Back to home" : "Previous"}
            </button>
            <button
              type="button"
              className="v2-btn v2-btn-primary"
              onClick={handleNext}
              disabled={!canAdvance() || submitting}
            >
              {submitting
                ? "Creating…"
                : step === 3
                  ? role === "employer"
                    ? "Create account"
                    : "Create profile"
                  : "Continue"}
              <ArrowRight size={16} />
            </button>
          </div>

          {step === 0 && (
            <div
              style={{
                textAlign: "center",
                fontSize: 14,
                color: "var(--v2-ink-500)",
                marginTop: 28,
              }}
            >
              Already have an account?{" "}
              <Link
                href="/sign-in"
                style={{
                  color: "var(--v2-ink-900)",
                  fontWeight: 500,
                  textDecoration: "underline",
                  textUnderlineOffset: 3,
                }}
              >
                Sign in
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
