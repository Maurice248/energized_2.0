import type { MetadataRoute } from "next";
import { env } from "@/env";

export default function robots(): MetadataRoute.Robots {
  const base = env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/applications",
        "/saved",
        "/dashboard",
        "/profile",
        "/onboarding",
        "/employer/",
        "/sign-in",
        "/sign-up",
        "/verify-email",
        "/accept-invite",
      ],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
