import { test, expect } from "@playwright/test";
import { freezeAnimations, waitForVisualStable } from "./_helpers";

test.describe("marketing", () => {
  test("landing renders + matches snapshot", async ({ page }) => {
    await page.goto("/");
    await freezeAnimations(page);
    await waitForVisualStable(page);

    await expect(page).toHaveTitle(/Energized — jobs in Canadian energy/);
    await expect(
      page.getByRole("heading", { level: 1 }),
    ).toContainText(/Careers for/);

    // Sector grid renders all 6 cards
    await expect(
      page.locator(".v2-cat-row .v2-cat"),
    ).toHaveCount(6);

    await expect(page).toHaveScreenshot("landing.png", {
      fullPage: true,
    });
  });

  test("about renders + matches snapshot", async ({ page }) => {
    await page.goto("/about");
    await freezeAnimations(page);
    await waitForVisualStable(page);

    await expect(page).toHaveTitle(/About — Energized/);
    await expect(
      page.getByRole("heading", { level: 1 }),
    ).toContainText(/Canada/);

    // Pricing audience tabs are interactive — verify both render
    await expect(
      page.locator(".v2-pricing-tab").nth(0),
    ).toContainText(/job seekers/i);
    await expect(
      page.locator(".v2-pricing-tab").nth(1),
    ).toContainText(/employers/i);

    await expect(page).toHaveScreenshot("about.png", { fullPage: true });
  });

  test("contact renders + matches snapshot", async ({ page }) => {
    await page.goto("/contact");
    await freezeAnimations(page);
    await waitForVisualStable(page);

    await expect(page).toHaveTitle(/Contact — Energized/);

    await expect(
      page.getByRole("heading", { level: 1 }),
    ).toContainText(/help/i);
    await expect(page.locator(".v2-contact-form-wrap")).toBeVisible();
    await expect(page.getByLabel(/your name/i)).toBeVisible();
    await expect(page.getByLabel(/email address/i)).toBeVisible();
    await expect(page.getByLabel(/how can we help/i)).toBeVisible();
    await expect(page.locator(".v2-faq")).toHaveCount(0);

    await expect(page).toHaveScreenshot("contact.png", { fullPage: true });
  });

  test("faqs renders published library chrome", async ({ page }) => {
    await page.goto("/faqs");
    await freezeAnimations(page);
    await waitForVisualStable(page);

    await expect(page).toHaveTitle(/FAQs — Energized/);
    await expect(
      page.getByRole("heading", { level: 1 }),
    ).toContainText(/Questions/);
    await expect(page.locator(".v2-faq")).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Contact us/i }),
    ).toHaveAttribute("href", "/contact");
  });
});

test.describe("nav", () => {
  test("anonymous nav has Sign in / Get started CTAs", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("banner");
    await expect(nav.getByRole("link", { name: "Sign in" })).toBeVisible();
    await expect(
      nav.getByRole("link", { name: /Get started/ }),
    ).toBeVisible();
  });

  test("nav links navigate to expected URLs", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("banner");
    await nav.getByRole("link", { name: /^About$/ }).click();
    await expect(page).toHaveURL("/about");
  });

  test("footer renders column headers + brand mailto", async ({ page }) => {
    await page.goto("/");
    await waitForVisualStable(page);
    const footer = page.locator("footer.v2-footer");
    await expect(footer).toBeVisible();
    await expect(
      footer.getByRole("heading", { name: /For candidates/i }),
    ).toBeVisible();
    await expect(
      footer.getByRole("heading", { name: /For employers/i }),
    ).toBeVisible();
    await expect(
      footer.getByRole("link", { name: /dev@energized\.biz/ }),
    ).toBeVisible();
  });
});
