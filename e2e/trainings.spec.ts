/**
 * Trainings E2E smoke suite.
 *
 * The /trainings route group lives under (app), which is auth-gated via the
 * layout's redirect to /sign-in. In the CI/dev environment these tests run
 * unauthenticated, so the main signal we verify is:
 *
 *  1. The auth gate works — unauthenticated requests land on /sign-in.
 *  2. The route exists — no 404 or unhandled error (the RSC layout itself
 *     must compile and respond without throwing).
 *
 * Authenticated catalog / detail rendering is covered by the tRPC router
 * unit tests in src/server/api/routers/. A full authenticated Playwright
 * flow would require real session fixtures wired to a test Neon branch
 * (CLAUDE.md §17) — deferred until CI seeds that branch.
 */
import { test, expect } from "@playwright/test";

test.describe("Trainings catalog", () => {
  test("catalog renders and routes to detail", async ({ page }) => {
    await page.goto("/trainings");

    if (page.url().includes("/sign-in")) {
      await expect(page).toHaveURL(/sign-in/);
      // Sign-in page must render a form — proves no blank error page.
      const emailInput = page.getByRole("textbox");
      await expect(emailInput.first()).toBeVisible();
      return;
    }

    await expect(
      page.getByRole("heading", { name: /Skill up for the roles/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Featured/i }),
    ).toBeVisible();

    // Click the first training card
    const firstCard = page.locator('a[href^="/trainings/"]').first();
    await firstCard.click();
    await expect(page).toHaveURL(/\/trainings\/[^/]+$/);
    await expect(
      page.getByRole("heading", { name: /Curriculum/i }),
    ).toBeVisible();
  });

  test("detail page enroll CTA is visible", async ({ page }) => {
    await page.goto("/trainings/gwo-basic");

    if (page.url().includes("/sign-in")) {
      await expect(page).toHaveURL(/sign-in/);
      const emailInput = page.getByRole("textbox");
      await expect(emailInput.first()).toBeVisible();
      return;
    }

    await expect(
      page.getByRole("button", { name: /Enroll free|Upgrade to Platinum/i }),
    ).toBeVisible();
  });
});

test.describe("Trainings — auth gate smoke", () => {
  test("/trainings redirects unauthenticated users to sign-in", async ({ page }) => {
    await page.goto("/trainings");
    await expect(page).toHaveURL(/sign-in/);
    const emailInput = page.getByRole("textbox");
    await expect(emailInput.first()).toBeVisible();
  });

  test("/trainings/[slug] redirects unauthenticated users to sign-in", async ({ page }) => {
    await page.goto("/trainings/gwo-basic");
    await expect(page).toHaveURL(/sign-in/);
    const emailInput = page.getByRole("textbox");
    await expect(emailInput.first()).toBeVisible();
  });

  test("/trainings/my-trainings redirects unauthenticated users to sign-in", async ({ page }) => {
    await page.goto("/trainings/my-trainings");
    await expect(page).toHaveURL(/sign-in/);
    const emailInput = page.getByRole("textbox");
    await expect(emailInput.first()).toBeVisible();
  });

  test("/trainings/[slug] handles unknown slug via auth gate", async ({ page }) => {
    // An unknown slug would 404 *after* auth. Unauthenticated, the layout gate
    // fires first, so we expect a sign-in redirect rather than a 404.
    await page.goto("/trainings/does-not-exist");
    await expect(page).toHaveURL(/sign-in/);
  });
});
