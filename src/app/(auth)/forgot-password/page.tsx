"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { authClient } from "@/lib/auth/client";

type Status = "idle" | "submitting" | "sent" | "error";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg(null);
    const { error } = await authClient.requestPasswordReset({
      email,
      redirectTo: "/reset-password",
    });
    if (error) {
      setStatus("error");
      setErrorMsg(
        error.message ??
          "Couldn't send the reset email. Try again or contact dev@energized.biz.",
      );
      return;
    }
    setStatus("sent");
  }

  function reset() {
    setStatus("idle");
    setErrorMsg(null);
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
          <div className="v2-eyebrow v2-eyebrow-light">Forgot it happens</div>
          <h2 style={{ marginTop: 20 }}>
            We&rsquo;ll get you back <em>in</em>.
          </h2>
          <p>
            Enter the email you signed up with and we&rsquo;ll send a reset
            link. Valid for one hour.
          </p>
        </div>
        <div style={{ flex: 1 }} />
      </aside>

      <main className="v2-auth-main">
        <div style={{ flex: 1 }} />
        <div className="v2-auth-card">
          {status === "sent" ? (
            <>
              <h1>
                Check your <em>inbox</em>.
              </h1>
              <p className="lead">
                If an account with that email exists, we&rsquo;ve sent a reset
                link. The link expires in one hour.
              </p>
              <div
                style={{
                  display: "flex",
                  gap: 16,
                  marginTop: 32,
                  fontSize: 14,
                }}
              >
                <button
                  type="button"
                  onClick={reset}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--v2-ink-900)",
                    fontWeight: 500,
                    textDecoration: "underline",
                    textUnderlineOffset: 3,
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  Didn&rsquo;t get it? Try again
                </button>
                <Link
                  href="/sign-in"
                  style={{
                    color: "var(--v2-ink-500)",
                  }}
                >
                  Back to sign in
                </Link>
              </div>
            </>
          ) : (
            <>
              <h1>
                Forgot <em>password</em>?
              </h1>
              <p className="lead">We&rsquo;ll send you a reset link.</p>

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

                {status === "error" && errorMsg && (
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
                    {errorMsg}
                  </div>
                )}

                <button
                  type="submit"
                  className="v2-btn v2-btn-primary"
                  disabled={status === "submitting"}
                >
                  {status === "submitting" ? "Sending…" : "Send reset link"}{" "}
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
                  Remembered it?{" "}
                  <Link
                    href="/sign-in"
                    style={{
                      color: "var(--v2-ink-900)",
                      fontWeight: 500,
                      textDecoration: "underline",
                      textUnderlineOffset: 3,
                    }}
                  >
                    Back to sign in
                  </Link>
                </div>
              </form>
            </>
          )}
        </div>
        <div style={{ flex: 1 }} />
      </main>
    </div>
  );
}
