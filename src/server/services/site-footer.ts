import { cache } from "react";
import { db } from "@/server/db";
import { platformSettings } from "@/server/db/schema";
import {
  DEFAULT_SITE_FOOTER,
  parseSiteFooter,
  type SiteFooterContent,
} from "@/lib/site-footer";

export const loadSiteFooter = cache(async (): Promise<SiteFooterContent> => {
  try {
    const [row] = await db
      .select({ footer: platformSettings.footer })
      .from(platformSettings)
      .limit(1);
    return parseSiteFooter(row?.footer ?? null);
  } catch {
    return structuredClone(DEFAULT_SITE_FOOTER);
  }
});
