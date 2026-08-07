import { test, expect } from "@playwright/test";
import { resetAcceptanceState } from "./acceptance-state.mjs";

const SPOT_ID = "spot:sz-astronomical-observatory";
const encodedSpotId = encodeURIComponent(SPOT_ID);

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
        ".soft-button,.chip,.segment-tab,.my-tab,.entry-card,taro-tabbar a,[role='button'].field",
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
  expect(metrics.horizontalOverflow, "no page-level horizontal overflow").toBeLessThanOrEqual(1);
  expect(metrics.rootFontPx, "750rpx responsive root is initialized").toBeGreaterThanOrEqual(19.9);
  expect(metrics.tooSmall, "visible declared controls meet the 44px target").toEqual([]);
}

async function gotoRoute(page, route) {
  await page.goto(`/#/${route}`);
  await expect(page.locator("[data-miniapp-production-root], [data-route]").first()).toBeVisible();
}

test.beforeEach(async ({ request }) => {
  await resetAcceptanceState(request);
});

test("[ac:browser-proxy-live] current production-derived root is live, responsive and provider-isolated", async ({
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
  await expect(page.getByText("查看 26 个正式点位", { exact: true })).toBeVisible();
  await expect(page.getByText("不连接第三方底图", { exact: false })).toBeVisible();
  await expect(page.getByText("深圳市天文台", { exact: true })).toBeVisible();
  await expectResponsiveAndTouchable(page);

  if (testInfo.project.name.includes("reduced-motion")) {
    const reduced = await page.evaluate(() => {
      const button = document.querySelector(".soft-button");
      return {
        media: matchMedia("(prefers-reduced-motion: reduce)").matches,
        transitionMs: button
          ? Math.max(
              ...getComputedStyle(button)
                .transitionDuration.split(",")
                .map((value) => Number.parseFloat(value) * (value.includes("ms") ? 1 : 1000)),
            )
          : Number.POSITIVE_INFINITY,
      };
    });
    expect(reduced.media).toBe(true);
    expect(reduced.transitionMs).toBeLessThanOrEqual(100);
  }
  await expectCleanRuntime(faults);
});

test("map filter draft, search, list and formal-spot detail stay synchronized", async ({ page }) => {
  const faults = watchRuntime(page);
  await page.goto("/");
  await page.getByLabel("筛选观星点，已应用 0 项").click();
  const filterDialog = page.getByRole("dialog", { name: "筛选观星点" });
  await expect(filterDialog).toBeVisible();
  const chips = filterDialog.locator(".chip");
  await expect(chips).toHaveCount(27);
  const compatibleFilter = filterDialog.locator(".chip", { hasText: "6级以下" });
  await compatibleFilter.click();
  await expect(compatibleFilter).toHaveAttribute("aria-pressed", "true");
  await filterDialog.getByLabel("应用筛选，共 1 项").click();
  await expect(page.getByLabel("筛选观星点，已应用 1 项")).toBeVisible();

  const search = page.getByRole("searchbox", { name: "搜索观星点、城市或普通地点" });
  await search.fill("天文台");
  const searchDialog = page.getByRole("dialog", { name: "搜索结果" });
  await expect(searchDialog).toBeVisible();
  await expect(searchDialog.getByText("普通地点边界", { exact: true })).toBeVisible();
  await expect(searchDialog.getByLabel("查看深圳市天文台详情")).toBeVisible();
  await gotoRoute(page, `spot/detail/index?spotId=${encodedSpotId}`);
  const detail = page.locator('[data-route="spot-detail"]');
  await expect(detail).toBeVisible();
  await expect(detail).toHaveAttribute("data-spot-id", SPOT_ID);
  await expect(
    detail.getByText("示例情景：条件一般，谨慎考虑", { exact: true }),
  ).toBeVisible();
  await expect(
    detail.getByText("示例数据", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    detail.getByText(
      "静态身份与代表媒体可用；天气结论为明确标注的 Demo 情景，开放和设施事实仍需核验。",
      { exact: false },
    ),
  ).toBeVisible();

  for (const segment of ["攻略", "场地", "夜空"]) {
    await detail.locator(".segment-tab", { hasText: segment }).click();
    await expect(detail.locator(".segment-tab--active", { hasText: segment })).toBeVisible();
  }
  await expectResponsiveAndTouchable(page);
  await expectCleanRuntime(faults);
});

test("spot night keeps spot/date/time context and enters strict black warm-red observation mode", async ({ page }) => {
  const faults = watchRuntime(page);
  await gotoRoute(page, `spot/sky/index?spotId=${encodedSpotId}`);
  const sky = page.locator('[data-route="sky-main"]');
  await expect(sky).toHaveAttribute("data-spot-id", SPOT_ID);
  await expect(sky.getByText("今晚结论", { exact: true })).toBeVisible();
  await expect(sky.getByText("当前计算，不使用示例冒充", { exact: true })).toBeVisible();
  await expect(sky.getByLabel("观测时间滑杆")).toBeVisible();
  await expect(sky.getByLabel("进入黑红观测模式")).toBeVisible();
  await gotoRoute(page, `sky/observe/index?spotId=${encodedSpotId}`);

  const observation = page.locator('[data-route="observation"]');
  await expect(observation).toBeVisible();
  await expect(observation).toHaveAttribute("data-spot-id", SPOT_ID);
  await expect(observation.getByText("默认关闭，避免破坏暗适应", { exact: true })).toBeVisible();
  const colors = await observation.evaluate((element) => {
    const style = getComputedStyle(element);
    const primary = getComputedStyle(element).getPropertyValue("--primary").trim();
    return { background: style.backgroundColor, primary };
  });
  expect(colors.background).toBe("rgb(0, 0, 0)");
  expect(colors.primary.toLowerCase()).toBe("#ff514a");
  await expectResponsiveAndTouchable(page);
  await expectCleanRuntime(faults);
});

test("My owns favorites, plans, settings, external links and accessibility preferences", async ({ page }) => {
  const faults = watchRuntime(page);
  await page.goto("/");
  await page.getByLabel("收藏深圳市天文台").click();
  await expect(page.getByRole("link", { name: "我的" })).toBeVisible();
  await gotoRoute(page, "pages/my/index");
  const my = page.locator('[data-route="my-library"]');
  await expect(my).toBeVisible();
  await expect(my.locator('[data-my-tab="my"]')).toBeVisible();
  await expect(my.getByLabel("管理外部主页链接")).toBeVisible();
  await expect(my.getByLabel("导入我的观星帖")).toBeVisible();

  await my.locator(".my-tab", { hasText: "收藏" }).click();
  await expect(my.locator('[data-my-tab="favorites"]')).toBeVisible();
  await expect(my.getByText("深圳市天文台", { exact: true })).toBeVisible();

  await my.locator(".my-tab", { hasText: "计划" }).click();
  await expect(my.locator('[data-my-tab="plan"]')).toBeVisible();
  await expect(my.getByLabel("新建观测计划")).toBeVisible();
  await gotoRoute(page, "content/plan/detail/index");
  const plan = page.locator('[data-route="plan-editor"]');
  await expect(plan).toBeVisible();
  await plan
    .locator('taro-textarea-core[aria-label="观测计划备注"] textarea')
    .fill("带三脚架、同伴和撤离照明");
  await plan.getByLabel("保存观测计划").click();
  await expect(
    plan.getByText("计划已持久化并回读修订 1", { exact: false }),
  ).toBeVisible();
  await gotoRoute(page, "pages/my/index");
  await expect(my).toBeVisible();
  await my.locator(".my-tab", { hasText: "计划" }).click();
  await expect(my.getByText("带三脚架、同伴和撤离照明", { exact: true })).toBeVisible();
  await expect(my.getByText("修订 1", { exact: false })).toBeVisible();
  await my.locator(".my-tab", { hasText: "设置" }).click();
  await expect(my.locator('[data-my-tab="settings"]')).toBeVisible();
  await my.locator(".mode-grid .chip", { hasText: "夜间" }).click();
  await expect(my).toHaveClass(/theme-night/);
  await my.getByLabel("大字模式").click();
  await expect(my).toHaveClass(/large-text/);
  await my.getByLabel("减少动态").click();
  await expect(my).toHaveClass(/reduced-motion/);
  const preferenceMotionMs = await my.evaluate((element) => {
    const button = element.querySelector(".soft-button");
    return button
      ? Math.max(
          ...getComputedStyle(button)
            .transitionDuration.split(",")
            .map((value) => Number.parseFloat(value) * (value.includes("ms") ? 1 : 1000)),
        )
      : Number.POSITIVE_INFINITY;
  });
  expect(preferenceMotionMs).toBeLessThanOrEqual(100);
  await expectResponsiveAndTouchable(page);
  await expectCleanRuntime(faults);
});

test("external-link validation and own-post manual import complete their gated fallback loops", async ({ page }) => {
  const faults = watchRuntime(page);
  await gotoRoute(page, "content/profile/links/index");
  const links = page.locator('[data-route="profile-links"]');
  await links
    .locator('taro-input-core[aria-label="主页链接展示名称"] input')
    .fill("我的摄影主页");
  const externalUrl = links.locator(
    'taro-input-core[aria-label="外部主页 URL"] input',
  );
  await externalUrl.fill("javascript:alert(1)");
  await links.getByLabel("保存外部主页链接").click();
  await expect(links.getByText("链接未保存", { exact: false })).toBeVisible();
  await externalUrl.fill("https://example.com/observer");
  await links.getByLabel("保存外部主页链接").click();
  await expect(links.getByText("链接已持久化", { exact: false })).toBeVisible();
  await expect(links.getByLabel("复制我的摄影主页链接")).toBeVisible();
  await expect(links.getByLabel("尝试打开我的摄影主页")).toBeVisible();

  await gotoRoute(page, "content/import/index");
  const importer = page.locator('[data-route="own-post-import"]');
  await importer
    .locator('taro-input-core[aria-label="原帖子分享链接"] input')
    .fill("https://example.com/my-stargazing-post");
  await importer.getByLabel("确认本人拥有导入和编辑权利").click();
  await importer.getByLabel("保存来源并进入手动编辑").click();
  await expect(importer.getByText("自动解析未获许可；手动导入始终可用", { exact: false })).toBeVisible();
  await importer.getByLabel("保存来源并进入手动编辑").click();
  await expect(importer.getByText("2. 手动编辑草稿", { exact: true })).toBeVisible();
  await importer
    .locator('taro-input-core[aria-label="导入草稿标题"] input')
    .fill("深圳天文台观星记录");
  await importer
    .locator('taro-textarea-core[aria-label="导入草稿正文"] textarea')
    .fill("这是本人手动粘贴并编辑的观星记录。天气和开放状态需另行核验。");
  await importer.getByLabel("保存草稿并关联点位").click();
  await importer.getByLabel("创建独立新增观星地点提案").click();
  await importer.getByLabel("进入导入预览").click();
  await expect(importer.getByText("持续来源沿袭", { exact: true })).toBeVisible();
  await importer.getByLabel("提交内容审核").click();
  await expect(importer.getByText("Demo 已完成提交闭环", { exact: false })).toBeVisible();
  await expect(importer.getByText("内容审核", { exact: true })).toBeVisible();
  await expect(importer.getByText("点位提案审核", { exact: true })).toBeVisible();
  await expectResponsiveAndTouchable(page);
  await expectCleanRuntime(faults);
});
