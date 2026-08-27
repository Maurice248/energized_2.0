import type { ReactNode, SVGProps } from "react";
import type { FooterSocialIcon as FooterSocialIconId } from "@/lib/site-footer";

function BrandSvg({
  children,
  size = 16,
  className,
}: {
  children: ReactNode;
  size?: number;
  className?: string;
} & Pick<SVGProps<SVGSVGElement>, "className">) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
      style={{ flexShrink: 0 }}
    >
      {children}
    </svg>
  );
}

const PATHS: Record<FooterSocialIconId, ReactNode> = {
  linkedin: (
    <>
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </>
  ),
  facebook: <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />,
  twitterX: <path d="M4 4l16 16M20 4 4 20" />,
  instagram: (
    <>
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <path d="M16 11.37a4 4 0 1 1-7.914 1.123 4 4 0 0 1 7.914-1.123z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </>
  ),
  youtube: (
    <>
      <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
      <path d="m10 15 5-3-5-3z" />
    </>
  ),
  tiktok: (
    <>
      <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
    </>
  ),
  threads: (
    <>
      <path d="M19 7.5c-1.5-2.5-5-3-7.5-1.5S8 11 9.5 14s5 4 7.5 2.5" />
      <path d="M12 12c2 0 3.5 1 3.5 2.5S14 17 12 17s-3.5-1-3.5-2.5S10 12 12 12Z" />
    </>
  ),
  bluesky: (
    <>
      <path d="M17.5 19.5c-1.8 1.3-4.2 1.3-6 0-1.8-1.3-2.5-3.4-1.8-5.3.7-1.9 2.6-3.2 4.8-3.2s4.1 1.3 4.8 3.2c.7 1.9 0 4-1.8 5.3Z" />
      <path d="M6.5 8.5C8 6.2 11 5.5 13.5 7S17 12 15.5 15" />
    </>
  ),
  whatsapp: (
    <>
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z" />
      <path d="M9 10c.2 2 2 4 4 4.5" />
    </>
  ),
  telegram: (
    <>
      <path d="m22 2-7 20-4-9-9-4z" />
      <path d="M22 2 11 13" />
    </>
  ),
  discord: (
    <>
      <circle cx="9" cy="12" r="1" />
      <circle cx="15" cy="12" r="1" />
      <path d="M5.5 16c.8 1.5 2.5 3 6.5 3s5.7-1.5 6.5-3" />
      <path d="M7 8.5C8 6 10 5 12 5s4 1 5 3.5" />
      <path d="M5 9.5 3.5 6M19 9.5 20.5 6" />
    </>
  ),
  snapchat: (
    <>
      <path d="M12 3c3.5 0 6 2.4 6 6.2 0 2.2-.6 3.3.6 4.3 1 .8-.2 1.7-1.3 1.5-1.2-.3-1.7.4-1.7 1.2 0 1.3-1.5 2.3-3.6 2.3s-3.6-1-3.6-2.3c0-.8-.5-1.5-1.7-1.2-1.1.2-2.3-.7-1.3-1.5 1.2-1 .6-2.1.6-4.3C6 5.4 8.5 3 12 3Z" />
    </>
  ),
  pinterest: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M8 11c0 3 2 7 4 7 1.2 0 2-1 2-2.4 0-2.2-1.4-3.2-2.8-4.2" />
      <path d="M11 7.5c2.5 0 4 1.3 4 3.4 0 2.2-1.4 3.4-3 3.4" />
    </>
  ),
  reddit: (
    <>
      <circle cx="12" cy="14" r="6" />
      <circle cx="10" cy="13.5" r=".8" fill="currentColor" />
      <circle cx="14" cy="13.5" r=".8" fill="currentColor" />
      <path d="M12 8V6.5M16 8.5a1.5 1.5 0 1 0-2.8-.9" />
      <path d="M9 16.2c.8.6 1.8.9 3 .9s2.2-.3 3-.9" />
    </>
  ),
  github: (
    <>
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </>
  ),
  gitlab: (
    <>
      <path d="m22 14-1.5-8-4 7H7.5l-4-7L2 14l10 7z" />
      <path d="m7.5 13 4.5-9 4.5 9" />
    </>
  ),
  twitch: (
    <>
      <path d="M5.5 3 3 6.5v11h4V22l3.5-3.5H15L21 13V3Z" />
      <path d="M11 7.5v5M16 7.5v5" />
    </>
  ),
  slack: (
    <>
      <rect x="3" y="9" width="6" height="3" rx="1.5" />
      <rect x="15" y="12" width="6" height="3" rx="1.5" />
      <rect x="9" y="3" width="3" height="6" rx="1.5" />
      <rect x="12" y="15" width="3" height="6" rx="1.5" />
    </>
  ),
  spotify: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M8 10c2.5-1 5.5-1 8 0M8 13c2-.7 4.5-.7 6.5 0M8.5 16c1.5-.5 3.5-.5 5 0" />
    </>
  ),
  medium: (
    <>
      <circle cx="6.5" cy="12" r="3.5" />
      <ellipse cx="14" cy="12" rx="2.2" ry="3.5" />
      <ellipse cx="19" cy="12" rx="1.2" ry="3.5" />
    </>
  ),
  glassdoor: (
    <>
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M16 10h.01M8 10h.01" />
    </>
  ),
  dribbble: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M8.56 2.75c4.37 6.03 6.02 9.42 8.03 17.22m2.54-15.38c-3.72 4.35-8.94 5.66-16.88 5.85m19.5 1.9c-3.5-.93-6.63-.82-8.94 0-2.58.92-5.01 2.86-7.44 6.32" />
    </>
  ),
  behance: (
    <>
      <path d="M4 9h5.5a2.5 2.5 0 0 1 0 5H4V6h5a2.2 2.2 0 0 1 0 4" />
      <path d="M14 8h6M14.5 16.5a3.5 3.5 0 1 0 0-5 3.5 3.5 0 0 0 0 5Z" />
    </>
  ),
  vimeo: (
    <>
      <path d="M12 6.5c2-3 4.5-3.2 5.5-.8 1.3 3.2-1.2 8.3-3.8 11.2-2.2 2.5-4.3 2.8-5.7.4C6.5 14.5 8 9 10 6.5Z" />
    </>
  ),
  website: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </>
  ),
  email: (
    <>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m2 7 10 6 10-6" />
    </>
  ),
};

export function FooterSocialIcon({
  name,
  size = 16,
  className,
}: {
  name: FooterSocialIconId;
  size?: number;
  className?: string;
}) {
  return (
    <BrandSvg size={size} className={className}>
      {PATHS[name]}
    </BrandSvg>
  );
}
