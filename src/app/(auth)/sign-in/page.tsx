"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import { PasswordInput } from "@/components/shared/password-input";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error: authError } = await authClient.signIn.email({
      email,
      password,
      rememberMe: remember,
    });
    setSubmitting(false);
    if (authError) {
      setError(authError.message ?? "Sign-in failed. Check your credentials.");
      return;
    }
    router.push("/");
    router.refresh();
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
          <div className="v2-eyebrow v2-eyebrow-light">Good to see you</div>
          <h2 style={{ marginTop: 20 }}>
            Three <em>new</em> matches since your last visit.
          </h2>
          <p>
            Including a Sr. Controls role at Ark Energy (96% match) and a hybrid
            solar PM at Helios.
          </p>
        </div>
        <div className="v2-auth-testimonial">
          <div className="v2-eyebrow v2-eyebrow-light">Trending this week</div>
          <p style={{ fontSize: 18 }}>
            Wind Turbine Technicians — 42 new roles across Atlantic Canada.
          </p>
        </div>
      </aside>

      <main className="v2-auth-main">
        <div style={{ flex: 1 }} />
        <div className="v2-auth-card">
          <h1>
            Sign <em>in</em>.
          </h1>
          <p className="lead">Welcome back. Your matches are waiting.</p>

          <form
            onSubmit={handleSubmit}
            style={{ display: "grid", gap: 18, marginTop: 32 }}
          >
            <div>
              <label className="v2-field-label" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                className="v2-input-block"
                type="email"
                autoComplete="email"
                required
                placeholder="alex@energy.ca"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="v2-field-label" htmlFor="password">
                Password
              </label>
              <PasswordInput
                id="password"
                className="v2-input-block"
                autoComplete="current-password"
                required
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 13,
              }}
            >
              <label
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  color: "var(--v2-ink-600)",
                }}
              >
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  style={{ accentColor: "var(--v2-ink-950)" }}
                />{" "}
                Remember me
              </label>
              <Link
                href="/forgot-password"
                style={{ color: "var(--v2-ink-900)", fontWeight: 500 }}
              >
                Forgot password?
              </Link>
            </div>

            {error && (
              <div
                role="alert"
                style={{
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

            <button
              type="submit"
              className="v2-btn v2-btn-primary"
              disabled={submitting}
            >
              {submitting ? "Signing in…" : "Sign in"}{" "}
              <ArrowRight size={16} />
            </button>

            <div
              style={{
                textAlign: "center",
                fontSize: 14,
                color: "var(--v2-ink-500)",
                marginTop: 8,
              }}
            >
              New here?{" "}
              <Link
                href="/sign-up"
                style={{
                  color: "var(--v2-ink-900)",
                  fontWeight: 500,
                  textDecoration: "underline",
                  textUnderlineOffset: 3,
                }}
              >
                Create an account
              </Link>
            </div>
          </form>
        </div>
        <div style={{ flex: 1 }} />
      </main>
    </div>
  );
}
