import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test, { before } from "node:test";
import { inspectCandidate } from "./inspect-production.mjs";
import { fingerprintBundle, inspectReleaseBundleBudget, resolveManifestBundleRoot, verifyCompiledOrigin } from "./release-bundle-artifact.mjs";
import { releaseArtifactRoot, repositoryRoot } from "./release-bundle-request.mjs";

let root, manifest;
before(async () => {
  const manifestPath = path.resolve(process.env.MINIAPP_BUILT_CANDIDATE_MANIFEST ?? path.join(releaseArtifactRoot, "ci.manifest.json"));
  const relative = path.relative(releaseArtifactRoot, manifestPath);
  assert.ok(relative && !relative.startsWith("..") && !path.isAbsolute(relative), "the selected manifest must belong to the release owner");
  manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  assert.equal(manifest.status, "built");
  assert.ok(["ci-structural-nondeployable", "environment-bound"].includes(manifest.candidateClass));
  root = await resolveManifestBundleRoot(manifest);
  const fingerprint = await fingerprintBundle(root);
  assert.deepEqual(fingerprint, manifest.bundle, "inspect the exact manifest-bound candidate");
  const config = JSON.parse(readFileSync(path.join(root, "project.config.json"), "utf8"));
  if (manifest.schemaVersion !== "starward-weapp-release-bundle-v1") {
    const binding = await verifyCompiledOrigin({ ...manifest, appId: config.appid }, fingerprint, root);
    if (manifest.compiledSkyOrigin !== undefined) assert.deepEqual(binding, manifest.compiledSkyOrigin);
  }
  const budget = await inspectReleaseBundleBudget(fingerprint, root);
  if (manifest.schemaVersion === "starward-weapp-release-bundle-v3") assert.deepEqual(budget, manifest.packageBudget);
});


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
  const inspection = await inspectCandidate({ bundleDirectory: path.relative(repositoryRoot, root).replaceAll("\\", "/") });
  assert.equal(inspection.passed, true, "the complete candidate inspection must pass, including compiled runtime availability");
  assert.deepEqual(inspection.routes, expectedRoutes);
  assert.equal(inspection.checks.native_project, true);
  assert.equal(inspection.checks.filter_population, true);
  assert.equal(inspection.checks.route_files, true);
  assert.equal(inspection.checks.package_budget, true);
  assert.equal(inspection.package_limits.per_package_bytes, 2 * 1024 * 1024);
  assert.equal(inspection.package_limits.aggregate_bytes, 20 * 1024 * 1024);

});

test("subpackages reuse byte-identical main icons without duplicate copies", () => {
  const declaration = JSON.parse(readFileSync(path.resolve("apps/wechat-miniapp/src/components/main-b-icon-files.json"), "utf8"));
  for (const filename of declaration.files.filter(file => !declaration.mainOnlyVariants.includes(file))) {
    assert.deepEqual(readFileSync(path.join(root, "assets/b-icons", filename)),
      readFileSync(path.resolve("apps/wechat-miniapp/runtime-assets/b-icons", filename)), `shared bitmap ${filename}`);
    for (const prefix of ["content", "spot", "sky"])
      assert.equal(existsSync(path.join(root, prefix, "assets/b-icons", filename)), false, `${prefix} does not duplicate ${filename}`);
  }
});

test("shared facility cards ship their adopted icons in Map, field and article packages", () => {
  const originals = path.resolve("apps/wechat-miniapp/runtime-assets/b-icons");
  for (const prefix of ["", "spot", "content"]) {
    for (const name of ["parking", "restroom"]) {
      const filename = `${name}--day--default.png`;
      const source = prefix ? originals : path.resolve(originals, "../b-icons-main");
      assert.deepEqual(readFileSync(path.join(root, prefix, "assets/b-icons", filename)), readFileSync(path.join(source, filename)), `${prefix || "main"} facility icon`);
    }
  }
});

test("runtime dependency licenses remain bundled after moving out of the main package", () => {
  assert.equal(existsSync(path.join(root, "content/assets/licenses/runtime-dependencies.json")), true);
});

test("native weather templates retain role, layout and accessibility bindings", () => {
  const templates = readFileSync(path.join(root, "base.wxml"), "utf8");
  const tags = templates.match(/<packaged-icon\s[^>]*>/gu) ?? [];
  assert.ok(tags.length > 0, "native weather tags must exist in the compiled template");
  for (const tag of tags) {
    for (const binding of [
      'kind="{{i.kind}}"', 'class="{{i.cl}}"',
      'aria-hidden="{{i.ariaHidden}}"', 'aria-role="{{i.ariaRole}}"', 'aria-label="{{i.ariaLabel}}"',
    ]) assert.ok(tag.includes(binding), `compiled weather tag lost ${binding}`);
  }
});

test("async bitmap consumers share original spot-package assets", () => {
  for (const page of ["pages/map", "pages/my"]) {
    const config = JSON.parse(readFileSync(path.join(root, `${page}/index.json`), "utf8"));
    assert.equal(config.usingComponents["packaged-icon"], "../../spot/native/packaged-icon/index");
    assert.equal(config.componentPlaceholder["packaged-icon"], "view");
  }
  for (const extension of ["js", "json", "wxml", "wxss"])
    assert.equal(existsSync(path.join(root, `spot/native/packaged-icon/index.${extension}`)), true);
  const originals = path.resolve("apps/wechat-miniapp/runtime-assets/b-icons");
  for (const name of ["temperature", "wind", "droplet", "warning", "low-cloud", "images", "plan-suv", "clock", "sun", "telescope", "share", "place-pin"]) {
    const filename = `${name}--day--default.png`;
    assert.deepEqual(readFileSync(path.join(root, "spot/assets/b-icons", filename)), readFileSync(path.join(originals, filename)));
  }
  for (const name of ["images", "plan-suv", "clock", "sun", "telescope", "share", "place-pin"])
    assert.equal(existsSync(path.join(root, `assets/b-icons/${name}--day--default.png`)), false);
  assert.deepEqual(readFileSync(path.join(root, "assets/b-icons/settings--day--default.png")),
    readFileSync(path.join(originals, "settings--day--default.png")));
  for (const prefix of ["spot", "sky"])
    assert.equal(existsSync(path.join(root, prefix, "assets/b-icons/horizon--day--default.png")), true);
});
