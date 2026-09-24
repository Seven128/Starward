import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { inspectCandidate } from "./inspect-production.mjs";

// Run after the actual release bundle build; a missing bundle must fail.
test("built production candidate follows registered routes and package limits", async () => {
  const expectedRoutes = [
    "pages/map/index",
    "pages/my/index",
    "pages/auth/index",
    "spot/search/index",
    "spot/guides/index",
    "spot/field/index",
    "spot/plan/index",
    "spot/data-source/index",
    "sky/detail/index",
    "sky/sources/index",
    "content/article/detail/index",
    "content/plan/detail/index",
    "content/plan/list/index",
    "content/plan/edit/index",
    "content/achievement/index",
    "content/share/index",
    "content/event/list/index",
    "content/event/detail/index",
    "content/contribution/index",
    "content/spot-feedback/index",
    "content/settings/index",
  ];
  const inspection = await inspectCandidate();
  assert.deepEqual(inspection.routes, expectedRoutes);
  assert.equal(inspection.checks.native_project, true);
  assert.equal(inspection.checks.filter_population, true);
  assert.equal(inspection.checks.route_files, true);
  assert.equal(inspection.checks.package_budget, true);
  assert.equal(inspection.package_limits.per_package_bytes, 2 * 1024 * 1024);
  assert.equal(inspection.package_limits.aggregate_bytes, 20 * 1024 * 1024);

});

test("shared section empty icon is packaged for every Mini Program consumer", () => {
  const root = path.resolve("apps/wechat-miniapp/dist/weapp");
  for (const packageName of ["main", "content", "spot", "sky"]) {
    const prefix = packageName === "main" ? "" : packageName;
    assert.equal(existsSync(path.join(root, prefix, "assets/b-icons/info--day--default.png")), true,
      `${packageName} StatusPanel must resolve its adopted info icon`);
  }
});

test("runtime dependency licenses remain bundled after moving out of the main package", () => {
  assert.equal(existsSync(path.resolve("apps/wechat-miniapp/dist/weapp/content/assets/licenses/runtime-dependencies.json")), true);
});
