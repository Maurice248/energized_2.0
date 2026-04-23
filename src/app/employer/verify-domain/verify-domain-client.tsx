"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/shared/icon";
import { api } from "@/lib/trpc/client";

export function VerifyDomainClient({ token }: { token: string }) {
  const [state, setState] = useState<"claiming" | "ok" | "error">("claiming");
  const [message, setMessage] = useState<string>("");
  const [companyName, setCompanyName] = useState<string>("");
  const verify = api.employer.verifyDomainByToken.useMutation();
  const attempted = useRef(false);

  useEffect(() => {
    if (!token || attempted.current) return;
    attempted.current = true;
    verify.mutate(
      { token },
      {
        onSuccess: (data) => {
          setState("ok");
          setCompanyName(data?.name ?? "your company");
        },
        onError: (err) => {
          setState("error");
          setMessage(err.message);
        },
      },
    );
  }, [token, verify]);

  return (
    <div
      className="v2"
      style={{
        minHeight: "100vh",
        background: "var(--v2-ink-50, #F9FAFC)",
        display: "grid",
        placeItems: "center",
        padding: 32,
      }}
    >
      <div
        style={{
          maxWidth: 540,
          width: "100%",
          background: "white",
          borderRadius: 20,
          border: "1px solid var(--v2-ink-200)",
          padding: "40px 44px",
          textAlign: "center",
        }}
      >
        <Image
          src="/energized-logo.svg"
          alt="Energized"
          width={144}
          height={80}
          priority
          style={{
            height: 36,
            width: "auto",
            marginBottom: 28,
            display: "inline-block",
          }}
        />

        {!token && (
          <>
            <h1
              style={{
                fontFamily: "var(--v2-font-serif)",
                fontSize: 26,
                fontWeight: 400,
                margin: "0 0 10px",
              }}
            >
              Missing verification token
            </h1>
            <p style={{ color: "var(--v2-ink-500)", fontSize: 14 }}>
              This link looks malformed. Start the verification flow again from
              your onboarding wizard.
            </p>
          </>
        )}

        {token && state === "claiming" && (
          <>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "var(--v2-ink-950)",
                color: "var(--v2-accent, #C7F956)",
                display: "inline-grid",
                placeItems: "center",
                marginBottom: 20,
              }}
            >
              <Icon name="shield" size={28} />
            </div>
            <h1
              style={{
                fontFamily: "var(--v2-font-serif)",
                fontSize: 26,
                fontWeight: 400,
                margin: "0 0 10px",
              }}
            >
              Verifying…
            </h1>
            <p style={{ color: "var(--v2-ink-500)", fontSize: 14 }}>
              One moment while we mark your company as verified.
            </p>
          </>
        )}

        {state === "ok" && (
          <>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "var(--v2-accent-soft, #E7FBD0)",
                color: "var(--v2-accent-deep, #4B7E14)",
                display: "inline-grid",
                placeItems: "center",
                marginBottom: 20,
              }}
            >
              <Icon name="check" size={28} />
            </div>
            <h1
              style={{
                fontFamily: "var(--v2-font-serif)",
                fontSize: 28,
                fontWeight: 400,
                letterSpacing: "-0.01em",
                margin: "0 0 10px",
              }}
            >
              <em>{companyName}</em> is verified.
            </h1>
            <p style={{ color: "var(--v2-ink-500)", fontSize: 14 }}>
              You can now post roles and message candidates. Head back to
              onboarding to finish setup.
            </p>
            <div style={{ marginTop: 24 }}>
              <Link
                className="v2-btn v2-btn-primary v2-btn-lg"
                href="/employer/onboarding"
              >
                Back to onboarding <Icon name="arrowRight" size={14} />
              </Link>
            </div>
          </>
        )}

        {state === "error" && (
          <>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "var(--v2-coral-soft, #FBEBE4)",
                color: "#A63A20",
                display: "inline-grid",
                placeItems: "center",
                marginBottom: 20,
              }}
            >
              <Icon name="x" size={28} />
            </div>
            <h1
              style={{
                fontFamily: "var(--v2-font-serif)",
                fontSize: 26,
                fontWeight: 400,
                margin: "0 0 10px",
              }}
            >
              Couldn&rsquo;t verify.
            </h1>
            <p style={{ color: "var(--v2-ink-500)", fontSize: 14 }}>
              {message || "Link invalid or expired."}
            </p>
            <div style={{ marginTop: 24 }}>
              <Link
                className="v2-btn v2-btn-ghost v2-btn-lg"
                href="/employer/onboarding"
              >
                Back to onboarding
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
