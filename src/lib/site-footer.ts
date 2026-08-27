import { z } from "zod";
import { PUBLIC_CONTACT_EMAIL } from "@/lib/public-contact-email";

export const FOOTER_SOCIAL_ICONS = [
  "linkedin",
  "facebook",
  "twitterX",
  "instagram",
  "youtube",
  "tiktok",
  "threads",
  "bluesky",
  "whatsapp",
  "telegram",
  "discord",
  "snapchat",
  "pinterest",
  "reddit",
  "github",
  "gitlab",
  "twitch",
  "slack",
  "spotify",
  "medium",
  "glassdoor",
  "dribbble",
  "behance",
  "vimeo",
  "website",
  "email",
] as const;

export type FooterSocialIcon = (typeof FOOTER_SOCIAL_ICONS)[number];

export const FOOTER_SOCIAL_CATALOG: Record<
  FooterSocialIcon,
  { label: string; href: string }
> = {
  linkedin: { label: "LinkedIn", href: "https://www.linkedin.com" },
  facebook: { label: "Facebook", href: "https://www.facebook.com" },
  twitterX: { label: "X", href: "https://x.com" },
  instagram: { label: "Instagram", href: "https://www.instagram.com" },
  youtube: { label: "YouTube", href: "https://www.youtube.com" },
  tiktok: { label: "TikTok", href: "https://www.tiktok.com" },
  threads: { label: "Threads", href: "https://www.threads.com" },
  bluesky: { label: "Bluesky", href: "https://bsky.app" },
  whatsapp: { label: "WhatsApp", href: "https://wa.me" },
  telegram: { label: "Telegram", href: "https://t.me" },
  discord: { label: "Discord", href: "https://discord.com" },
  snapchat: { label: "Snapchat", href: "https://www.snapchat.com" },
  pinterest: { label: "Pinterest", href: "https://www.pinterest.com" },
  reddit: { label: "Reddit", href: "https://www.reddit.com" },
  github: { label: "GitHub", href: "https://github.com" },
  gitlab: { label: "GitLab", href: "https://gitlab.com" },
  twitch: { label: "Twitch", href: "https://www.twitch.tv" },
  slack: { label: "Slack", href: "https://slack.com" },
  spotify: { label: "Spotify", href: "https://open.spotify.com" },
  medium: { label: "Medium", href: "https://medium.com" },
  glassdoor: { label: "Glassdoor", href: "https://www.glassdoor.com" },
  dribbble: { label: "Dribbble", href: "https://dribbble.com" },
  behance: { label: "Behance", href: "https://www.behance.net" },
  vimeo: { label: "Vimeo", href: "https://vimeo.com" },
  website: { label: "Website", href: "https://" },
  email: { label: "Email", href: "mailto:" },
};

export function footerSocialLabel(icon: FooterSocialIcon): string {
  return FOOTER_SOCIAL_CATALOG[icon].label;
}

export function footerSocialDefaultHref(icon: FooterSocialIcon): string {
  return FOOTER_SOCIAL_CATALOG[icon].href;
}

export type FooterLink = {
  id: string;
  label: string;
  href: string;
  order: number;
};

export type FooterSocialLink = {
  id: string;
  name: string;
  href: string;
  icon: FooterSocialIcon;
  order: number;
};

export type FooterColumn = {
  id: string;
  title: string;
  order: number;
  links: FooterLink[];
};

export type SiteFooterContent = {
  tagline: string;
  social: FooterSocialLink[];
  columns: FooterColumn[];
  wordmarkBefore: string;
  wordmarkAccent: string;
  wordmarkAfter: string;
  copyrightName: string;
  legalLinks: FooterLink[];
};

export function isFooterInternalHref(href: string): boolean {
  return href.startsWith("/") && !href.startsWith("//");
}

export function isFooterExternalHref(href: string): boolean {
  return href.startsWith("http://") || href.startsWith("https://");
}

export const footerHrefSchema = z
  .string()
  .trim()
  .min(1, "Link URL is required.")
  .max(2048, "Link URL is too long.")
  .refine((value) => {
    if (isFooterInternalHref(value)) return true;
    if (value.startsWith("mailto:") || value.startsWith("tel:")) return true;
    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }, "Use a site path (/about), mailto:, or an https:// URL.");

const footerLinkSchema = z.object({
  id: z.string().trim().min(1).max(80),
  label: z.string().trim().min(1).max(80),
  href: footerHrefSchema,
  order: z.number().int(),
});

const footerSocialSchema = z.object({
  id: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(80),
  href: footerHrefSchema,
  icon: z.enum(FOOTER_SOCIAL_ICONS),
  order: z.number().int(),
});

const footerColumnSchema = z.object({
  id: z.string().trim().min(1).max(80),
  title: z.string().trim().min(1).max(80),
  order: z.number().int(),
  links: z.array(footerLinkSchema).max(12),
});

export const siteFooterSchema = z.object({
  tagline: z.string().trim().min(1).max(400),
  social: z.array(footerSocialSchema).max(16),
  columns: z.array(footerColumnSchema).min(1).max(4),
  wordmarkBefore: z.string().max(40),
  wordmarkAccent: z.string().max(40),
  wordmarkAfter: z.string().max(12),
  copyrightName: z.string().trim().min(1).max(80),
  legalLinks: z.array(footerLinkSchema).max(8),
});

export const DEFAULT_SITE_FOOTER: SiteFooterContent = {
  tagline:
    "The specialized job network for Canada's energy transition — from reservoirs to renewables.",
  social: [
    {
      id: "social-linkedin",
      name: "LinkedIn",
      href: "https://linkedin.com",
      icon: "linkedin",
      order: 0,
    },
    {
      id: "social-facebook",
      name: "Facebook",
      href: "https://facebook.com",
      icon: "facebook",
      order: 1,
    },
    {
      id: "social-x",
      name: "X",
      href: "https://x.com",
      icon: "twitterX",
      order: 2,
    },
    {
      id: "social-instagram",
      name: "Instagram",
      href: "https://instagram.com",
      icon: "instagram",
      order: 3,
    },
  ],
  columns: [
    {
      id: "col-candidates",
      title: "For candidates",
      order: 0,
      links: [
        { id: "cand-seekers", label: "For job seekers", href: "/for-seekers", order: 0 },
        { id: "cand-jobs", label: "Browse jobs", href: "/jobs", order: 1 },
        { id: "cand-signup", label: "Create profile", href: "/sign-up", order: 2 },
        { id: "cand-signin", label: "Sign in", href: "/sign-in", order: 3 },
      ],
    },
    {
      id: "col-employers",
      title: "For employers",
      order: 1,
      links: [
        { id: "emp-why", label: "Why Energized", href: "/for-employers", order: 0 },
        { id: "emp-post", label: "Post a job", href: "/sign-up?role=employer", order: 1 },
        { id: "emp-search", label: "Search talent", href: "/sign-up?role=employer", order: 2 },
        { id: "emp-employers", label: "For employers", href: "/for-employers", order: 3 },
      ],
    },
    {
      id: "col-company",
      title: "Company",
      order: 2,
      links: [
        { id: "co-about", label: "About", href: "/about", order: 0 },
        { id: "co-faqs", label: "FAQs", href: "/faqs", order: 1 },
        { id: "co-contact", label: "Contact", href: "/contact", order: 2 },
        {
          id: "co-email",
          label: PUBLIC_CONTACT_EMAIL,
          href: `mailto:${PUBLIC_CONTACT_EMAIL}`,
          order: 3,
        },
      ],
    },
  ],
  wordmarkBefore: "energi",
  wordmarkAccent: "zed",
  wordmarkAfter: ".",
  copyrightName: "Energized",
  legalLinks: [
    { id: "legal-privacy", label: "Privacy", href: "/privacy", order: 0 },
    { id: "legal-terms", label: "Terms", href: "/terms", order: 1 },
    { id: "legal-a11y", label: "Accessibility", href: "/accessibility", order: 2 },
  ],
};

function sortByOrder<T extends { order: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.order - b.order);
}

export function normalizeSiteFooter(input: SiteFooterContent): SiteFooterContent {
  return {
    ...input,
    social: sortByOrder(input.social).map((item, order) => ({ ...item, order })),
    legalLinks: sortByOrder(input.legalLinks).map((item, order) => ({ ...item, order })),
    columns: sortByOrder(input.columns).map((column, order) => ({
      ...column,
      order,
      links: sortByOrder(column.links).map((link, linkOrder) => ({
        ...link,
        order: linkOrder,
      })),
    })),
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function parseLink(raw: unknown, fallback: FooterLink): FooterLink {
  const rec = asRecord(raw);
  if (!rec) return fallback;
  const parsed = footerLinkSchema.safeParse({
    id: typeof rec.id === "string" ? rec.id : fallback.id,
    label: typeof rec.label === "string" ? rec.label : fallback.label,
    href: typeof rec.href === "string" ? rec.href : fallback.href,
    order: typeof rec.order === "number" ? rec.order : fallback.order,
  });
  return parsed.success ? parsed.data : fallback;
}

function parseSocial(raw: unknown, fallback: FooterSocialLink): FooterSocialLink {
  const rec = asRecord(raw);
  if (!rec) return fallback;
  const parsed = footerSocialSchema.safeParse({
    id: typeof rec.id === "string" ? rec.id : fallback.id,
    name: typeof rec.name === "string" ? rec.name : fallback.name,
    href: typeof rec.href === "string" ? rec.href : fallback.href,
    icon: rec.icon,
    order: typeof rec.order === "number" ? rec.order : fallback.order,
  });
  return parsed.success ? parsed.data : fallback;
}

/** Coerce stored JSON into a complete footer; unknown/invalid input falls back to defaults. */
export function parseSiteFooter(raw: unknown): SiteFooterContent {
  const rec = asRecord(raw);
  if (!rec) return structuredClone(DEFAULT_SITE_FOOTER);

  const strict = siteFooterSchema.safeParse(raw);
  if (strict.success) return normalizeSiteFooter(strict.data);

  const defaults = structuredClone(DEFAULT_SITE_FOOTER);
  const socialRaw = Array.isArray(rec.social) ? rec.social : defaults.social;
  const columnsRaw = Array.isArray(rec.columns) ? rec.columns : defaults.columns;
  const legalRaw = Array.isArray(rec.legalLinks) ? rec.legalLinks : defaults.legalLinks;

  const social =
    socialRaw.length === 0
      ? []
      : socialRaw.map((item, i) =>
          parseSocial(item, defaults.social[i] ?? defaults.social[0]!),
        );

  const columns =
    columnsRaw.length === 0
      ? defaults.columns
      : columnsRaw.map((col, i) => {
          const fallbackCol = defaults.columns[i] ?? defaults.columns[0]!;
          const colRec = asRecord(col);
          const linksRaw = Array.isArray(colRec?.links) ? colRec.links : fallbackCol.links;
          return {
            id: typeof colRec?.id === "string" ? colRec.id : fallbackCol.id,
            title:
              typeof colRec?.title === "string" && colRec.title.trim()
                ? colRec.title
                : fallbackCol.title,
            order: typeof colRec?.order === "number" ? colRec.order : i,
            links:
              linksRaw.length === 0
                ? []
                : linksRaw.map((link, li) =>
                    parseLink(link, fallbackCol.links[li] ?? fallbackCol.links[0]!),
                  ),
          };
        });

  const legalLinks =
    legalRaw.length === 0
      ? []
      : legalRaw.map((item, i) =>
          parseLink(item, defaults.legalLinks[i] ?? defaults.legalLinks[0]!),
        );

  const merged: SiteFooterContent = {
    tagline:
      typeof rec.tagline === "string" && rec.tagline.trim()
        ? rec.tagline
        : defaults.tagline,
    social,
    columns,
    wordmarkBefore:
      typeof rec.wordmarkBefore === "string" ? rec.wordmarkBefore : defaults.wordmarkBefore,
    wordmarkAccent:
      typeof rec.wordmarkAccent === "string" ? rec.wordmarkAccent : defaults.wordmarkAccent,
    wordmarkAfter:
      typeof rec.wordmarkAfter === "string" ? rec.wordmarkAfter : defaults.wordmarkAfter,
    copyrightName:
      typeof rec.copyrightName === "string" && rec.copyrightName.trim()
        ? rec.copyrightName
        : defaults.copyrightName,
    legalLinks,
  };

  const validated = siteFooterSchema.safeParse(merged);
  return normalizeSiteFooter(validated.success ? validated.data : defaults);
}

export function newFooterId(prefix: string): string {
  const uuid =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${uuid}`.slice(0, 80);
}
