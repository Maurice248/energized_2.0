import Link from "next/link";
import Image from "next/image";
import { Icon } from "@/components/shared/icon";
import { getSession } from "@/server/auth";
import { UserMenu } from "./user-menu";

export type SiteHeaderActive =
  | "home"
  | "jobs"
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
  { id: "employers", label: "For employers", href: "/sign-up?role=employer" },
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
            return (
              <Link
                key={l.id}
                href={l.href}
                className={`v2-nav-link ${isActive ? "active" : ""}`}
                style={isActive ? activeLinkStyle : undefined}
                aria-current={isActive ? "page" : undefined}
              >
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
            <UserMenu
              name={user.name ?? ""}
              email={user.email}
              image={user.image ?? null}
              isEmployer={isEmployer}
            />
          )}
        </div>
      </div>
    </header>
  );
}
