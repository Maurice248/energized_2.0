"use client";

import { Suspense, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { authClient } from "@/lib/auth/client";

type Status =
  | "idle"
  | "password-mismatch"
  | "submitting"
  | "success"
  | "invalid-token"
  | "error";

function ResetPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Branch: no token in URL
  if (!token) {
    return (
      <NoTokenView />
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    if (newPassword !== confirmPassword) {
      setStatus("password-mismatch");
      return;
    }
    if (newPassword.length < 8) {
      setStatus("error");
      setErrorMsg("Password must be at least 8 characters.");
      return;
    }

    setStatus("submitting");
    const { error } = await authClient.resetPassword({
      newPassword,
      token: token!,
    });

    if (error) {
      const code = (error as { code?: string }).code ?? "";
      const msg = error.message ?? "";
      const isInvalid =
        /invalid|expired|not.found/i.test(code) ||
        /invalid|expired/i.test(msg);
      if (isInvalid) {
        setStatus("invalid-token");
      } else {
        setStatus("error");
        setErrorMsg(msg || "Couldn't reset your password. Try again.");
      }
      return;
    }
    setStatus("success");
    // Note: not auto-redirecting — see spec §3.5. User clicks the CTA.
  }

  if (status === "success") {
    return (
      <>
        <h1>
          Password <em>updated</em>.
        </h1>
        <p className="lead">
          You can now sign in with your new password.
        </p>
        <button
          type="button"
          className="v2-btn v2-btn-primary"
          style={{ marginTop: 32 }}
          onClick={() => router.push("/sign-in")}
        >
          Go to sign in <ArrowRight size={16} />
        </button>
      </>
    );
  }

  if (status === "invalid-token") {
    return (
      <>
        <h1>
          Link <em>expired</em>.
        </h1>
        <p className="lead">
          This reset link is invalid or has expired. Request a new one.
        </p>
        <Link
          href="/forgot-password"
          className="v2-btn v2-btn-primary"
          style={{ marginTop: 32, display: "inline-flex" }}
        >
          Request a new link <ArrowRight size={16} />
        </Link>
      </>
    );
  }

  return (
    <>
      <h1>
        Reset <em>password</em>.
      </h1>
      <p className="lead">Choose a new password.</p>

      <form
        onSubmit={handleSubmit}
        style={{ display: "grid", gap: 18, marginTop: 32 }}
      >
        <div>
          <label className="v2-field-label" htmlFor="new-password">
            New password
          </label>
          <input
            id="new-password"
            className="v2-input-block"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            placeholder="At least 8 characters"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <div
            style={{
              fontSize: 12,
              color: "var(--v2-ink-500)",
              marginTop: 6,
            }}
          >
            At least 8 characters.
          </div>
        </div>
        <div>
          <label className="v2-field-label" htmlFor="confirm-password">
            Confirm password
          </label>
          <input
            id="confirm-password"
            className="v2-input-block"
            type="password"
            autoComplete="new-password"
            required
            placeholder="Repeat the new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        {status === "password-mismatch" && (
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
            Passwords don&rsquo;t match.
          </div>
        )}

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
          {status === "submitting" ? "Updating…" : "Update password"}{" "}
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
  );
}

function NoTokenView() {
  return (
    <>
      <h1>
        Missing <em>token</em>.
      </h1>
      <p className="lead">
        This link doesn&rsquo;t carry a reset token. Request a new one.
      </p>
      <Link
        href="/forgot-password"
        className="v2-btn v2-btn-primary"
        style={{ marginTop: 32, display: "inline-flex" }}
      >
        Request a reset link <ArrowRight size={16} />
      </Link>
    </>
  );
}

export default function ResetPasswordPage() {
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
          <div className="v2-eyebrow v2-eyebrow-light">Almost there</div>
          <h2 style={{ marginTop: 20 }}>
            One <em>strong</em> password coming up.
          </h2>
          <p>
            Pick something you&rsquo;ll remember. Bonus points for a passphrase.
          </p>
        </div>
        <div style={{ flex: 1 }} />
      </aside>

      <main className="v2-auth-main">
        <div style={{ flex: 1 }} />
        <div className="v2-auth-card">
          <Suspense fallback={null}>
            <ResetPasswordInner />
          </Suspense>
        </div>
        <div style={{ flex: 1 }} />
      </main>
    </div>
  );
}
