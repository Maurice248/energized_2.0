import Link from "next/link";
import { Icon } from "@/components/shared/icon";

type Row = {
  id: string;
  name: string;
  meta: string;
  initials: string;
  color: string | null;
  logoUrl: string | null;
  plan: string;
  planLabel: string;
  use: number;
  useTxt: string;
  useTone: string;
  mrr: string;
  status: "good" | "warn" | "crit" | "idle" | string;
  statusLabel: string;
};

export function EmployersTable({ rows }: { rows: Row[] }) {
  if (rows.length === 0) {
    return (
      <div className="v2-tbl-empty">
        No employer organizations to surface yet. Once tenants subscribe, the
        leaderboard will populate automatically.
      </div>
    );
  }

  return (
    <div className="v2-tbl">
      <div className="v2-tbl-th">
        <span>Company</span>
        <span>Plan</span>
        <span>Usage</span>
        <span style={{ textAlign: "right" }}>MRR</span>
        <span>Status</span>
        <span />
      </div>
      {rows.map((r) => (
        <Link
          key={r.id}
          href={`/admin/organizations#org-${r.id}`}
          className="v2-tbl-row"
        >
          <div className="v2-tbl-co">
            <div
              className="v2-tbl-logo"
              style={{ background: r.color ?? "#1CAAE2" }}
            >
              {r.initials}
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="v2-tbl-name">{r.name}</div>
              <div className="v2-tbl-co-meta">{r.meta}</div>
            </div>
          </div>
          <span className={`v2-tbl-plan ${r.plan}`}>{r.planLabel}</span>
          <div className="v2-tbl-usage">
            <div className="v2-tbl-usage-bar">
              <div
                className={`v2-tbl-usage-fill ${r.useTone}`}
                style={{ width: `${r.use}%` }}
              />
            </div>
            <div className="v2-tbl-usage-txt">{r.useTxt}</div>
          </div>
          <div className="v2-tbl-mrr">{r.mrr}</div>
          <span className={`v2-tbl-status ${r.status === "good" ? "" : r.status}`}>
            {r.statusLabel}
          </span>
          <div className="v2-tbl-arrow">
            <Icon name="chevronRight" size={14} />
          </div>
        </Link>
      ))}
    </div>
  );
}
