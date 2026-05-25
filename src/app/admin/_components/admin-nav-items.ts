import type { IconName } from "@/components/shared/icon";

export type AdminSidebarCounts = {
  verifications: number;
  tickets: number;
  invoices: number;
};

export type AdminNavLink = {
  id: string;
  section: string;
  label: string;
  icon: IconName;
  href: string;
  keywords?: string[];
  count?: number | null;
  alert?: boolean;
  accent?: boolean;
};

export function getAdminNavLinks(counts: AdminSidebarCounts): AdminNavLink[] {
  return [
    {
      id: "overview",
      section: "Operate",
      label: "Dashboard",
      icon: "trendingUp",
      href: "/admin",
      keywords: ["home", "overview", "metrics"],
    },
    {
      id: "verify",
      section: "Operate",
      label: "Verifications",
      icon: "checkCircle",
      href: "/admin/verifications",
      keywords: ["credentials", "employers", "pending"],
      count: counts.verifications,
    },
    {
      id: "support",
      section: "Operate",
      label: "Customer support",
      icon: "message",
      href: "/admin/support",
      keywords: ["tickets", "inbox", "help"],
      count: counts.tickets,
    },
    {
      id: "users",
      section: "Manage",
      label: "Users",
      icon: "users",
      href: "/admin/users",
      keywords: ["accounts", "jobseekers", "employers"],
    },
    {
      id: "organizations",
      section: "Manage",
      label: "Organizations",
      icon: "building",
      href: "/admin/organizations",
      keywords: ["companies", "employers", "orgs"],
    },
    {
      id: "jobs",
      section: "Manage",
      label: "Job postings",
      icon: "briefcase",
      href: "/admin/jobs",
      keywords: ["listings", "roles", "careers"],
    },
    {
      id: "trainings",
      section: "Manage",
      label: "Trainings",
      icon: "graduationCap",
      href: "/admin/trainings",
      keywords: ["courses", "learning"],
    },
    {
      id: "pages",
      section: "Manage",
      label: "Pages",
      icon: "fileText",
      href: "/admin/pages",
      keywords: ["cms", "content", "marketing"],
    },
    {
      id: "teams",
      section: "Manage",
      label: "Team",
      icon: "user",
      href: "/admin/teams",
      keywords: ["staff", "admins", "invite"],
    },
    {
      id: "faqs",
      section: "Manage",
      label: "FAQs",
      icon: "bookOpen",
      href: "/admin/faqs",
      keywords: ["questions", "help"],
    },
    {
      id: "billing",
      section: "Revenue",
      label: "Billing & plans",
      icon: "dollar",
      href: "/admin/billing",
      keywords: ["subscriptions", "stripe", "mrr", "plans"],
    },
    {
      id: "invoices",
      section: "Revenue",
      label: "Invoices",
      icon: "fileText",
      href: "/admin/invoices",
      keywords: ["collections", "payments", "stripe"],
      count: counts.invoices,
      accent: counts.invoices > 0,
    },
    {
      id: "system",
      section: "Platform",
      label: "System health",
      icon: "zap",
      href: "/admin/system",
      keywords: ["status", "uptime", "integrations"],
    },
    {
      id: "audit",
      section: "Platform",
      label: "Audit log",
      icon: "lock",
      href: "/admin/audit",
      keywords: ["history", "security", "compliance"],
    },
    {
      id: "settings",
      section: "Platform",
      label: "Site settings",
      icon: "settings",
      href: "/admin/settings",
      keywords: ["platform", "configuration", "general"],
    },
    {
      id: "profile-settings",
      section: "Platform",
      label: "Profile settings",
      icon: "user",
      href: "/admin/profile-settings",
      keywords: ["account", "avatar", "notifications"],
    },
  ];
}

export function filterAdminNavLinks(links: AdminNavLink[], query: string): AdminNavLink[] {
  const q = query.trim().toLowerCase();
  if (!q) return links;

  return links.filter((link) => {
    const haystack = [link.label, link.section, ...(link.keywords ?? [])]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function groupAdminNavLinks(links: AdminNavLink[]): Array<{ section: string; links: AdminNavLink[] }> {
  const groups: Array<{ section: string; links: AdminNavLink[] }> = [];

  for (const link of links) {
    const last = groups[groups.length - 1];
    if (last?.section === link.section) {
      last.links.push(link);
    } else {
      groups.push({ section: link.section, links: [link] });
    }
  }

  return groups;
}
