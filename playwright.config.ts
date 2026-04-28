import { defineConfig, devices } from "@playwright/test";

/**
 * Energized Playwright config — visual regression for public marketing
 * and public detail pages. Targets the dev server on localhost:3000.
 *
 * Run:
 *   pnpm e2e             — run tests, fail on snapshot diff
 *   pnpm e2e:update      — re-baseline snapshots after intentional UI changes
 *
 * CI: TODO — seed a dedicated Neon test branch and start its own dev server
 * (CLAUDE.md §17 prescribes this).
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",

  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    // Disable CSS animations for stable snapshots.
    launchOptions: { args: ["--force-prefers-reduced-motion"] },
  },

  // Visual diffs: tolerate tiny anti-aliasing / font-rendering noise.
  expect: {
    toHaveScreenshot: {
      animations: "disabled",
      maxDiffPixelRatio: 0.005,
      threshold: 0.2,
    },
  },

  projects: [
    {
      name: "chromium-desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
      },
    },
  ],

  // We rely on the operator's externally-running dev server (per
  // dev_environment memory). If you want Playwright to spin up its own,
  // uncomment this block and stop the external one.
  // webServer: {
  //   command: "pnpm dev",
  //   url: "http://localhost:3000",
  //   timeout: 120_000,
  //   reuseExistingServer: !process.env.CI,
  // },
});
