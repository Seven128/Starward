import { test, expect } from "@playwright/test";
import { resetAcceptanceState } from "./acceptance-state.mjs";

const SPOT_ID = "spot:sz-astronomical-observatory";

function watchRuntime(page) {
  const faults = [];
  page.on("pageerror", (error) => faults.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") faults.push(`console: ${message.text()}`);
  });
  return faults;
}

async function expectCleanRuntime(faults) {
  expect(faults, "browser console and page runtime stay error-free").toEqual(
    [],
  );
}

async function expectResponsiveAndTouchable(page) {
  const metrics = await page.evaluate(() => {
    const root = document.documentElement;
    const candidates = Array.from(
      document.querySelectorAll(
        ".soft-button,.chip,.segment-tab,.account-row,.filter-option,.conditions-overlay-option,taro-tabbar a,[role='button'].field",
      ),
    );
    const tooSmall = candidates
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return (
          rect.width > 0 &&
          rect.height > 0 &&
          style.visibility !== "hidden" &&
          style.display !== "none" &&
          (rect.width < 43.5 || rect.height < 43.5)
        );
      })
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          label:
            element.getAttribute("aria-label") ||
            element.textContent?.trim().slice(0, 40) ||
            element.tagName,
          width: Math.round(rect.width * 10) / 10,
          height: Math.round(rect.height * 10) / 10,
        };
      });
    return {
      horizontalOverflow: Math.max(0, root.scrollWidth - root.clientWidth),
      rootFontPx: Number.parseFloat(getComputedStyle(root).fontSize),
      tooSmall,
    };
  });
  expect(metrics.horizontalOverflow).toBeLessThanOrEqual(1);
  expect(metrics.rootFontPx).toBeGreaterThanOrEqual(19.9);
  expect(metrics.tooSmall).toEqual([]);
}

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

test.beforeEach(async ({ request }) => {
  await resetAcceptanceState(request);
});

test("[ac:browser-proxy-live] map production root is live, responsive and provider-isolated", async ({
  page,
}, testInfo) => {
  const faults = watchRuntime(page);
  if (testInfo.project.name.includes("reduced-motion")) {
    await page.emulateMedia({ reducedMotion: "reduce" });
  }
  await page.goto("/");
  const root = page.locator('[data-miniapp-production-root][data-route="map"]');
  await expect(root).toBeVisible();
  await expect(root).toHaveAttribute(
    "data-delivery-target",
    "target.system.wechat-miniapp-soft-instruments-2026-08-05",
  );
  await expect(page.getByText("H5 诊断代理", { exact: true })).toBeVisible();
  await expect(
    page.getByText("不连接第三方底图", { exact: false }),
  ).toBeVisible();
  await expect(page.locator('[data-od-id="map-search-summary"]')).toBeVisible();
  await expect(
    page.locator('[data-od-id="map-analysis-time-bar"]'),
  ).toBeVisible();
  await expectResponsiveAndTouchable(page);
  if (testInfo.project.name.includes("reduced-motion")) {
    const reduced = await page.evaluate(() => ({
      media: matchMedia("(prefers-reduced-motion: reduce)").matches,
      transitionMs: Math.max(
        ...getComputedStyle(document.querySelector(".soft-button"))
          .transitionDuration.split(",")
          .map(
            (value) =>
              Number.parseFloat(value) * (value.includes("ms") ? 1 : 1000),
          ),
      ),
    }));
    expect(reduced.media).toBe(true);
    expect(reduced.transitionMs).toBeLessThanOrEqual(100);
  }
  await expectCleanRuntime(faults);
});

test("Finder owns exactly 18 filters and returns a formal result to the same map", async ({
  page,
}) => {
  const faults = watchRuntime(page);
  await page.goto("/");
  await page.locator('[data-od-id="map-search-summary"]').click();
  const finder = page.locator(
    '.source-lift-focus-layer[role="dialog"][data-variant="panelOnly"]',
  );
  await expect(finder).toBeVisible();
  await finder.getByLabel("打开筛选，当前 0 项").click();
  const filters = finder.getByRole("region", { name: "Finder 筛选条件" });
  await expect(filters.locator(".filter-option")).toHaveCount(18);
  await expect(
    filters.locator(
      '[data-od-id="spot-finder-filter-first-level"] .filter-option',
    ),
  ).toHaveCount(10);
  await expect(
    filters.locator(
      '[data-od-id="spot-finder-filter-advanced"] .filter-option',
    ),
  ).toHaveCount(8);
  const first = filters.locator(".filter-option").first();
  await first.click();
  await expect(first).toHaveAttribute("aria-pressed", "true");
  await filters.getByLabel("重置筛选草稿").click();
  await expect(first).toHaveAttribute("aria-pressed", "false");
  await filters.getByLabel("应用筛选，共 0 项").click();
  await expect(finder.locator(".finder-results")).toBeVisible();
  await expect(finder.getByText("Wanted", { exact: true })).toBeVisible();
  await expect(finder.getByText("Other", { exact: true })).toBeVisible();
  await finder.getByLabel(/选择深圳市天文台并回到地图/).click();
  await expect(finder).toBeHidden();
  const callout = page.locator('[data-od-id="map-selected-spot-callout"]');
  await expect(callout).toContainText("深圳市天文台");
  await expect(callout.getByLabel("查看深圳市天文台详情")).toBeVisible();
  await expectResponsiveAndTouchable(page);
  await expectCleanRuntime(faults);
});

test("map Conditions previews one time and one analysis layer without replacing the map", async ({
  page,
}) => {
  const faults = watchRuntime(page);
  await page.goto("/");
  const mapStage = page.locator('[data-od-id="map-base"]');
  await page.locator('[data-od-id="map-analysis-time-bar"]').click();
  const conditions = page.locator(
    '.source-lift-focus-layer[role="dialog"][data-variant="mapCoupled"]',
  );
  await expect(conditions).toBeVisible();
  await expect(mapStage).toBeVisible();
  await expect(conditions.getByLabel("调整观测时间")).toBeVisible();
  const lightPollution = conditions.locator(".conditions-overlay-option", {
    hasText: "光害",
  });
  await lightPollution.click();
  await expect(lightPollution).toHaveAttribute("aria-pressed", "true");
  await conditions.getByLabel("应用观测条件").click();
  await expect(conditions).toBeHidden();
  await expect(page.locator('[data-od-id="map-analysis-state"]')).toContainText(
    "光害",
  );
  await expect(mapStage).toBeVisible();
  await expectCleanRuntime(faults);
});

test("Spot Detail has three tabs and hands a complete observation-night context to Spot Night", async ({
  page,
}) => {
  const faults = watchRuntime(page);
  await openDetailFromMap(page);
  const detail = page.locator('[data-route="spot-detail"]');
  await expect(detail).toHaveAttribute("data-spot-id", SPOT_ID);
  expect(await detail.locator(".segment-tab").allTextContents()).toEqual([
    "概览",
    "攻略",
    "场地",
  ]);
  await expect(detail.getByLabel("查看深圳市天文台此处夜空")).toBeVisible();
  await expect(
    detail.getByLabel("去这里，打开深圳市天文台外部地图"),
  ).toBeVisible();

  await detail.getByLabel("查看深圳市天文台此处夜空").click();
  const sky = page.locator('[data-route="spot-night"]');
  await expect(sky).toHaveAttribute("data-spot-id", SPOT_ID);
  await expect(sky.locator('[data-od-id="spot-night-context"]')).toContainText(
    "2026-08-22",
  );
  await expect(sky.getByLabel("调整观测时间")).toBeVisible();
  await expect(sky.locator('[data-od-id="sky-scene"]')).toBeVisible();
  await sky.getByRole("tab", { name: "数据" }).click();
  await expect(
    sky.locator('[data-od-id="sky-professional-matrix"]'),
  ).toBeVisible();
  await expect(sky.getByLabel("进入观测红模式")).toHaveCount(0);
  await expectResponsiveAndTouchable(page);
  await expectCleanRuntime(faults);
});

test("My is an account center and Plan and Settings remain standalone recoverable flows", async ({
  page,
}) => {
  const faults = watchRuntime(page);
  await openMy(page);
  const my = page.locator('[data-route="my-account-center"]');
  await expect(my.locator(".my-tab")).toHaveCount(0);
  await expect(my.getByLabel(/打开观星计划/)).toBeVisible();
  await expect(my.locator(".account-row", { hasText: "设置" })).toBeVisible();
  await expect(my.getByLabel(/管理外部主页链接/)).toBeVisible();
  await expect(my.getByLabel("导入我的观星帖")).toBeVisible();

  await my.getByLabel(/打开观星计划/).click();
  const plan = page.locator('[data-route="plan-editor"]');
  await plan
    .locator('taro-textarea-core[aria-label="观测计划备注"] textarea')
    .fill("带三脚架、同伴和撤离照明");
  await plan.getByLabel("保存观测计划").click();
  await expect(plan.getByText("计划已保存", { exact: true })).toBeVisible();
  await expect(
    plan.getByText("已持久化并回读修订 1", { exact: false }),
  ).toBeVisible();

  await openMy(page);
  await page.locator(".account-row", { hasText: "设置" }).click();
  const settings = page.locator('[data-route="my-settings"]');
  await settings
    .locator('[data-od-id="display-mode-switcher"] .chip', {
      hasText: "夜间",
    })
    .click();
  await expect(settings).toHaveClass(/theme-night/);
  await settings.getByLabel("进入观测红模式").click();
  await expect(settings).toHaveClass(/theme-observation/);
  await settings.getByLabel("退出观测红模式").click();
  await expect(settings).toHaveClass(/theme-night/);
  await settings.getByLabel("大字模式").click();
  await expect(settings).toHaveClass(/large-text/);
  await settings.getByLabel("减少动态").click();
  await expect(settings).toHaveClass(/reduced-motion/);
  await expectResponsiveAndTouchable(page);
  await expectCleanRuntime(faults);
});

test("external-link validation and own-post manual import keep guarded recovery loops", async ({
  page,
}) => {
  const faults = watchRuntime(page);
  await openMy(page);
  await page.getByLabel(/管理外部主页链接/).click();
  const links = page.locator('[data-route="profile-links"]');
  await links
    .locator('taro-input-core[aria-label="主页链接展示名称"] input')
    .fill("我的摄影主页");
  const externalUrl = links.locator(
    'taro-input-core[aria-label="外部主页 URL"] input',
  );
  await externalUrl.fill("javascript:alert(1)");
  await links.getByLabel("保存外部主页链接").click();
  await expect(links.getByText("链接未保存", { exact: true })).toBeVisible();
  await externalUrl.fill("https://example.com/observer");
  await links.getByLabel("保存外部主页链接").click();
  await expect(
    links.locator(".link-card", { hasText: "https://example.com/observer" }),
  ).toContainText("我的摄影主页");

  await openMy(page);
  await page.getByLabel("导入我的观星帖").click();
  const importer = page.locator('[data-route="own-post-import"]');
  await importer
    .locator('taro-input-core[aria-label="原帖子分享链接"] input')
    .fill("https://example.com/my-stargazing-post");
  await importer.getByLabel("确认本人拥有导入和编辑权利").click();
  await importer.getByLabel("保存来源并进入手动编辑").click();
  await expect(
    importer.getByText("自动解析未获许可", { exact: false }),
  ).toBeVisible();
  await importer.getByLabel("保存来源并进入手动编辑").click();
  await importer
    .locator('taro-input-core[aria-label="导入草稿标题"] input')
    .fill("深圳天文台观星记录");
  await importer
    .locator('taro-textarea-core[aria-label="导入草稿正文"] textarea')
    .fill("这是本人手动粘贴并编辑的观星记录。天气和开放状态需另行核验。");
  await importer.getByLabel("保存草稿并关联点位").click();
  await importer.getByLabel("创建独立新增观星地点提案").click();
  await importer.getByLabel("进入导入预览").click();
  await importer.getByLabel("提交内容审核").click();
  const review = importer.locator(".import-form", { hasText: "5. 审核状态" });
  await expect(review.getByText("持续来源沿袭", { exact: true })).toBeVisible();
  await expect(review.getByText("内容审核", { exact: true })).toBeVisible();
  await expect(review.getByText("点位提案审核", { exact: true })).toBeVisible();
  await expect(
    review.locator(".status-tag", { hasText: "PENDING" }),
  ).toHaveCount(2);
  await expectCleanRuntime(faults);
});
