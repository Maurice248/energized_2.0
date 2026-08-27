import type { ComponentPropsWithoutRef, ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { FooterSocialIcon } from "@/components/shared/footer-social-icon";
import {
  isFooterExternalHref,
  isFooterInternalHref,
  type FooterLink,
} from "@/lib/site-footer";
import { loadSiteFooter } from "@/server/services/site-footer";

function FooterNavLink({
  href,
  children,
  ...rest
}: {
  href: string;
  children: ReactNode;
} & Omit<ComponentPropsWithoutRef<"a">, "href">) {
  if (isFooterInternalHref(href)) {
    return (
      <Link href={href} {...rest}>
        {children}
      </Link>
    );
  }
  return (
    <a
      href={href}
      {...(isFooterExternalHref(href) ? { target: "_blank", rel: "noreferrer" } : {})}
      {...rest}
    >
      {children}
    </a>
  );
}

function sortedLinks(links: FooterLink[]) {
  return [...links].sort((a, b) => a.order - b.order);
}

export async function SiteFooter() {
  const footer = await loadSiteFooter();
  const year = new Date().getFullYear();
  const social = [...footer.social].sort((a, b) => a.order - b.order);
  const columns = [...footer.columns].sort((a, b) => a.order - b.order);

  return (
    <footer className="v2-footer" style={{ marginTop: "auto" }}>
      <div className="v2-container">
        <div className="v2-footer-grid">
          <div>
            <Link
              href="/"
              aria-label={`${footer.copyrightName} — home`}
              style={{
                marginBottom: 20,
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              <Image
                src="/energized-logo-white.svg"
                alt={footer.copyrightName}
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
              {footer.tagline}
            </p>
            {social.length > 0 ? (
              <div className="v2-footer-social">
                {social.map((item) => (
                  <FooterNavLink
                    key={item.id}
                    href={item.href}
                    aria-label={item.name}
                  >
                    <FooterSocialIcon name={item.icon} size={16} />
                  </FooterNavLink>
                ))}
              </div>
            ) : null}
          </div>

          {columns.map((column) => (
            <div key={column.id}>
              <h5>{column.title}</h5>
              {sortedLinks(column.links).map((link) => (
                <FooterNavLink key={link.id} href={link.href}>
                  {link.label}
                </FooterNavLink>
              ))}
            </div>
          ))}
        </div>

        <div className="v2-footer-big">
          {footer.wordmarkBefore}
          {footer.wordmarkAccent ? <em>{footer.wordmarkAccent}</em> : null}
          {footer.wordmarkAfter}
        </div>

        <div className="v2-footer-bottom">
          <div>
            © {year} {footer.copyrightName}
          </div>
          <div style={{ display: "flex", gap: 24 }}>
            {sortedLinks(footer.legalLinks).map((link) => (
              <FooterNavLink key={link.id} href={link.href}>
                {link.label}
              </FooterNavLink>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
