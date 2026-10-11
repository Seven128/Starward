import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { inspectCandidate } from "./inspect-production.mjs";

const bundleDirectory = process.env.MINIAPP_TEST_BUNDLE ?? "apps/wechat-miniapp/dist/weapp";
const bundleRoot = path.resolve(bundleDirectory);

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
  const inspection = await inspectCandidate({ bundleDirectory });
  assert.deepEqual(inspection.routes, expectedRoutes);
  assert.equal(inspection.checks.native_project, true);
  assert.equal(inspection.checks.filter_population, true);
  assert.equal(inspection.checks.route_files, true);
  assert.equal(inspection.checks.package_budget, true);
  assert.equal(inspection.package_limits.per_package_bytes, 2 * 1024 * 1024);
  assert.equal(inspection.package_limits.aggregate_bytes, 20 * 1024 * 1024);

});

test("shared section empty icon is packaged for every Mini Program consumer", () => {
  const root = bundleRoot;
  for (const packageName of ["main", "content", "spot", "sky"]) {
    const prefix = packageName === "main" ? "" : packageName;
    assert.equal(existsSync(path.join(root, prefix, "assets/b-icons/info--day--default.png")), true,
      `${packageName} StatusPanel must resolve its adopted info icon`);
  }
});

test("runtime dependency licenses remain bundled after moving out of the main package", () => {
  assert.equal(existsSync(path.join(bundleRoot, "content/assets/licenses/runtime-dependencies.json")), true);
});

test("native weather templates retain role, layout and accessibility bindings", () => {
  const templates = readFileSync(path.join(bundleRoot, "base.wxml"), "utf8");
  const tags = templates.match(/<weather-icon\s[^>]*>/gu) ?? [];
  assert.ok(tags.length > 0, "native weather tags must exist in the compiled template");
  for (const tag of tags) {
    for (const binding of [
      'kind="{{i.kind}}"', 'class="{{i.cl}}"',
      'aria-hidden="{{i.ariaHidden}}"', 'aria-role="{{i.ariaRole}}"', 'aria-label="{{i.ariaLabel}}"',
    ]) assert.ok(tag.includes(binding), `compiled weather tag lost ${binding}`);
  }
});

test("Map async weather component and original images share the spot package", () => {
  const config = JSON.parse(readFileSync(path.join(bundleRoot, "pages/map/index.json"), "utf8"));
  assert.equal(config.usingComponents["weather-icon"], "../../spot/native/weather-icon/index");
  assert.equal(config.componentPlaceholder["weather-icon"], "view");
  for (const extension of ["js", "json", "wxml", "wxss"])
    assert.equal(existsSync(path.join(bundleRoot, `spot/native/weather-icon/index.${extension}`)), true);
  const originals = path.resolve("docs/design-resources/wechat-miniapp/shared/icons/adopted/b-matte-256/platform/weapp-runtime/assets");
  for (const name of ["temperature", "wind", "droplet"]) {
    const filename = `${name}--day--default.png`;
    assert.deepEqual(readFileSync(path.join(bundleRoot, "spot/assets/b-icons", filename)), readFileSync(path.join(originals, filename)));
  }
  for (const prefix of ["spot", "sky"])
    assert.equal(existsSync(path.join(bundleRoot, prefix, "assets/b-icons/horizon--day--default.png")), true);
});
