"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Icon } from "@/components/shared/icon";
import { authClient } from "@/lib/auth/client";
import { api } from "@/lib/trpc/client";

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  recruiter: "Recruiter",
  hiring_manager: "Hiring manager",
  viewer: "Viewer",
};

export function AcceptInviteClient({ token }: { token: string }) {
  const router = useRouter();
  const session = authClient.useSession();

  const summary = api.employer.getInviteSummary.useQuery(
    { token },
    { enabled: token.length >= 16, retry: false },
  );
  const accept = api.employer.acceptInvite.useMutation({
    onSuccess: () => router.push("/employer/onboarding"),
  });

  if (!token) {
    return <Shell><Notice title="Missing invite token" body="This link looks malformed. Ask whoever invited you to resend." /></Shell>;
  }

  if (summary.isLoading) {
    return <Shell><Notice title="Checking your invite…" body="One moment." /></Shell>;
  }

  if (!summary.data) {
    return (
      <Shell>
        <Notice
          title="Invite not found"
          body="This link has been used or was revoked. Ask for a new one."
        />
      </Shell>
    );
  }

  const {
    email: invitedEmail,
    role,
    status,
    companyName,
    companyLogoColor,
    expiresAt,
  } = summary.data;

  if (status === "active") {
    return (
      <Shell>
        <Notice
          title="Already active"
          body={`You're already on ${companyName}'s team.`}
          cta={{ label: "Go to dashboard", href: "/employer/onboarding" }}
        />
      </Shell>
    );
  }

  if (expiresAt && new Date(expiresAt) < new Date()) {
    return (
      <Shell>
        <Notice
          title="Invite expired"
          body={`This invite to ${companyName} is past its 7-day window. Ask for a new one.`}
        />
      </Shell>
    );
  }

  const signedIn = Boolean(session.data?.user);
  const signedInEmail = session.data?.user.email.toLowerCase() ?? "";
  const emailMatches = signedInEmail === invitedEmail.toLowerCase();

  return (
    <Shell>
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: 18,
          background: companyLogoColor,
          color: "white",
          display: "grid",
          placeItems: "center",
          fontFamily: "var(--v2-font-serif)",
          fontSize: 32,
          marginBottom: 20,
        }}
      >
        {companyName.charAt(0).toUpperCase()}
      </div>
      <div className="v2-eyebrow">You&rsquo;re invited</div>
      <h1
        style={{
          fontFamily: "var(--v2-font-serif)",
          fontSize: "clamp(28px, 4vw, 38px)",
          letterSpacing: "-0.02em",
          margin: "14px 0 12px",
          fontWeight: 400,
        }}
      >
        Join <em>{companyName}</em> on Energized.
      </h1>
      <p style={{ color: "var(--v2-ink-500)", fontSize: 15, margin: 0 }}>
        This invite was sent to <strong>{invitedEmail}</strong> with the role{" "}
        <strong>{ROLE_LABELS[role] ?? role}</strong>.
      </p>

      {signedIn && emailMatches && (
        <div style={{ marginTop: 28, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            className="v2-btn v2-btn-primary v2-btn-lg"
            onClick={() => accept.mutate({ token })}
            disabled={accept.isPending}
          >
            {accept.isPending ? "Accepting…" : "Accept invite"}
            <Icon name="arrowRight" size={16} />
          </button>
        </div>
      )}

      {signedIn && !emailMatches && (
        <div
          style={{
            marginTop: 28,
            padding: 16,
            background: "var(--v2-coral-soft, #FBEBE4)",
            border: "1px solid rgba(166,58,32,0.2)",
            borderRadius: 12,
            fontSize: 14,
            color: "#A63A20",
          }}
        >
          You&rsquo;re signed in as <strong>{signedInEmail}</strong>, but this
          invite was sent to <strong>{invitedEmail}</strong>. Sign out and sign
          in with that address to accept.
        </div>
      )}

      {!signedIn && (
        <div style={{ marginTop: 28, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link
            className="v2-btn v2-btn-primary v2-btn-lg"
            href={`/sign-up?email=${encodeURIComponent(invitedEmail)}&next=${encodeURIComponent(`/accept-invite?token=${token}`)}`}
          >
            Create account & accept
            <Icon name="arrowRight" size={16} />
          </Link>
          <Link
            className="v2-btn v2-btn-ghost v2-btn-lg"
            href={`/sign-in?next=${encodeURIComponent(`/accept-invite?token=${token}`)}`}
          >
            I already have an account
          </Link>
        </div>
      )}

      {accept.error && (
        <div
          role="alert"
          style={{
            marginTop: 20,
            padding: "10px 14px",
            background: "var(--v2-coral-soft, #FBEBE4)",
            color: "#A63A20",
            borderRadius: 10,
            fontSize: 13,
          }}
        >
          {accept.error.message}
        </div>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
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
          maxWidth: 560,
          width: "100%",
          background: "white",
          borderRadius: 20,
          border: "1px solid var(--v2-ink-200)",
          padding: "40px 44px",
        }}
      >
        <Image
          src="/energized-logo.svg"
          alt="Energized"
          width={144}
          height={80}
          priority
          style={{ height: 36, width: "auto", marginBottom: 28 }}
        />
        {children}
      </div>
    </div>
  );
}

function Notice({
  title,
  body,
  cta,
}: {
  title: string;
  body: string;
  cta?: { label: string; href: string };
}) {
  return (
    <div>
      <h1
        style={{
          fontFamily: "var(--v2-font-serif)",
          fontSize: 26,
          letterSpacing: "-0.015em",
          margin: "0 0 12px",
          fontWeight: 400,
        }}
      >
        {title}
      </h1>
      <p style={{ color: "var(--v2-ink-500)", fontSize: 15, margin: 0 }}>
        {body}
      </p>
      {cta && (
        <div style={{ marginTop: 24 }}>
          <Link className="v2-btn v2-btn-primary" href={cta.href}>
            {cta.label} <Icon name="arrowRight" size={14} />
          </Link>
        </div>
      )}
    </div>
  );
}
