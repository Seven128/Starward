import { expect } from "@playwright/test";
import { outcomeRoutes, uiContracts } from "./contracts.mjs";

const byTestId = (testId) => `[data-testid=${JSON.stringify(testId)}]`;

export async function runFrozenUiCase({ page, baseUrl, outcome, assertion }) {
  const route = outcomeRoutes[outcome];
  const contract = uiContracts[outcome]?.[assertion.key];
  if (!route || !contract) throw new Error(`unknown_frozen_ui_case:${outcome}:${assertion.key}`);

  const target = new URL(route, baseUrl);
  target.searchParams.set("acceptanceFixture", `${outcome}:${assertion.key}`);
  const response = await page.goto(target.href, { waitUntil: "domcontentloaded" });
  if (!response || !response.ok()) throw new Error(`production_route_unavailable:${target.pathname}:${response?.status() ?? "no-response"}`);

  await expect(page).toHaveURL((url) => url.pathname === target.pathname);
  await expect(page.locator(byTestId(`screen-${outcome}`))).toBeVisible();
  await page.locator(byTestId(contract.action)).click();

  for (const testId of contract.evidence) await expect(page.locator(byTestId(testId))).toBeVisible();
  await expect(page.locator(byTestId(contract.text[0]))).toContainText(contract.text[1]);
  await expect(page.locator('[data-testid*="acceptance"][data-state="passed"]')).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText(/绝对晴朗|保证可见|保证安全/u);
}
