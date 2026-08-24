"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AdminNotificationBell } from "./admin-notification-bell";

const SECTION_TITLES: Record<string, string> = {
  "": "Dashboard",
  verifications: "Verifications",
  support: "Customer support",
  users: "Users",
  organizations: "Organizations",
  jobs: "Job postings",
  trainings: "Trainings",
  placements: "Placements",
  billing: "Billing & plans",
  invoices: "Invoices",
  system: "System health",
  audit: "Audit log",
  settings: "Site settings",
  "profile-settings": "Profile settings",
};

export function AdminTopbar({ env }: { env: string }) {
  const pathname = usePathname() ?? "/admin";
  const seg = pathname.replace(/^\/admin\/?/, "").split("/")[0] ?? "";
  const title = SECTION_TITLES[seg] ?? "Admin";

  return (
    <div className="v2-atop">
      <nav className="v2-atop-crumb" aria-label="Breadcrumb">
        <Link href="/admin" className="v2-atop-crumb-home">
          Energized
        </Link>
        <span className="v2-atop-crumb-sep" aria-hidden>
          /
        </span>
        {seg === "" ? (
          <strong>Admin / {title}</strong>
        ) : (
          <>
            <Link href="/admin" className="v2-atop-crumb-home">
              Admin
            </Link>
            <span className="v2-atop-crumb-sep" aria-hidden>
              /
            </span>
            <strong>{title}</strong>
          </>
        )}
      </nav>
      <div className="v2-atop-spacer" />
      <div className="v2-atop-env">
        <span className="dot" /> {env}
      </div>
      <AdminNotificationBell />
    </div>
  );
}
