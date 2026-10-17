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
  assert.deepEqual(inspection.routes, expectedRoutes);
  assert.equal(inspection.checks.native_project, true);
  assert.equal(inspection.checks.filter_population, true);
  assert.equal(inspection.checks.route_files, true);
  assert.equal(inspection.checks.package_budget, true);
  assert.equal(inspection.package_limits.per_package_bytes, 2 * 1024 * 1024);
  assert.equal(inspection.package_limits.aggregate_bytes, 20 * 1024 * 1024);

});

test("shared section empty icon is packaged for every Mini Program consumer", () => {
  for (const packageName of ["main", "content", "spot", "sky"]) {
    const prefix = packageName === "main" ? "" : packageName;
    assert.equal(existsSync(path.join(root, prefix, "assets/b-icons/info--day--default.png")), true,
      `${packageName} StatusPanel must resolve its adopted info icon`);
  }
});

test("runtime dependency licenses remain bundled after moving out of the main package", () => {
  assert.equal(existsSync(path.join(root, "content/assets/licenses/runtime-dependencies.json")), true);
});
