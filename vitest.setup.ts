/**
 * Vitest loads modules that import `@/env`; CI/local runs often omit `.env`.
 * Provide minimal valid placeholders only when unset so unit tests can import the app graph.
 */
const placeholders: Record<string, string> = {
  DATABASE_URL: "postgresql://vitest:vitest@127.0.0.1:5432/vitest",
  BETTER_AUTH_SECRET: "vitest-secret-placeholder-32chars!",
  BETTER_AUTH_URL: "http://127.0.0.1:3000",
  NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3000",
  NEXT_PUBLIC_POSTHOG_KEY: "vitest-posthog-key",
  NEXT_PUBLIC_POSTHOG_HOST: "https://us.i.posthog.com",
  RESEND_API_KEY: "re_vitest_placeholder",
  EMAIL_FROM: "Vitest <vitest@example.com>",
};

for (const [key, value] of Object.entries(placeholders)) {
  if (process.env[key] === undefined || process.env[key] === "") {
    process.env[key] = value;
  }
}
