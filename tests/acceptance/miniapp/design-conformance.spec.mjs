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
const encodedSpotId = encodeURIComponent(SPOT_ID);
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
    [...section.matchAll(/^\| `([^`]+)` \| `([^`]+)` \|$/gmu)].map(
      (match) => [match[1], match[2].toLowerCase()],
    ),
  );
  return TOKEN_NAMES.map((name) => {
    const value = values.get(name);
    if (!value) throw new Error(`miniapp_palette_role_missing:${heading}:${name}`);
    return value;
  });
}

const PALETTES = {
  day: paletteFromDesign("Day"),
  night: paletteFromDesign("Night"),
  observation: paletteFromDesign("Observation red"),
};

async function gotoRoute(page, route) {
  await page.goto(`/#/${route}`);
  await expect(
    page.locator("[data-miniapp-production-root], [data-route]").first(),
  ).toBeVisible();
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
  return Object.fromEntries(TOKEN_NAMES.map((name, index) => [name, values[index]]));
}

async function expectNoPageOverflow(page) {
  const overflow = await page.evaluate(
    () => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

test.beforeEach(async ({ page, request }) => {
  await resetAcceptanceState(request);
  await page.addInitScript(() => localStorage.clear());
});

test("DESIGN.md exact day, night and observation role sets reach production", async ({ page }) => {
  await page.goto("/");
  const map = page.locator('[data-route="map"]');
  await expect(map).toHaveClass(/theme-day/);
  expect(await readPalette(map)).toEqual(expectedPalette(PALETTES.day));

  await gotoRoute(page, `spot/sky/index?spotId=${encodedSpotId}`);
  const night = page.locator('[data-route="sky-main"]');
  await expect(night).toHaveClass(/theme-night/);
  expect(await readPalette(night)).toEqual(expectedPalette(PALETTES.night));
  await expect(night.locator(".card").first()).toHaveCSS("box-shadow", "none");

  await gotoRoute(page, `sky/observe/index?spotId=${encodedSpotId}`);
  const observation = page.locator('[data-route="observation"]');
  await expect(observation).toHaveClass(/theme-observation/);
  expect(await readPalette(observation)).toEqual(
    expectedPalette(PALETTES.observation),
  );
  await expect(observation.locator(".status-panel").first()).toHaveCSS(
    "box-shadow",
    "none",
  );
});

test("map remains map-first and preserves the selected-resource card anatomy", async ({ page }) => {
  // design-binding: map.selected-card-anatomy
  // design-binding: map.quick-filter-and-control-hierarchy
  await page.goto("/");
  const geometry = await page.evaluate(() => {
    const box = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, bottom: rect.bottom };
    };
    const quickFilters = Array.from(
      document.querySelectorAll(".quick-filter"),
      (element) => {
        const rect = element.getBoundingClientRect();
        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
      },
    );
    return {
      workspace: box(".map-workspace"),
      stage: box(".map-stage"),
      search: box(".search-box"),
      card: box(".selected-card-scroll"),
      tabbar: box("taro-tabbar"),
      quickFilters,
      quickFilterScroll: (() => {
        const element = document.querySelector(".quick-filter-scroll");
        return element
          ? { clientHeight: element.clientHeight, scrollHeight: element.scrollHeight }
          : null;
      })(),
      floatingCount: document.querySelectorAll(".map-floating-tools .soft-button").length,
      primaryCount: document.querySelectorAll(
        ".selected-card-wrap .soft-button--primary",
      ).length,
      metricCount: document.querySelectorAll(".selected-card-wrap .spot-card__datum").length,
      facilityCount: document.querySelectorAll(".selected-card-wrap .spot-card__facilities .status-tag").length,
      routeCount: document.querySelectorAll(".selected-card-wrap .spot-card__route-row").length,
      cardActionCount: document.querySelectorAll(".selected-card-wrap .spot-card__actions .soft-button").length,
    };
  });
  expect(geometry.workspace).not.toBeNull();
  expect(geometry.stage).toEqual(geometry.workspace);
  expect(geometry.search.height).toBeGreaterThanOrEqual(43.5);
  expect(geometry.quickFilters).toHaveLength(4);
  expect(geometry.quickFilterScroll).not.toBeNull();
  expect(geometry.quickFilterScroll.scrollHeight).toBeLessThanOrEqual(
    geometry.quickFilterScroll.clientHeight + 1,
  );
  for (const quickFilter of geometry.quickFilters) {
    expect(quickFilter.height).toBeGreaterThanOrEqual(43.5);
  }
  expect(geometry.floatingCount).toBe(4);
  expect(geometry.primaryCount).toBe(1);
  expect(geometry.metricCount).toBe(3);
  expect(geometry.facilityCount).toBe(4);
  expect(geometry.routeCount).toBe(1);
  expect(geometry.cardActionCount).toBe(2);
  expect(geometry.card.bottom).toBeLessThanOrEqual(geometry.tabbar.y + 1);
  await expectNoPageOverflow(page);
});

test("spot detail and night pages preserve the selected resource hierarchy", async ({ page }) => {
  await gotoRoute(page, `spot/detail/index?spotId=${encodedSpotId}`);
  const detail = page.locator('[data-route="spot-detail"]');
  await expect(detail.locator(".spot-header")).toHaveCount(0);
  await expect(detail.locator(".segment-tab")).toHaveCount(4);
  expect(await detail.locator(".segment-tab").allTextContents()).toEqual([
    "概览", "攻略", "场地", "夜空",
  ]);
  const detailGeometry = await detail.evaluate((element) => {
    const content = element.querySelector(".spot-content").getBoundingClientRect();
    const media = element.querySelector(".media-card").getBoundingClientRect();
    const tabs = Array.from(element.querySelectorAll(".segment-tab"), (tab) =>
      tab.getBoundingClientRect().width,
    );
    return {
      contentWidth: content.width,
      mediaWidth: media.width,
      mediaImageHeight: element.querySelector(".media-card__image").getBoundingClientRect().height,
      tabs,
      primaryActions: element.querySelectorAll(".detail-actions .soft-button--primary").length,
    };
  });
  expect(detailGeometry.mediaWidth / detailGeometry.contentWidth).toBeGreaterThan(0.58);
  expect(detailGeometry.mediaWidth / detailGeometry.contentWidth).toBeLessThan(0.8);
  expect(detailGeometry.mediaImageHeight / detailGeometry.mediaWidth).toBeGreaterThan(0.6);
  expect(Math.max(...detailGeometry.tabs) - Math.min(...detailGeometry.tabs)).toBeLessThanOrEqual(1);
  expect(detailGeometry.primaryActions).toBe(1);

  await gotoRoute(page, `spot/sky/index?spotId=${encodedSpotId}`);
  const sky = page.locator('[data-route="sky-main"]');
  expect(await sky.locator(".sky-subnav__tab").allTextContents()).toEqual([
    "今晚", "专业数据", "目标", "简化天图",
  ]);
  await expect(sky.locator(".sky-subnav__tab--active")).toHaveText("今晚");
  await expect(sky.locator(".metric-grid")).toBeVisible();
  await expectNoPageOverflow(page);
});

test("My keeps the four-tab responsibility map and breakpoint-safe 2x2 entries", async ({ page }, testInfo) => {
  await gotoRoute(page, "pages/my/index");
  const my = page.locator('[data-route="my-library"]');
  expect(await my.locator(".my-tab").allTextContents()).toEqual([
    "我的", "收藏", "计划", "设置",
  ]);
  await expect(my.locator(".profile-card")).toBeVisible();
  await expect(my.locator(".entry-card")).toHaveCount(4);
  await expect(my.locator(".demo-boundary")).toBeVisible();
  const columns = await my.locator(".entry-grid").evaluate((element) =>
    getComputedStyle(element).gridTemplateColumns.split(" ").length,
  );
  expect(columns).toBe(testInfo.project.name.includes("320") ? 1 : 2);
  await expectNoPageOverflow(page);
});
