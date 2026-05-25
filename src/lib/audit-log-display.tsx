import type { ReactNode } from "react";
import type { IconName } from "@/components/shared/icon";

export type AuditLogFeedEntry = {
  id: string;
  action: string;
  actor: string;
  entityType: string | null;
  entityId: string | null;
  meta: Record<string, unknown>;
  at: Date;
};

export type AuditToneClass = "accent" | "dark" | "coral" | "sky" | "lilac" | "";

export function classifyAuditAction(action: string): {
  icon: IconName;
  tone: AuditToneClass;
} {
  if (action.startsWith("mod.approve")) return { icon: "check", tone: "accent" };
  if (action.startsWith("mod.reject")) return { icon: "x", tone: "coral" };
  if (action.startsWith("mod.escalate")) return { icon: "shield", tone: "coral" };
  if (action.startsWith("revenue.snapshot") || action.startsWith("billing.snapshot")) {
    return { icon: "dollar", tone: "dark" };
  }
  if (action.startsWith("billing")) return { icon: "dollar", tone: "dark" };
  if (action.startsWith("page.")) return { icon: "fileText", tone: "sky" };
  if (action.startsWith("admin.credential")) {
    return action.endsWith(".rejected")
      ? { icon: "x", tone: "coral" }
      : { icon: "check", tone: "accent" };
  }
  if (action.startsWith("admin.org")) return { icon: "building", tone: "lilac" };
  if (action.startsWith("user")) return { icon: "user", tone: "lilac" };
  if (action.startsWith("job")) return { icon: "briefcase", tone: "sky" };
  if (action.startsWith("employer")) return { icon: "building", tone: "lilac" };
  return { icon: "circle", tone: "" };
}

export function formatAuditAgo(d: Date): string {
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function formatAuditAbsolute(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

export function renderAuditDescription(entry: AuditLogFeedEntry): ReactNode {
  const meta = entry.meta;

  switch (entry.action) {
    case "mod.approve":
      return (
        <>
          <strong>{entry.actor}</strong> approved {String(meta.kind ?? "item")} flagged as{" "}
          {String(meta.severity ?? "low")}
        </>
      );
    case "mod.reject":
      return (
        <>
          <strong>{entry.actor}</strong> rejected {String(meta.kind ?? "item")} flagged as{" "}
          {String(meta.severity ?? "low")}
        </>
      );
    case "mod.escalate":
      return (
        <>
          <strong>{entry.actor}</strong> escalated a {String(meta.kind ?? "item")} report
        </>
      );
    case "billing.snapshot":
    case "revenue.snapshot": {
      const mrr = Number(meta.mrrCents ?? 0) / 100;
      const orgs = meta.activeOrgCount ?? meta.activeOrgs ?? 0;
      return (
        <>
          Revenue snapshot — MRR <code>${mrr.toLocaleString("en-CA")}</code>,{" "}
          <strong>{String(orgs)}</strong> active orgs (employer subscriptions)
        </>
      );
    }
    case "page.created":
      return (
        <>
          <strong>{entry.actor}</strong> created CMS page{" "}
          <code>{String(meta.slug ?? "—")}</code>
          {meta.title ? <> · {String(meta.title)}</> : null}
        </>
      );
    case "page.updated":
      return (
        <>
          <strong>{entry.actor}</strong> updated CMS page{" "}
          <code>{String(meta.slug ?? "—")}</code>
          {Array.isArray(meta.changedFields) ? (
            <> · {meta.changedFields.length} field(s)</>
          ) : null}
        </>
      );
    case "page.deleted":
      return (
        <>
          <strong>{entry.actor}</strong> deleted CMS page{" "}
          <code>{String(meta.slug ?? "—")}</code>
          {meta.title ? <> ({String(meta.title)})</> : null}
        </>
      );
    case "page.seeded": {
      const slugs = meta.slugs;
      const n = Array.isArray(slugs) ? slugs.length : 0;
      return (
        <>
          <strong>{entry.actor}</strong> seeded <strong>{n}</strong> system/marketing routes (jobs,
          trainings, skills surfaces)
        </>
      );
    }
    case "user.create.admin":
      return (
        <>
          <strong>{entry.actor}</strong> provisioned account{" "}
          <code>{String(meta.email ?? "")}</code> as <strong>{String(meta.role ?? "")}</strong>
        </>
      );
    case "user.promote.admin":
      return (
        <>
          <strong>{entry.actor}</strong> promoted <code>{String(meta.email ?? "")}</code> to{" "}
          <strong>admin</strong> (shell access to this console)
        </>
      );
    case "admin.org.verify":
      return (
        <>
          <strong>{entry.actor}</strong> verified employer org{" "}
          <strong>{String(meta.orgName ?? "company")}</strong>
        </>
      );
    case "admin.org.unverify":
      return (
        <>
          <strong>{entry.actor}</strong> removed verification badge from{" "}
          <strong>{String(meta.orgName ?? "company")}</strong>
        </>
      );
    case "admin.org.resend_domain_email":
      return (
        <>
          <strong>{entry.actor}</strong> resent domain confirmation to{" "}
          <code>{String(meta.to ?? "")}</code> for <strong>{String(meta.orgName ?? "")}</strong>
        </>
      );
    case "admin.credential.approved":
      return (
        <>
          <strong>{entry.actor}</strong> approved credential{" "}
          <strong>{String(meta.certName ?? "ticket")}</strong>
          {meta.note ? <> · note on file</> : null}
        </>
      );
    case "admin.credential.rejected":
      return (
        <>
          <strong>{entry.actor}</strong> rejected credential{" "}
          <strong>{String(meta.certName ?? "ticket")}</strong>
          {meta.note ? <> · reviewer note</> : null}
        </>
      );
    default:
      return (
        <>
          <strong>{entry.actor}</strong>{" "}
          <span style={{ fontFamily: "var(--v2-font-mono)" }}>{entry.action}</span>
          {entry.entityType ? (
            <>
              {" "}
              · <span style={{ textTransform: "uppercase" }}>{entry.entityType}</span>
            </>
          ) : null}
          {entry.entityId ? (
            <>
              {" "}
              <code>
                {entry.entityId.length > 12
                  ? `${entry.entityId.slice(0, 10)}…`
                  : entry.entityId}
              </code>
            </>
          ) : null}
        </>
      );
  }
}
