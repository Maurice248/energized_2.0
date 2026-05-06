"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Mail } from "lucide-react";
import { authClient } from "@/lib/auth/client";

const RESEND_COOLDOWN_MS = 30_000;

function VerifyEmailInner() {
  const params = useSearchParams();
  const email = params.get("email") ?? "";
  const next = params.get("next") ?? "/onboarding";

  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cooldownEndsAt, setCooldownEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (cooldownEndsAt == null) return;
    setNow(Date.now());
    tickRef.current = setInterval(() => {
      const next = Date.now();
      setNow(next);
      if (next >= cooldownEndsAt) {
        if (tickRef.current) clearInterval(tickRef.current);
        tickRef.current = null;
        setCooldownEndsAt(null);
        setStatus("idle");
      }
    }, 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      tickRef.current = null;
    };
  }, [cooldownEndsAt]);

  const cooldownLeft =
    cooldownEndsAt != null
      ? Math.max(0, Math.ceil((cooldownEndsAt - now) / 1000))
      : 0;
  const onCooldown = cooldownLeft > 0;

  async function handleResend() {
    if (onCooldown || status === "sending") return;
    if (!email) {
      setStatus("error");
      setErrorMessage("We don't have an email on file. Return to sign-up.");
      return;
    }
    setStatus("sending");
    setErrorMessage(null);
    const { error } = await authClient.sendVerificationEmail({
      email,
      callbackURL: next,
    });
    if (error) {
      setStatus("error");
      setErrorMessage(error.message ?? "Couldn't resend. Try again in a bit.");
      return;
    }
    setStatus("sent");
    setCooldownEndsAt(Date.now() + RESEND_COOLDOWN_MS);
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
          <div className="v2-eyebrow v2-eyebrow-light">One last step</div>
          <h2 style={{ marginTop: 20 }}>
            We sent a link to your <em>inbox</em>.
          </h2>
          <p>
            Click the confirmation button in the email to activate your account
            and get your first matches.
          </p>
        </div>
        <div className="v2-auth-testimonial">
          <div className="v2-eyebrow v2-eyebrow-light">Tip</div>
          <p style={{ fontSize: 16 }}>
            The email might land in Promotions or Updates on Gmail. Mark it as
            Primary so future match alerts land where you&rsquo;ll see them.
          </p>
        </div>
      </aside>

      <main
        className="v2-auth-main"
        style={{ justifyContent: "center" }}
      >
        <div className="v2-auth-card" style={{ textAlign: "center" }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 20,
              background: "var(--v2-accent-soft)",
              color: "var(--v2-accent-deep)",
              display: "grid",
              placeItems: "center",
              margin: "0 auto 20px",
            }}
          >
            <Mail size={28} />
          </div>
          <h1>
            Check your <em>inbox</em>.
          </h1>
          <p
            className="lead"
            style={{ marginTop: 14, textAlign: "center" }}
          >
            We emailed a confirmation link to{" "}
            <strong style={{ color: "var(--v2-ink-900)" }}>
              {email || "your email address"}
            </strong>
            . Click it to activate your account.
          </p>

          <div
            style={{
              marginTop: 28,
              padding: 20,
              background: "var(--v2-ink-50)",
              borderRadius: "var(--v2-r-md)",
              fontSize: 13,
              color: "var(--v2-ink-600)",
              lineHeight: 1.55,
              textAlign: "left",
            }}
          >
            <strong style={{ color: "var(--v2-ink-900)" }}>
              Didn&rsquo;t get it?
            </strong>{" "}
            Check your spam folder, or use the button below to resend. Links
            expire after 1 hour.
          </div>

          <div
            style={{
              marginTop: 20,
              display: "flex",
              justifyContent: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              className="v2-btn v2-btn-ghost"
              onClick={handleResend}
              disabled={status === "sending" || onCooldown}
            >
              {status === "sending"
                ? "Resending…"
                : onCooldown
                  ? `Link resent · resend in ${cooldownLeft}s`
                  : "Resend link"}
            </button>
            <Link href="/sign-in" className="v2-btn v2-btn-primary">
              Back to sign in
            </Link>
          </div>

          <div
            style={{
              marginTop: 18,
              fontSize: 13,
              color: "var(--v2-ink-500)",
              textAlign: "center",
            }}
          >
            Wrong email?{" "}
            <Link
              href="/sign-up"
              style={{
                color: "var(--v2-ink-900)",
                fontWeight: 500,
                textDecoration: "underline",
                textUnderlineOffset: 3,
              }}
            >
              Sign up again
            </Link>
          </div>

          {status === "error" && errorMessage && (
            <div
              role="alert"
              style={{
                marginTop: 20,
                padding: "10px 14px",
                borderRadius: "var(--v2-r-md)",
                background: "var(--v2-coral-soft)",
                color: "#A63A20",
                fontSize: 13,
                textAlign: "left",
              }}
            >
              {errorMessage}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailInner />
    </Suspense>
  );
}
