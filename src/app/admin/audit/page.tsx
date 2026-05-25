import Link from "next/link";
import { Icon } from "@/components/shared/icon";
import { SectionCard } from "../_components/section-card";
import { AdminAuditClient } from "./admin-audit-client";

export const metadata = { title: "Audit log · Admin · Energized" };

export const dynamic = "force-dynamic";

export default function AuditPage() {
  return (
    <>
      <header className="v2-ahead" style={{ gridTemplateColumns: "1fr" }}>
        <div>
          <span className="v2-eyebrow">Compliance</span>
          <h1>
            Platform <em>audit log.</em>
          </h1>
          <p className="v2-ahead-sub" style={{ maxWidth: "none" }}>
            Immutable entries for high-impact Energized operations — marketing/CMS edits, employer verification and domain mail, candidate credential reviews (tickets tied to Canadian energy hiring), nightly employer MRR snapshots from Trigger.dev, and staff-provisioned accounts. Use filters for investigations; CSV export supports external auditors.
          </p>
        </div>
      </header>

      <div className="v2-supp-metrics" style={{ marginTop: 16 }}>
        <div className="v2-supp-metric">
          <span className="v2-supp-metric-k">CMS &amp; surfaces</span>
          <span className="v2-supp-metric-v">page.*</span>
          <span className="v2-supp-metric-meta">
            <Link href="/admin/pages" className="v2-acard-link">
              Marketing &amp; app heroes <Icon name="chevronRight" size={12} />
            </Link>
          </span>
        </div>
        <div className="v2-supp-metric">
          <span className="v2-supp-metric-k">Trust &amp; safety</span>
          <span className="v2-supp-metric-v">admin.*</span>
          <span className="v2-supp-metric-meta">
            <Link href="/admin/verifications" className="v2-acard-link">
              Orgs &amp; credentials <Icon name="chevronRight" size={12} />
            </Link>
          </span>
        </div>
        <div className="v2-supp-metric">
          <span className="v2-supp-metric-k">Access control</span>
          <span className="v2-supp-metric-v">user.*</span>
          <span className="v2-supp-metric-meta">
            <Link href="/admin/users" className="v2-acard-link">
              Provisioned roles <Icon name="chevronRight" size={12} />
            </Link>
          </span>
        </div>
        <div className="v2-supp-metric v2-supp-metric-note">
          <span className="v2-supp-metric-k">Billing signal</span>
          <span className="v2-supp-metric-v">revenue.snapshot</span>
          <span className="v2-supp-metric-meta">
            Trigger task ties MRR to active employer orgs
          </span>
        </div>
      </div>

      <div className="v2-agrid" style={{ marginTop: 12 }}>
        <SectionCard
          title={
            <>
              Scope &amp; <em>retention.</em>
            </>
          }
        >
          <p className="v2-supp-aside-lede" style={{ marginTop: 0 }}>
            Rows append-only at write time — Energized admins cannot rewrite history from this console.
            Pair exports with deployment logs (Vercel), database backups (Neon), and Trigger.dev run history
            when you package evidence for customers or regulators.
          </p>
          <ul
            style={{
              margin: "14px 0 0",
              paddingLeft: 20,
              fontSize: 14,
              lineHeight: 1.65,
              color: "var(--v2-ink-700)",
            }}
          >
            <li>
              <strong>CMS</strong> —{" "}
              <code>page.created</code>, <code>page.updated</code>, <code>page.deleted</code>,{" "}
              <code>page.seeded</code>: controlled copy on marketing routes and logged-in surfaces candidates
              &amp; employers see daily.
            </li>
            <li>
              <strong>Employer org</strong> — <code>admin.org.*</code>: verified badge toggles and domain
              confirmation resends that gate trustworthy hiring brands on the board.
            </li>
            <li>
              <strong>Credentials</strong> — <code>admin.credential.approved</code> /{" "}
              <code>admin.credential.rejected</code>: moderator decisions on certifications &amp; tickets that
              power candidate trust signals in search.
            </li>
            <li>
              <strong>Accounts</strong> — <code>user.create.admin</code>, <code>user.promote.admin</code>:
              staff-created users and emergency promotions into this admin shell.
            </li>
            <li>
              <strong>
                <code>revenue.snapshot</code>
              </strong>{" "}
              — automated roll-up aligned with employer subscription health shown on the overview dashboard.
            </li>
          </ul>
        </SectionCard>
      </div>

      <div style={{ marginTop: 16 }}>
        <AdminAuditClient />
      </div>
    </>
  );
}
