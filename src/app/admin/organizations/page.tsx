import type { inferRouterOutputs } from "@trpc/server";
import { ChevronDown } from "lucide-react";
import type { AppRouter } from "@/server/api/root";
import { api } from "@/lib/trpc/server";
import { cn } from "@/lib/utils";

export const metadata = { title: "Organizations · Admin · Energized" };

type OrgListItem =
  inferRouterOutputs<AppRouter>["admin"]["organizations"]["list"][number];

function formatSeatRole(role: string): string {
  const labels: Record<string, string> = {
    owner: "Owner",
    admin: "Admin",
    recruiter: "Recruiter",
    hiring_manager: "Hiring manager",
    viewer: "Viewer",
  };
  return labels[role] ?? role.replace(/_/g, " ");
}

function sentenceCaseEnum(s: string): string {
  return s
    .split("_")
    .map((part) =>
      part.length ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : "",
    )
    .join(" ");
}

function formatSector(key: string | null): string | null {
  if (!key) return null;
  const map: Record<string, string> = {
    oil_gas: "Oil & gas",
    renewables: "Renewables",
    nuclear: "Nuclear",
    utilities: "Utilities",
    hydrogen: "Hydrogen",
    power: "Power",
    other: "Other",
  };
  return map[key] ?? sentenceCaseEnum(key);
}

function formatCompanySize(size: OrgListItem["size"]): string | null {
  if (!size) return null;
  const map: Record<string, string> = {
    "1_10": "1–10",
    "11_50": "11–50",
    "51_120": "51–120",
    "120_250": "120–250",
    "250_500": "250–500",
    "500_1000": "500–1000",
    "1000_plus": "1000+",
  };
  return map[size] ?? size;
}

function formatWorkSetup(w: OrgListItem["defaultWorkSetup"]): string | null {
  if (!w) return null;
  const map: Record<string, string> = {
    onsite: "On-site preferred",
    hybrid_preferred: "Hybrid preferred",
    remote_ok: "Remote OK",
    flexible: "Flexible",
  };
  return map[w] ?? sentenceCaseEnum(w);
}

function formatHiringPace(p: OrgListItem["hiringPace"]): string | null {
  if (!p) return null;
  const map: Record<string, string> = {
    passive: "Passive",
    when_right: "When the fit is right",
    actively_hiring: "Actively hiring",
    scaling_fast: "Scaling fast",
  };
  return map[p] ?? sentenceCaseEnum(p);
}

function formatSubscriptionStatus(status: OrgListItem["subscriptionStatus"]): string {
  return sentenceCaseEnum(status).replace(/\s+/g, " ");
}

function formatDate(d: Date | null): string | null {
  if (!d) return null;
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(d));
}

function hrefWebsite(raw: string | null): string | null {
  if (!raw?.trim()) return null;
  const t = raw.trim();
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}

function MemberLine(props: {
  displayName: string;
  email: string;
  role: string;
  status: string;
}) {
  const statusMuted = props.status !== "active";

  return (
    <div className="v2-org-member">
      <div className="v2-org-member-main">
        <span className="v2-org-member-name">{props.displayName}</span>
        <span className="v2-org-member-email">{props.email}</span>
      </div>
      <div className="v2-org-member-meta">
        <span>{formatSeatRole(props.role)}</span>
        {statusMuted ? (
          <span className="v2-org-member-status">{props.status}</span>
        ) : null}
      </div>
    </div>
  );
}

function DetailItem({
  label,
  children,
  fullWidth,
}: {
  label: string;
  children: React.ReactNode;
  fullWidth?: boolean;
}) {
  return (
    <div className={cn("v2-org-field", fullWidth && "v2-org-field-wide")}>
      <div className="v2-org-dl-label">{label}</div>
      <div className="v2-org-dl-val">{children}</div>
    </div>
  );
}

const ABOUT_TRUNC = 400;

function OrganizationDetails({ org }: { org: OrgListItem }) {
  const websiteHref = hrefWebsite(org.website);
  const sectorParts: string[] = [];
  const primary = formatSector(org.primarySector);
  if (primary) sectorParts.push(primary);
  for (const s of org.subSectors ?? []) {
    sectorParts.push(sentenceCaseEnum(s));
  }
  const sectorLine = [...new Set(sectorParts)].join(" · ");

  const focusJoined =
    org.focusRoles?.length > 0
      ? org.focusRoles.map((r) => sentenceCaseEnum(r)).join(", ")
      : null;

  const aboutText = org.about?.trim() ?? "";
  const aboutTruncated =
    aboutText.length > ABOUT_TRUNC ? `${aboutText.slice(0, ABOUT_TRUNC)}…` : aboutText;

  return (
    <details className="v2-org-details-disclosure v2-org-details--in-head">
      <summary className="v2-org-details-summary">
        <span className="v2-org-section-label" id={`org-details-${org.id}`}>
          Organization details
        </span>
        <ChevronDown className="v2-org-details-chevron-icon" aria-hidden />
      </summary>
      <div className="v2-org-details-panel">
        <div className="v2-org-fields">
          <DetailItem label="Billing plan">{org.planLabel}</DetailItem>
          <DetailItem label="Subscription">
            {formatSubscriptionStatus(org.subscriptionStatus)}
          </DetailItem>
          {org.cancelAtPeriodEnd ? (
            <DetailItem label="Cancellation">Ends after current period</DetailItem>
          ) : null}
          <DetailItem label="Renewal">{formatDate(org.planRenewsAt) ?? "—"}</DetailItem>
          <DetailItem label="Period start">
            {formatDate(org.currentPeriodStart) ?? "—"}
          </DetailItem>

          <DetailItem label="Domain">{org.domain?.trim() || "—"}</DetailItem>
          <DetailItem label="Website">
            {websiteHref ? (
              <a href={websiteHref} target="_blank" rel="noreferrer noopener">
                {org.website?.replace(/^https?:\/\//i, "") ?? org.website}
              </a>
            ) : (
              "—"
            )}
          </DetailItem>

          <DetailItem label="Headquarters">{org.hq?.trim() || "—"}</DetailItem>
          <DetailItem label="Founded">{org.founded?.trim() || "—"}</DetailItem>
          <DetailItem label="Company size">{formatCompanySize(org.size) ?? "—"}</DetailItem>

          <DetailItem label="Sectors">{sectorLine || "—"}</DetailItem>
          <DetailItem label="Default work setup">
            {formatWorkSetup(org.defaultWorkSetup) ?? "—"}
          </DetailItem>
          <DetailItem label="Hiring pace">{formatHiringPace(org.hiringPace) ?? "—"}</DetailItem>

          <DetailItem label="Focus roles" fullWidth>
            {focusJoined ?? "—"}
          </DetailItem>

          {org.tagline?.trim() ? (
            <DetailItem label="Tagline" fullWidth>
              <em>{org.tagline.trim()}</em>
            </DetailItem>
          ) : null}

          <DetailItem label="Stripe customer">{org.stripeCustomerMasked ?? "—"}</DetailItem>
          <DetailItem label="Stripe subscription">{org.stripeSubscriptionMasked ?? "—"}</DetailItem>

          <DetailItem label="Joined">{formatDate(org.createdAt)}</DetailItem>
          <DetailItem label="Updated">{formatDate(org.updatedAt)}</DetailItem>
          <DetailItem label="Verified">{formatDate(org.verifiedAt)}</DetailItem>

          {org.domainVerifyEmailTo?.trim() ? (
            <>
              <DetailItem label="Domain verify email">{org.domainVerifyEmailTo.trim()}</DetailItem>
              <DetailItem label="Domain verify expires">
                {formatDate(org.domainVerifyExpiresAt)}
              </DetailItem>
            </>
          ) : null}

          {aboutTruncated ? (
            <DetailItem label="About" fullWidth>
              <p className="v2-org-about">{aboutTruncated}</p>
            </DetailItem>
          ) : null}
        </div>
      </div>
    </details>
  );
}

export default async function OrganizationsPage() {
  const orgs = await api.admin.organizations.list();

  return (
    <div>
      <header className="v2-ahead" style={{ gridTemplateColumns: "1fr" }}>
        <div>
          <span className="v2-eyebrow">Tenant directory</span>
          <h1>
            Employer <em>organizations.</em>
          </h1>
          <p className="v2-ahead-sub" style={{ maxWidth: "none" }}>
            Every company tenant on Energized, with the employer contact and seats on their team.
          </p>
        </div>
      </header>

      {orgs.length === 0 ? (
        <div className="v2-tbl-empty">No employer organizations yet.</div>
      ) : (
        <div className="v2-org-grid">
          {orgs.map((org) => (
            <article
              key={org.id}
              id={`org-${org.id}`}
              className="v2-acard v2-org-card"
              aria-labelledby={`org-title-${org.id}`}
            >
              <header className="v2-org-card-head v2-org-card-head-grid">
                <div className="v2-org-card-title-row">
                  {org.logoUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={org.logoUrl}
                      alt=""
                      className="v2-org-thumb"
                      width={40}
                      height={40}
                    />
                  ) : null}
                  <h2 className="v2-org-co-name" id={`org-title-${org.id}`}>
                    {org.name}
                  </h2>
                </div>
                <OrganizationDetails org={org} />
                <div className="v2-org-card-badge-slot">
                  {org.verified ? (
                    <span className="v2-org-badge">Verified</span>
                  ) : (
                    <span className="v2-org-badge v2-org-badge-pending">Pending</span>
                  )}
                </div>
              </header>

              {org.employerRows.length === 0 ? (
                <p className="v2-org-empty-block">No seats linked yet.</p>
              ) : (
                <section className="v2-org-section" aria-label="Employer">
                  <h3 className="v2-org-section-label">Employer</h3>
                  <div className="v2-org-member-stack">
                    {org.employerRows.map((m) => (
                      <MemberLine
                        key={m.id}
                        displayName={m.displayName}
                        email={m.email}
                        role={m.role}
                        status={m.status}
                      />
                    ))}
                  </div>
                </section>
              )}

              {org.teamRows.length > 0 ? (
                <section className="v2-org-section" aria-label="People">
                  <h3 className="v2-org-section-label">People</h3>
                  <div className="v2-org-member-stack">
                    {org.teamRows.map((m) => (
                      <MemberLine
                        key={m.id}
                        displayName={m.displayName}
                        email={m.email}
                        role={m.role}
                        status={m.status}
                      />
                    ))}
                  </div>
                </section>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
