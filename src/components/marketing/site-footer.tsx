import Link from "next/link";
import Image from "next/image";
import { Icon, type IconName } from "@/components/shared/icon";

const SOCIAL: { name: string; href: string; icon: IconName }[] = [
  { name: "LinkedIn", href: "https://linkedin.com", icon: "linkedin" },
  { name: "Facebook", href: "https://facebook.com", icon: "facebook" },
  { name: "X", href: "https://x.com", icon: "twitterX" },
  { name: "Instagram", href: "https://instagram.com", icon: "instagram" },
];

const socialCircle: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: "50%",
  border: "1px solid rgba(255,255,255,0.15)",
  display: "grid",
  placeItems: "center",
  color: "white",
};

export function SiteFooter() {
  return (
    <footer className="v2-footer" style={{ marginTop: "auto" }}>
      <div className="v2-container">
        <div className="v2-footer-grid">
          <div>
            <Link
              href="/"
              aria-label="Energized — home"
              style={{
                marginBottom: 20,
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              <Image
                src="/energized-logo-white.svg"
                alt="Energized"
                width={200}
                height={112}
                style={{ height: 56, width: "auto" }}
              />
            </Link>
            <p
              style={{
                color: "var(--v2-ink-300)",
                maxWidth: 320,
                fontSize: 14,
                lineHeight: 1.6,
              }}
            >
              The specialized job network for Canada&rsquo;s energy
              transition — from reservoirs to renewables.
            </p>
            <div style={{ display: "flex", gap: 8, marginTop: 24 }}>
              {SOCIAL.map((s) => (
                <a
                  key={s.name}
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={s.name}
                  style={socialCircle}
                >
                  <Icon name={s.icon} size={16} />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h5>For candidates</h5>
            <Link href="/for-seekers">For job seekers</Link>
            <Link href="/jobs">Browse jobs</Link>
            <Link href="/sign-up">Create profile</Link>
            <Link href="/sign-in">Sign in</Link>
          </div>

          <div>
            <h5>For employers</h5>
            <Link href="/for-employers">Why Energized</Link>
            <Link href="/sign-up?role=employer">Post a job</Link>
            <Link href="/sign-up?role=employer">Search talent</Link>
            <Link href="/for-employers">For employers</Link>
          </div>

          <div>
            <h5>Company</h5>
            <Link href="/about">About</Link>
            <Link href="/faqs">FAQs</Link>
            <Link href="/contact">Contact</Link>
            <a href="mailto:dev@energized.biz">dev@energized.biz</a>
          </div>
        </div>

        <div className="v2-footer-big">
          energ<em>ized</em>.
        </div>

        <div className="v2-footer-bottom">
          <div>© {new Date().getFullYear()} Energized</div>
          <div style={{ display: "flex", gap: 24 }}>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/accessibility">Accessibility</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
