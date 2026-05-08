/**
 * Skill-tests E2E smoke suite.
 *
 * The /skills route group lives under (app), which is auth-gated via the
 * layout's redirect to /sign-in. In the CI/dev environment these tests run
 * unauthenticated, so the main signal we verify is:
 *
 *  1. The auth gate works — unauthenticated requests land on /sign-in.
 *  2. The route exists — no 404 or unhandled error (the RSC layout itself
 *     must compile and respond without throwing).
 *
 * Authenticated catalog / configure rendering is covered by the unit tests
 * in src/lib/ai.test.ts and the router tests in src/server/api/routers/.
 * A full authenticated Playwright flow would require real session fixtures
 * wired up to a test Neon branch (CLAUDE.md §17) — deferred until CI seeds
 * that branch.
 */
import { test, expect } from "@playwright/test";

test.describe("Skill tests — auth gate smoke", () => {
  test("/skills redirects unauthenticated users to sign-in", async ({ page }) => {
    await page.goto("/skills");

    // Next.js (app) layout performs a server-side redirect; Playwright follows
    // it. The resulting URL must contain sign-in.
    await expect(page).toHaveURL(/sign-in/);

    // The sign-in page must render a form so we know it's not a blank error.
    const emailInput = page.getByRole("textbox");
    await expect(emailInput.first()).toBeVisible();
  });

  test("/skills/[topicSlug]/configure redirects unauthenticated users to sign-in", async ({
    page,
  }) => {
    await page.goto("/skills/wind/configure");

    await expect(page).toHaveURL(/sign-in/);

    const emailInput = page.getByRole("textbox");
    await expect(emailInput.first()).toBeVisible();
  });

  test("/skills/[topicSlug]/configure handles unknown slug via auth gate", async ({ page }) => {
    // An unknown slug would 404 *after* auth. Unauthenticated, the layout gate
    // fires first, so we still expect a sign-in redirect rather than a 404.
    await page.goto("/skills/does-not-exist/configure");
    await expect(page).toHaveURL(/sign-in/);
  });
});
