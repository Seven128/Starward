import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resetAcceptanceState } from "./acceptance-state.mjs";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const designAuthority = readFileSync(
  path.join(repositoryRoot, "DESIGN.md"),
  "utf8",
);

const SPOT_ID = "spot:sz-astronomical-observatory";
const TOKEN_NAMES = [
  "canvas",
  "surface",
  "surface-subtle",
  "surface-elevated",
  "text-primary",
  "text-secondary",
  "text-tertiary",
  "border",
  "primary",
  "primary-pressed",
  "on-primary",
  "accent-cyan",
  "accent-violet",
  "accent-warm",
  "success",
  "warning",
  "danger",
  "focus",
];

function paletteFromDesign(heading) {
  const profileMarker = "## WeChat Mini Program — Soft Instruments v1";
  const profileStart = designAuthority.lastIndexOf(profileMarker);
  if (profileStart < 0) throw new Error("miniapp_design_profile_missing");
  const profile = designAuthority.slice(profileStart + profileMarker.length);
  const section = profile.split(`#### ${heading}`)[1]?.split(/^#### /mu)[0];
  if (!section) throw new Error(`miniapp_palette_missing:${heading}`);
  const values = new Map(
    [...section.matchAll(/^\| `([^`]+)` \| `([^`]+)` \|$/gmu)].map((match) => [
      match[1],
      match[2].toLowerCase(),
    ]),
  );
  return TOKEN_NAMES.map((name) => {
    const value = values.get(name);
    if (!value)
      throw new Error(`miniapp_palette_role_missing:${heading}:${name}`);
    return value;
  });
}

const PALETTES = {
  day: paletteFromDesign("Day"),
  night: paletteFromDesign("Night"),
  observation: paletteFromDesign("Observation red"),
};

async function openDetailFromMap(page) {
  await page.goto("/");
  await page.locator('[data-od-id="map-search-summary"]').click();
  const finder = page.locator(
    '.source-lift-focus-layer[role="dialog"][data-variant="panelOnly"]',
  );
  await finder.getByLabel(/选择深圳市天文台并回到地图/).click();
  await expect(
    page.locator('.source-lift-focus-layer[data-variant="panelOnly"]'),
  ).toHaveAttribute("data-phase", "IDLE");
  await page.getByLabel("查看深圳市天文台详情").click();
  await expect(page.locator('[data-route="spot-detail"]')).toBeVisible();
}

async function openMy(page) {
  await page.goto("/");
  await page.getByRole("link", { name: "我的" }).click();
  await expect(page.locator('[data-route="my-account-center"]')).toBeVisible();
}

async function readPalette(locator) {
  return locator.evaluate((element, names) => {
    const style = getComputedStyle(element);
    const normalizeHex = (value) =>
      value.replace(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/u, "#$1$1$2$2$3$3");
    return Object.fromEntries(
      names.map((name) => [
        name,
        normalizeHex(style.getPropertyValue(`--${name}`).trim().toLowerCase()),
      ]),
    );
  }, TOKEN_NAMES);
}

function expectedPalette(values) {
  return Object.fromEntries(
    TOKEN_NAMES.map((name, index) => [name, values[index]]),
  );
}

async function expectNoPageOverflow(page) {
  const overflow = await page.evaluate(() =>
    Math.max(
      0,
      document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    ),
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

test.beforeEach(async ({ page, request }) => {
  await resetAcceptanceState(request);
  await page.addInitScript(() => localStorage.clear());
});

test("DESIGN.md exact day, night and observation role sets reach production", async ({
  page,
}) => {
  await page.goto("/");
  const map = page.locator('[data-route="map"]');
  await expect(map).toHaveClass(/theme-day/);
  expect(await readPalette(map)).toEqual(expectedPalette(PALETTES.day));

  await openDetailFromMap(page);
  await page.getByLabel("查看深圳市天文台此处夜空").click();
  const night = page.locator('[data-route="spot-night"]');
  await expect(night).toHaveClass(/theme-night/);
  expect(await readPalette(night)).toEqual(expectedPalette(PALETTES.night));
  await expect(night.locator(".card").first()).toHaveCSS("box-shadow", "none");

  await openMy(page);
  await page.locator(".account-row", { hasText: "设置" }).click();
  const settings = page.locator('[data-route="my-settings"]');
  await settings.getByLabel("进入观测红模式").click();
  const observation = page.locator('[data-route="my-settings"]');
  await expect(observation).toHaveClass(/theme-observation/);
  expect(await readPalette(observation)).toEqual(
    expectedPalette(PALETTES.observation),
  );
  await expect(observation.locator(".settings-card").first()).toHaveCSS(
    "box-shadow",
    "none",
  );
});

test("map remains map-first while Finder and Conditions lift from their single sources", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".map-stage")).toBeVisible();
  await expect(page.locator(".map-finder-trigger")).toHaveCount(1);
  await expect(page.locator(".map-conditions-bar")).toHaveCount(1);
  await expect(page.locator(".selected-callout-wrap")).toHaveCount(0);

  await page.locator('[data-od-id="map-search-summary"]').click();
  const finder = page.locator(
    '.source-lift-focus-layer[role="dialog"][data-variant="panelOnly"]',
  );
  await expect(finder).toHaveAttribute("data-variant", "panelOnly");
  await expect(finder.locator(".filter-option")).toHaveCount(0);
  await finder.getByLabel(/选择深圳市天文台并回到地图/).click();
  await expect(finder).toBeHidden();
  const callout = page.locator(".selected-callout-wrap");
  await expect(callout).toBeVisible();
  await expect(callout.locator(".spot-card--callout")).toHaveCount(1);
  await expect(callout.locator(".soft-button--primary")).toHaveCount(1);

  await page.locator('[data-od-id="map-analysis-time-bar"]').click();
  const conditions = page.locator(
    '.source-lift-focus-layer[role="dialog"][data-variant="mapCoupled"]',
  );
  await expect(conditions).toHaveAttribute("data-variant", "mapCoupled");
  await expect(page.locator(".map-stage")).toBeVisible();
  await expect(conditions.locator(".conditions-overlay-option")).toHaveCount(4);
  await expect(
    conditions.locator(".conditions-overlay-option--selected"),
  ).toHaveCount(1);
  await expect(page.locator(".map-floating-tools .soft-button")).toHaveCount(2);
  await expectNoPageOverflow(page);
});

test("spot detail and night pages preserve the selected resource hierarchy", async ({
  page,
}) => {
  await openDetailFromMap(page);
  const detail = page.locator('[data-route="spot-detail"]');
  await expect(detail.locator(".spot-header")).toHaveCount(0);
  await expect(detail.locator(".segment-tab")).toHaveCount(3);
  expect(await detail.locator(".segment-tab").allTextContents()).toEqual([
    "概览",
    "攻略",
    "场地",
  ]);
  await expect(detail.locator(".spot-content")).toBeVisible();
  await expect(detail.locator(".media-card").first()).toBeVisible();
  const detailGeometry = await detail.evaluate((element) => {
    const content = element
      .querySelector(".spot-content")
      .getBoundingClientRect();
    const media = element.querySelector(".media-card").getBoundingClientRect();
    const tabs = Array.from(
      element.querySelectorAll(".segment-tab"),
      (tab) => tab.getBoundingClientRect().width,
    );
    return {
      contentWidth: content.width,
      mediaWidth: media.width,
      mediaImageHeight: element
        .querySelector(".media-card__image")
        .getBoundingClientRect().height,
      tabs,
      quietFavorite: element.querySelectorAll(".spot-favorite-action").length,
      nightEntries: element.querySelectorAll(".spot-night-entry").length,
      routeActions: element.querySelectorAll(".quiet-route-action").length,
    };
  });
  expect(
    detailGeometry.mediaWidth / detailGeometry.contentWidth,
  ).toBeGreaterThan(0.58);
  expect(detailGeometry.mediaWidth / detailGeometry.contentWidth).toBeLessThan(
    0.8,
  );
  expect(
    detailGeometry.mediaImageHeight / detailGeometry.mediaWidth,
  ).toBeGreaterThan(0.6);
  expect(
    Math.max(...detailGeometry.tabs) - Math.min(...detailGeometry.tabs),
  ).toBeLessThanOrEqual(1);
  expect(detailGeometry.quietFavorite).toBe(1);
  expect(detailGeometry.nightEntries).toBe(1);
  expect(detailGeometry.routeActions).toBe(1);

  await detail.getByLabel("查看深圳市天文台此处夜空").click();
  const sky = page.locator('[data-route="spot-night"]');
  expect(await sky.locator(".sky-tabs__item").allTextContents()).toEqual([
    "结论",
    "数据",
    "目标",
  ]);
  await expect(sky.locator(".sky-tabs__item--active")).toHaveText("结论");
  await expect(sky.locator(".sky-summary-grid")).toBeVisible();
  await expect(sky.locator('[data-od-id="sky-scene"]')).toBeVisible();
  await expect(sky.locator('[data-od-id="sky-target-list"]')).toBeVisible();
  await sky.getByRole("tab", { name: "数据" }).click();
  await expect(
    sky.locator('[data-od-id="sky-professional-matrix"]'),
  ).toBeVisible();
  await expectNoPageOverflow(page);
});

test("My keeps one conventional account center with standalone child routes", async ({
  page,
}) => {
  await openMy(page);
  const my = page.locator('[data-route="my-account-center"]');
  await expect(my.locator(".my-tab")).toHaveCount(0);
  await expect(my.locator(".profile-summary")).toHaveCount(1);
  await expect(my.locator(".account-entry-list")).toHaveCount(1);
  await expect(my.locator(".account-row")).toHaveCount(4);
  await expect(my.getByLabel(/打开观星计划/)).toBeVisible();
  await expect(my.locator(".account-row", { hasText: "设置" })).toBeVisible();
  await expectNoPageOverflow(page);
});
