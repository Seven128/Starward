import { expect, test } from "@playwright/test";

const outcomes = [
  "mobile-shell-and-preferences",
  "forecast-and-astronomy",
  "identity-profile-privacy",
  "tonight-decision",
  "map-route-discovery",
  "notifications-and-toolbox",
  "field-offline-safety",
  "itinerary-and-collaboration",
  "community-contribution",
  "shooting-assistant",
  "quality-release-observability",
];

for (const outcome of outcomes) {
  const assertion = `owner-ops-${outcome}-result`;
  test(`[outcome:${outcome}] [ac:${assertion}] ${assertion}`, async ({ page, baseURL }) => {
    await test.step("[given:owner-ops-root-ready]", async () => {
      if (!baseURL) throw new Error("acceptance_base_url_missing");
      const response = await page.goto(new URL("/release-quality", baseURL).href, { waitUntil: "networkidle" });
      expect(response?.ok()).toBe(true);
      await expect(page).toHaveURL((url) => url.pathname === "/release-quality" && !url.searchParams.has("acceptanceFixture"));
      await expect(page.locator('[data-testid="screen-quality-release-observability"]')).toBeVisible();
    });
    await test.step("[action:inspect-integrated-outcome]", async () => {
      const status = page.locator(`[data-testid=${JSON.stringify(`integrated-outcome-${outcome}`)}]`);
      await expect(status).toBeVisible();
      await expect(status).toHaveAttribute("data-state", "passed");
      await expect(page.locator('[data-testid="release-android-runtime-status"]')).toHaveAttribute("data-state", "passed");
      const ios = page.locator('[data-testid="release-ios-runtime-status"]');
      await expect(ios).toHaveAttribute("data-state", "deferred-unverified");
      await expect(ios).toContainText(/deferred|unverified|暂缓|未验证/u);
      await expect(page.locator('[data-testid*="acceptance"][data-state="passed"]')).toHaveCount(0);
    });
  });
}
