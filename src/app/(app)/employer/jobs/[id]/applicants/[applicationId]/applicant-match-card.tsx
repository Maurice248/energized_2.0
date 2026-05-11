"use client";

import Link from "next/link";
import { Icon } from "@/components/shared/icon";
import { api } from "@/lib/trpc/client";

/**
 * Employer-side mirror of the candidate's Ember card. Renders the
 * AI-computed fit score for THIS applicant against the role they applied
 * to. Uses the same `scoreJobMatch` helper + `job_matches` cache as the
 * candidate-side card — a hit on either side benefits the other.
 */
export function ApplicantMatchCard({
  applicationId,
}: {
  applicationId: string;
}) {
  const matchQuery = api.matches.scoreApplicantForEmployer.useQuery(
    { applicationId },
    { staleTime: 60 * 60 * 1000 },
  );

  const data = matchQuery.data;
  const loading = matchQuery.isLoading;
  const disabled = data?.enabled === false;
  const lockedReason = data?.lockedReason ?? null;
  const score = data?.score ?? null;
  const reason = data?.reason ?? null;

  return (
    <div
      style={{
        background: "var(--v2-ink-950)",
        color: "white",
        border: "1px solid var(--v2-ink-900)",
        borderRadius: "var(--v2-r-xl)",
        padding: 22,
        position: "relative",
        overflow: "hidden",
        marginBottom: 20,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(400px circle at 80% -20%, rgba(28,170,226,0.22), transparent 60%)",
          pointerEvents: "none",
        }}
      />
      <div
        className="v2-eyebrow v2-eyebrow-light"
        style={{ marginBottom: 12, position: "relative" }}
      >
        <Icon name="sparkles" size={12} /> AI fit score
      </div>

      {disabled ? (
        <div style={{ position: "relative" }}>
          <div
            style={{
              fontFamily: "var(--v2-font-serif)",
              fontSize: 22,
              fontWeight: 900,
              fontStyle: "italic",
              marginBottom: 8,
            }}
          >
            {lockedReason === "subscription_required"
              ? "Locked."
              : "Coming soon."}
          </div>
          <p
            style={{
              color: "var(--v2-ink-300)",
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            {lockedReason === "subscription_required" ? (
              <>
                AI fit scoring is included with any active employer
                subscription.{" "}
                <Link
                  href="/employer/profile#ep-billing"
                  style={{
                    color: "var(--v2-accent)",
                    textDecoration: "underline",
                  }}
                >
                  Manage billing →
                </Link>
              </>
            ) : (
              <>
                AI fit scoring lights up once an OpenAI key is configured on
                this environment.
              </>
            )}
          </p>
        </div>
      ) : loading ? (
        <div style={{ position: "relative" }}>
          <div
            style={{
              height: 54,
              width: 120,
              background: "rgba(255,255,255,0.08)",
              borderRadius: 10,
              marginBottom: 10,
            }}
          />
          <div
            style={{
              height: 14,
              width: "80%",
              background: "rgba(255,255,255,0.08)",
              borderRadius: 6,
              marginBottom: 8,
            }}
          />
          <div
            style={{
              height: 14,
              width: "60%",
              background: "rgba(255,255,255,0.08)",
              borderRadius: 6,
            }}
          />
        </div>
      ) : score == null ? (
        <div style={{ position: "relative" }}>
          <p
            style={{
              color: "var(--v2-ink-300)",
              fontSize: 14,
              lineHeight: 1.5,
            }}
          >
            {reason ?? "Couldn't compute a fit score right now."}
          </p>
        </div>
      ) : (
        <div style={{ position: "relative" }}>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 4,
              marginBottom: 6,
            }}
          >
            <span
              style={{
                fontFamily: "var(--v2-font-serif)",
                fontSize: 56,
                fontWeight: 900,
                fontStyle: "italic",
                lineHeight: 1,
                color: "var(--v2-accent)",
              }}
            >
              {score}
            </span>
            <span
              style={{
                fontSize: 22,
                color: "var(--v2-ink-300)",
                fontWeight: 700,
              }}
            >
              %
            </span>
          </div>
          <div
            style={{
              fontFamily: "var(--v2-font-mono)",
              fontSize: 11,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--v2-ink-300)",
              marginBottom: 12,
            }}
          >
            fit with this role
          </div>
          <div
            style={{
              height: 4,
              background: "rgba(255,255,255,0.1)",
              borderRadius: 4,
              overflow: "hidden",
              marginBottom: 14,
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${score}%`,
                background: "var(--v2-accent)",
              }}
            />
          </div>
          {reason && (
            <p
              style={{
                color: "var(--v2-ink-300)",
                fontSize: 13,
                lineHeight: 1.55,
              }}
            >
              {reason}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
