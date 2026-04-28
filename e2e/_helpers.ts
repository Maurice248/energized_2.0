import { type Page } from "@playwright/test";

/**
 * Hardcoded seed IDs from the dev DB (see seed_test_data.md memory).
 * The operator has explicitly chosen to keep these around.
 */
export const SEED = {
  job: "83231c38-4219-49e3-928f-1abebfa5bc69",
  org: "d0a1f847-7efd-4dc9-9a7c-7f646fac3861",
  jobseeker: "20febfda-0908-4220-9500-c0b1a29ef5b8", // Mara Whitlock
} as const;

/**
 * Inject CSS that hides animated bits Satori-style (marquee scroll, orbit
 * float, AI typing pulse, sparkline transitions). Call after navigation
 * but before the snapshot.
 */
export async function freezeAnimations(page: Page) {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
      }
      .v2-marquee-track { animation: none !important; transform: none !important; }
      .v2-orbit-chip { animation: none !important; }
      .v2-ai-chat-status .dot { animation: none !important; }
    `,
  });
}

/**
 * Wait for fonts and images to settle so screenshots are deterministic.
 */
export async function waitForVisualStable(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForLoadState("networkidle");
}
