import { z } from "zod";

/** Normalize OpenAI key from env (trim; support OPENAI_KEY alias used in some setups). */
function readOpenAiApiKey(): string | undefined {
  const raw =
    process.env.OPENAI_API_KEY?.trim() ||
    process.env.OPENAI_KEY?.trim() ||
    "";
  return raw.length > 0 ? raw : undefined;
}

const schema = z.object({
  DATABASE_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().min(1),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().url(),
  RESEND_API_KEY: z.string().min(1),
  EMAIL_FROM: z.string().min(1),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-4o"),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_PACKAGE_A: z.string().optional(),
  STRIPE_PRICE_PACKAGE_B: z.string().optional(),
  STRIPE_PRICE_PACKAGE_C: z.string().optional(),
  STRIPE_PRICE_PACKAGE_GOLD: z.string().optional(),
  STRIPE_PRICE_PACKAGE_PLATINUM: z.string().optional(),
  POSTHOG_PROJECT_ID: z.string().optional(),
  POSTHOG_PERSONAL_API_KEY: z.string().optional(),
});

export const env = schema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
  NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  EMAIL_FROM: process.env.EMAIL_FROM,
  OPENAI_API_KEY: readOpenAiApiKey(),
  OPENAI_MODEL: process.env.OPENAI_MODEL,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  STRIPE_PRICE_PACKAGE_A: process.env.STRIPE_PRICE_PACKAGE_A,
  STRIPE_PRICE_PACKAGE_B: process.env.STRIPE_PRICE_PACKAGE_B,
  STRIPE_PRICE_PACKAGE_C: process.env.STRIPE_PRICE_PACKAGE_C,
  STRIPE_PRICE_PACKAGE_GOLD: process.env.STRIPE_PRICE_PACKAGE_GOLD,
  STRIPE_PRICE_PACKAGE_PLATINUM: process.env.STRIPE_PRICE_PACKAGE_PLATINUM,
  POSTHOG_PROJECT_ID: process.env.POSTHOG_PROJECT_ID,
  POSTHOG_PERSONAL_API_KEY: process.env.POSTHOG_PERSONAL_API_KEY,
});
