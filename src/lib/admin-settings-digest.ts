import { env } from "@/env";

export type AdminSettingsDigest = {
  nodeEnv: "development" | "production" | "test";
  deployment: {
    appUrl: string;
    authUrl: string;
  };
  email: {
    defaultFrom: string;
  };
  analytics: {
    posthogBrowser: boolean;
    posthogHost: string;
    posthogProjectApiConfigured: boolean;
  };
  ai: {
    apiKeyConfigured: boolean;
    model: string;
  };
  stripe: {
    secretConfigured: boolean;
    webhookConfigured: boolean;
    priceIdsConfiguredCount: number;
    priceIdsConfiguredMax: number;
  };
};

/**
 * Safe, human-readable subset of `@/env` for the Platform settings screen.
 * Values update per deploy; edits still happen in hosting env UI, not in-app.
 */
export function getAdminSettingsDigest(): AdminSettingsDigest {
  const priceIds = [
    env.STRIPE_PRICE_PACKAGE_A,
    env.STRIPE_PRICE_PACKAGE_B,
    env.STRIPE_PRICE_PACKAGE_C,
    env.STRIPE_PRICE_PACKAGE_GOLD,
    env.STRIPE_PRICE_PACKAGE_PLATINUM,
  ].filter(Boolean);

  const node = process.env.NODE_ENV;
  const nodeEnv: AdminSettingsDigest["nodeEnv"] =
    node === "production" ? "production" : node === "test" ? "test" : "development";

  return {
    nodeEnv,
    deployment: {
      appUrl: env.NEXT_PUBLIC_APP_URL,
      authUrl: env.BETTER_AUTH_URL,
    },
    email: {
      defaultFrom: env.EMAIL_FROM,
    },
    analytics: {
      posthogBrowser: env.NEXT_PUBLIC_POSTHOG_KEY.length > 0,
      posthogHost: env.NEXT_PUBLIC_POSTHOG_HOST,
      posthogProjectApiConfigured:
        Boolean(env.POSTHOG_PERSONAL_API_KEY) && Boolean(env.POSTHOG_PROJECT_ID),
    },
    ai: {
      apiKeyConfigured: Boolean(env.OPENAI_API_KEY),
      model: env.OPENAI_MODEL,
    },
    stripe: {
      secretConfigured: Boolean(env.STRIPE_SECRET_KEY),
      webhookConfigured: Boolean(env.STRIPE_WEBHOOK_SECRET),
      priceIdsConfiguredCount: priceIds.length,
      priceIdsConfiguredMax: 5,
    },
  };
}
