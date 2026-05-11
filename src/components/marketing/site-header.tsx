import Link from "next/link";
import Image from "next/image";
import { Icon } from "@/components/shared/icon";
import { getSession } from "@/server/auth";
import { UserMenu } from "./user-menu";
import { NotificationBell } from "./notification-bell";

export type SiteHeaderActive =
  | "home"
  | "jobs"
  | "skill-tests"
  | "trainings"
  | "seekers"
  | "employers"
  | "about"
  | "contact"
  // user-menu pages — no nav highlight, but accepted so callers can pass them
  | "saved"
  | "applications"
  | "dashboard"
  | "profile";

type NavLink = { id: SiteHeaderActive; label: string; href: string };

// Same nav for everyone — saved/applications/dashboard live in the user menu
// dropdown for jobseekers.
const NAV_LINKS: NavLink[] = [
  { id: "home", label: "Home", href: "/" },
  { id: "jobs", label: "Jobs", href: "/jobs" },
  { id: "skill-tests", label: "Skill tests", href: "/skills" },
  { id: "trainings", label: "Trainings", href: "/trainings" },
  { id: "seekers", label: "For job seekers", href: "/for-seekers" },
  { id: "employers", label: "For employers", href: "/for-employers" },
  { id: "about", label: "About", href: "/about" },
];

// Override .v2-nav-link.active so it's a brand-blue pill, distinct from the
// near-black primary "Get started" CTA.
const activeLinkStyle: React.CSSProperties = {
  background: "var(--v2-accent)",
  color: "var(--v2-ink-950)",
};

export async function SiteHeader({ active }: { active?: SiteHeaderActive }) {
  const session = await getSession();
  const user = session?.user ?? null;
  const isEmployer = user?.role === "employer";

  return (
    <header className="v2-nav">
      <div className="v2-container v2-nav-inner">
        <Link
          href="/"
          aria-label="Energized — home"
          style={{ display: "inline-flex", alignItems: "center" }}
        >
          <Image
            src="/energized-logo.svg"
            alt="Energized"
            width={188}
            height={104}
            priority
            style={{ height: 52, width: "auto" }}
          />
        </Link>
        <nav className="v2-nav-links">
          {NAV_LINKS.map((l) => {
            const isActive = active === l.id;
            const hasIcon = l.id === "skill-tests" || l.id === "trainings";
            return (
              <Link
                key={l.id}
                href={l.href}
                className={`v2-nav-link ${isActive ? "active" : ""}`}
                style={
                  hasIcon
                    ? { ...(isActive ? activeLinkStyle : {}), display: "inline-flex", alignItems: "center", gap: 6 }
                    : isActive
                      ? activeLinkStyle
                      : undefined
                }
                aria-current={isActive ? "page" : undefined}
              >
                {hasIcon && (
                  <Icon
                    name={l.id === "skill-tests" ? "sparkles" : "graduationCap"}
                    size={14}
                    color={
                      isActive
                        ? "var(--brand-black, #101820)"
                        : "var(--brand-blue, #1CAAE2)"
                    }
                  />
                )}
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="v2-nav-cta">
          {!user ? (
            <>
              <Link
                href="/sign-in"
                className="v2-btn v2-btn-ghost v2-btn-sm"
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="v2-btn v2-btn-primary v2-btn-sm"
              >
                Get started <Icon name="arrowRight" size={16} />
              </Link>
            </>
          ) : (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
              <NotificationBell />
              <UserMenu
                name={user.name ?? ""}
                email={user.email}
                image={user.image ?? null}
                isEmployer={isEmployer}
              />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
