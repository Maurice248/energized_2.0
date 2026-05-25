import { redirect } from "next/navigation";
import { type ReactNode } from "react";
import { getSession } from "@/server/auth";
import { api } from "@/lib/trpc/server";
import { env } from "@/env";
import { AdminSidebar, type AdminSidebarCounts } from "./_components/admin-sidebar";
import { AdminTopbar } from "./_components/admin-topbar";

export const metadata = {
  title: "Admin · Energized",
};

function initialsOf(name: string | null | undefined): string {
  if (!name) return "EA";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

function detectEnvLabel(): string {
  if (process.env.NODE_ENV === "production") {
    if (env.NEXT_PUBLIC_APP_URL.includes("staging")) return "staging";
    return "production";
  }
  return "development";
}

async function getSidebarCounts(): Promise<AdminSidebarCounts> {
  try {
    const [ticketSummary, verifCounts, invoicesAttention] = await Promise.all([
      api.admin.tickets.list({ status: "open", limit: 1 }),
      api.admin.verifications.counts(),
      api.admin.invoices.attentionCount(),
    ]);
    return {
      verifications: verifCounts.pendingOrgs + verifCounts.pendingCreds,
      tickets: ticketSummary.openTotal,
      invoices: invoicesAttention,
    };
  } catch {
    return {
      verifications: 0,
      tickets: 0,
      invoices: 0,
    };
  }
}

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) {
    redirect("/sign-in?callbackURL=%2Fadmin");
  }
  if (session.user.role !== "admin") {
    redirect("/dashboard");
  }

  const counts = await getSidebarCounts();
  const envLabel = detectEnvLabel();

  return (
    <div className="v2-admin">
      <AdminSidebar
        user={{
          name: session.user.name || session.user.email,
          initials: initialsOf(session.user.name),
          role: "Platform admin",
        }}
        counts={counts}
      />
      <main className="v2-amain">
        <AdminTopbar env={envLabel} />
        {children}
      </main>
    </div>
  );
}
