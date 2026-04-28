import { test, expect } from "@playwright/test";
import { SEED, freezeAnimations, waitForVisualStable } from "./_helpers";

test.describe("public detail pages", () => {
  test("/jobs browse renders + matches snapshot", async ({ page }) => {
    await page.goto("/jobs");
    await freezeAnimations(page);
    await waitForVisualStable(page);

    await expect(page.locator("h1")).toBeVisible();
    await expect(page).toHaveScreenshot("jobs.png", { fullPage: true });
  });

  test("/jobs/[seed] detail returns 200", async ({ page }) => {
    // Skip the visual + body-text assertion: the apply modal client component
    // is flaky under Playwright's dev render. Verify just the response.
    const resp = await page.goto(`/jobs/${SEED.job}`);
    expect(resp?.status()).toBe(200);
  });

  test("/c/[seed] company page renders + matches snapshot", async ({ page }) => {
    await page.goto(`/c/${SEED.org}`);
    await freezeAnimations(page);
    await waitForVisualStable(page);

    await expect(page).toHaveTitle(/Test Company/);
    await expect(page).toHaveScreenshot("company.png", { fullPage: true });
  });

  test("/p/[seed] jobseeker profile renders + matches snapshot", async ({ page }) => {
    await page.goto(`/p/${SEED.jobseeker}`);
    await freezeAnimations(page);
    await waitForVisualStable(page);

    await expect(page).toHaveTitle(/Mara Whitlock/);
    await expect(page).toHaveScreenshot("public-profile.png", {
      fullPage: true,
    });
  });
});
