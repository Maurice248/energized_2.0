"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toaster } from "@/components/ui/sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/server/api/root";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

type RouterOut = inferRouterOutputs<AppRouter>["admin"]["verifications"];
type EmployerRow = RouterOut["employers"][number];
type CredentialRow = RouterOut["credentials"][number];
type Counts = RouterOut["counts"];
type CredentialStatus = "pending" | "approved" | "rejected" | "all";

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function formatDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(d));
}

function planBadgeClass(label: string): string {
  if (label === "Enterprise") return "enterprise";
  if (label === "Growth") return "growth";
  if (label === "Starter") return "starter";
  return "trial";
}


const DOMAIN_VERIFY_LABELS: Record<string, string> = {
  none: "No email sent",
  pending: "Email pending",
  expired: "Link expired",
};

/* ------------------------------------------------------------------ */
/*  ResendEmailDialog                                                   */
/* ------------------------------------------------------------------ */

function ResendEmailDialog({
  org,
  open,
  onClose,
  onSent,
}: {
  org: EmployerRow;
  open: boolean;
  onClose: () => void;
  onSent: () => void;
}) {
  const defaultEmail = org.domainVerifyEmailTo ?? "";
  const [email, setEmail] = useState(defaultEmail);
  const utils = api.useUtils();

  const { mutate, isPending } = api.admin.verifications.resendDomainEmail.useMutation({
    onSuccess: () => {
      toast.success(`Domain verify email sent to ${email}`);
      void utils.admin.verifications.employers.invalidate();
      onSent();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resend domain verification</DialogTitle>
          <DialogDescription>
            Send a verification link to an address at{" "}
            {org.domain ? <strong>@{org.domain}</strong> : "the company domain"}.
          </DialogDescription>
        </DialogHeader>
        <Input
          type="email"
          placeholder={`admin@${org.domain ?? "company.com"}`}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            onClick={() => mutate({ orgId: org.id, email })}
            disabled={isPending || !email.trim()}
          >
            {isPending ? "Sending…" : "Send email"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  RejectCredentialDialog                                              */
/* ------------------------------------------------------------------ */

function RejectCredentialDialog({
  cred,
  open,
  onClose,
  onDone,
}: {
  cred: CredentialRow;
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const [note, setNote] = useState("");
  const utils = api.useUtils();

  const { mutate, isPending } = api.admin.verifications.reviewCredential.useMutation({
    onSuccess: () => {
      toast.success("Credential rejected.");
      void utils.admin.verifications.credentials.invalidate();
      onDone();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject credential</DialogTitle>
          <DialogDescription>
            Rejecting <strong>{cred.name}</strong> for{" "}
            <strong>{cred.candidateName}</strong>. Optionally add a reason.
          </DialogDescription>
        </DialogHeader>
        <Input
          placeholder="Reason (optional, shown to candidate)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() =>
              mutate({
                credentialId: cred.id,
                action: "rejected",
                note: note.trim() || undefined,
              })
            }
            disabled={isPending}
          >
            {isPending ? "Rejecting…" : "Reject"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  EmployerCard                                                        */
/* ------------------------------------------------------------------ */

function EmployerCard({
  org,
  onVerify,
  onUnverify,
}: {
  org: EmployerRow;
  onVerify: (org: EmployerRow) => void;
  onUnverify: (org: EmployerRow) => void;
}) {
  const [resendOpen, setResendOpen] = useState(false);
  const dvLabel = DOMAIN_VERIFY_LABELS[org.domainVerifyState] ?? "—";
  const dvTone =
    org.domainVerifyState === "expired"
      ? "crit"
      : org.domainVerifyState === "pending"
        ? "warn"
        : "";

  return (
    <article className="v2-acard v2-verif-org-card" style={{ position: "relative" }}>
      {resendOpen && (
        <ResendEmailDialog
          org={org}
          open={resendOpen}
          onClose={() => setResendOpen(false)}
          onSent={() => setResendOpen(false)}
        />
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="v2-btn v2-btn-ghost v2-btn-sm"
            style={{ position: "absolute", top: 16, right: 16 }}
          >
            Actions
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onVerify(org)}>
            Verify manually
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setResendOpen(true)}>
            Resend domain email
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href={`/admin/organizations#org-${org.id}`}>
              View in Organizations
            </Link>
          </DropdownMenuItem>
          {org.verified ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onUnverify(org)}
              >
                Remove verification
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <header className="v2-verif-org-head">
        {org.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={org.logoUrl}
            alt=""
            className="v2-verif-org-logo"
            width={36}
            height={36}
          />
        ) : null}

        <div className="v2-verif-org-title">
          <h3>{org.name}</h3>
          {org.hq ? <p className="v2-verif-meta">{org.hq}</p> : null}
        </div>

        <span className={`v2-plan-badge ${planBadgeClass(org.planLabel)}`}>
          {org.planLabel}
        </span>
      </header>

      <dl className="v2-verif-org-meta">
        <div>
          <dt>Owner</dt>
          <dd>
            {org.ownerName ?? org.ownerEmail ?? "—"}
            {org.ownerEmail ? (
              <span className="v2-verif-email"> · {org.ownerEmail}</span>
            ) : null}
          </dd>
        </div>
        <div>
          <dt>Domain</dt>
          <dd>{org.domain ?? "—"}</dd>
        </div>
        <div>
          <dt>Domain verify</dt>
          <dd>
            <span className={dvTone ? `v2-verif-tone-${dvTone}` : ""}>
              {dvLabel}
            </span>
            {org.domainVerifyState === "pending" && org.domainVerifyEmailTo ? (
              <span className="v2-verif-email"> → {org.domainVerifyEmailTo}</span>
            ) : null}
            {org.domainVerifyState === "pending" && org.domainVerifyExpiresAt ? (
              <span className="v2-verif-email">
                {" "}
                (expires {formatDate(org.domainVerifyExpiresAt)})
              </span>
            ) : null}
          </dd>
        </div>
        <div>
          <dt>Joined</dt>
          <dd>{formatDate(org.createdAt)}</dd>
        </div>
      </dl>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/*  CredentialCard                                                      */
/* ------------------------------------------------------------------ */

function CredentialCard({
  cred,
  onApprove,
  onReject,
}: {
  cred: CredentialRow;
  onApprove: (cred: CredentialRow) => void;
  onReject: (cred: CredentialRow) => void;
}) {
  const isExpired = cred.expiresAt && new Date(cred.expiresAt) < new Date();

  return (
    <article className="v2-acard v2-verif-cred-card">
      <header className="v2-verif-cred-head">
        <div className="v2-verif-cred-title">
          <span className="v2-verif-cred-type">{cred.typeLabel}</span>
          <h3>{cred.name}</h3>
          <p className="v2-verif-meta">
            {cred.candidateName}
            {cred.candidateEmail ? ` · ${cred.candidateEmail}` : ""}
          </p>
        </div>

        <span
          className={`v2-verif-status-badge ${cred.verificationStatus}`}
        >
          {cred.verificationStatus.charAt(0).toUpperCase() +
            cred.verificationStatus.slice(1)}
        </span>
      </header>

      <dl className="v2-verif-cred-meta">
        {cred.issuer ? (
          <div>
            <dt>Issuer</dt>
            <dd>{cred.issuer}</dd>
          </div>
        ) : null}
        {cred.credentialId ? (
          <div>
            <dt>Credential ID</dt>
            <dd>{cred.credentialId}</dd>
          </div>
        ) : null}
        {cred.issuedAt ? (
          <div>
            <dt>Issued</dt>
            <dd>{formatDate(cred.issuedAt)}</dd>
          </div>
        ) : null}
        {cred.expiresAt ? (
          <div>
            <dt>Expires</dt>
            <dd className={isExpired ? "v2-verif-tone-crit" : ""}>
              {formatDate(cred.expiresAt)}
              {isExpired ? " (expired)" : ""}
            </dd>
          </div>
        ) : null}
        <div>
          <dt>Submitted</dt>
          <dd>{formatDate(cred.createdAt)}</dd>
        </div>
        {cred.verificationNote ? (
          <div className="v2-verif-cred-field-wide">
            <dt>Note</dt>
            <dd>{cred.verificationNote}</dd>
          </div>
        ) : null}
      </dl>

      <footer className="v2-verif-cred-foot">
        {cred.documentUrl ? (
          <a
            href={cred.documentUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="v2-verif-doc-link"
          >
            <ExternalLink size={14} aria-hidden />
            View document
          </a>
        ) : (
          <span className="v2-verif-no-doc">No document uploaded</span>
        )}

        {cred.verificationStatus === "pending" ? (
          <div className="v2-verif-cred-actions">
            <Button
              size="sm"
              variant="outline"
              className="v2-verif-approve-btn"
              onClick={() => onApprove(cred)}
            >
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="v2-verif-reject-btn"
              onClick={() => onReject(cred)}
            >
              Reject
            </Button>
          </div>
        ) : null}
      </footer>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/*  VerificationsClient                                                 */
/* ------------------------------------------------------------------ */

type Props = {
  initialCounts: Counts;
  initialEmployers: EmployerRow[];
  initialCredentials: CredentialRow[];
};

type ActiveTab = "employers" | "credentials";

export function VerificationsClient({
  initialCounts,
  initialEmployers,
  initialCredentials,
}: Props) {
  const [tab, setTab] = useState<ActiveTab>("employers");
  const [credStatusFilter, setCredStatusFilter] =
    useState<CredentialStatus>("pending");

  /* ---- queries ---------------------------------------------------- */
  const { data: counts } = api.admin.verifications.counts.useQuery(undefined, {
    initialData: initialCounts,
  });
  const { data: employers } = api.admin.verifications.employers.useQuery(
    undefined,
    { initialData: initialEmployers },
  );
  const { data: credentials } = api.admin.verifications.credentials.useQuery(
    { status: credStatusFilter },
    { initialData: credStatusFilter === "pending" ? initialCredentials : undefined },
  );

  const utils = api.useUtils();

  /* ---- mutations -------------------------------------------------- */
  const verifyOrg = api.admin.verifications.verifyOrg.useMutation({
    onSuccess: (_, vars) => {
      toast.success("Organization verified.");
      void utils.admin.verifications.employers.invalidate();
      void utils.admin.verifications.counts.invalidate();
      console.log("[admin.verifyOrg]", vars.orgId);
    },
    onError: (err) => toast.error(err.message),
  });

  const unverifyOrg = api.admin.verifications.unverifyOrg.useMutation({
    onSuccess: () => {
      toast.success("Verification removed.");
      void utils.admin.verifications.employers.invalidate();
      void utils.admin.verifications.counts.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const approveCredential = api.admin.verifications.reviewCredential.useMutation({
    onSuccess: () => {
      toast.success("Credential approved.");
      void utils.admin.verifications.credentials.invalidate();
      void utils.admin.verifications.counts.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  /* ---- reject dialog state --------------------------------------- */
  const [rejectTarget, setRejectTarget] = useState<CredentialRow | null>(null);

  /* ---------------------------------------------------------------- */

  const totalPending = (counts?.pendingOrgs ?? 0) + (counts?.pendingCreds ?? 0);

  return (
    <div className="v2-verif-root">
      <Toaster />

      {/* ---- Summary KPI cards ------------------------------------- */}
      <div className="v2-akpi-row v2-akpi-row--four" style={{ marginBottom: 28 }}>
        <div className="v2-akpi">
          <div className="v2-akpi-eye">Employer orgs</div>
          <div className="v2-akpi-num">{counts?.pendingOrgs ?? 0}</div>
          <div className="v2-akpi-meta">
            <span className="v2-akpi-note">pending verification</span>
          </div>
        </div>
        <div className="v2-akpi">
          <div className="v2-akpi-eye">Credential scans</div>
          <div className="v2-akpi-num">{counts?.pendingCreds ?? 0}</div>
          <div className="v2-akpi-meta">
            <span className="v2-akpi-note">pending review</span>
          </div>
        </div>
      </div>

      {/* ---- Tabs -------------------------------------------------- */}
      <div className="v2-verif-tabs" role="tablist">
        <button
          role="tab"
          aria-selected={tab === "employers"}
          className={`v2-verif-tab${tab === "employers" ? " active" : ""}`}
          onClick={() => setTab("employers")}
        >
          Employers
        </button>
        <button
          role="tab"
          aria-selected={tab === "credentials"}
          className={`v2-verif-tab${tab === "credentials" ? " active" : ""}`}
          onClick={() => setTab("credentials")}
        >
          Credentials
        </button>
      </div>

      {/* ---- Employers panel --------------------------------------- */}
      {tab === "employers" ? (
        <section aria-label="Employer verification queue">
          {employers && employers.length > 0 ? (
            <div className="v2-verif-grid">
              {employers.map((org) => (
                <EmployerCard
                  key={org.id}
                  org={org}
                  onVerify={(o) => verifyOrg.mutate({ orgId: o.id })}
                  onUnverify={(o) => unverifyOrg.mutate({ orgId: o.id })}
                />
              ))}
            </div>
          ) : (
            <div className="v2-tbl-empty">
              All employer organizations are verified.
            </div>
          )}
        </section>
      ) : null}

      {/* ---- Credentials panel ------------------------------------- */}
      {tab === "credentials" ? (
        <section aria-label="Credential verification queue">
          <div className="v2-verif-filter-pills" role="group" aria-label="Filter by status">
            {(["pending", "approved", "rejected", "all"] as CredentialStatus[]).map(
              (s) => (
                <button
                  key={s}
                  className={`v2-verif-pill${credStatusFilter === s ? " active" : ""}`}
                  onClick={() => setCredStatusFilter(s)}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ),
            )}
          </div>

          {rejectTarget ? (
            <RejectCredentialDialog
              cred={rejectTarget}
              open={true}
              onClose={() => setRejectTarget(null)}
              onDone={() => setRejectTarget(null)}
            />
          ) : null}

          {credentials && credentials.length > 0 ? (
            <div className="v2-verif-grid">
              {credentials.map((cred) => (
                <CredentialCard
                  key={cred.id}
                  cred={cred}
                  onApprove={(c) =>
                    approveCredential.mutate({
                      credentialId: c.id,
                      action: "approved",
                    })
                  }
                  onReject={(c) => setRejectTarget(c)}
                />
              ))}
            </div>
          ) : (
            <div className="v2-tbl-empty">
              No{" "}
              {credStatusFilter === "all" ? "" : credStatusFilter + " "}
              credentials to review.
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
