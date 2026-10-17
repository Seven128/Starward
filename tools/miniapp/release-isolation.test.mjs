import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";
import { releaseBundleLocation, resolveReleaseBundleLocation } from "./release-bundle-location.cjs";
import { buildReleaseBundle, releaseBuildEnvironment, validateBuildRequest } from "./build-release-bundle.mjs";
import { createReleaseBundleOutput, fingerprintBundle, inspectReleaseBundleBudget, resolveManifestBundleRoot } from "./release-bundle-artifact.mjs";
import { writeCompiledSkyFixture } from "./compiled-sky-origin-test-support.mjs";

const id = "12345678-1234-4234-8234-123456789abc";
test("the compiler and consumer share one bounded release location and reject directory aliases", () => {
  const root = path.resolve("repo"), location = releaseBundleLocation(id, root);
  assert.deepEqual(resolveReleaseBundleLocation(location.bundleDirectory, root), location);
  assert.equal(location.taroOutputRoot, `../../${location.bundleDirectory}`);
  for (const bad of ["../weapp", location.bundleDirectory + "/", location.bundleDirectory.replace("/weapp", "/../weapp"),
    location.bundleDirectory.replaceAll("/", "\\"), "apps/wechat-miniapp/dist/weapp"])
    assert.throws(() => resolveReleaseBundleLocation(bad, root), /release_bundle_output_/u);
  assert.throws(() => releaseBundleLocation("../" + id, root), /output_id_invalid/u);
  const request = { apiOrigin: "https://api.release.invalid" };
  assert.equal(releaseBuildEnvironment(request, { MINIAPP_RELEASE_BUNDLE_ID: "stale" }).MINIAPP_RELEASE_BUNDLE_ID, "");
  assert.equal(releaseBuildEnvironment(request, {}, location).MINIAPP_RELEASE_BUNDLE_ID, id);
});

async function fixture(t) {
  const temporary = await mkdtemp(path.join(os.tmpdir(), "starward-release-isolation-"));
  const root = path.join(temporary, "repo"), source = path.join(root, "apps/wechat-miniapp/project.config.json");
  const primary = path.join(root, "apps/wechat-miniapp/dist/weapp");
  await mkdir(primary, { recursive: true });
  await writeFile(path.join(primary, "retained.txt"), "existing developer output\n");
  await writeFile(source, JSON.stringify({ appid: "wx" + "1".repeat(16), compileType: "miniprogram" }));
  const releaseRoot = path.join(root, "artifacts/miniapp/release");
  const request = { ...validateBuildRequest({ "--lane": "ci", "--api-origin": "https://api.release.invalid",
    "--sky-resource-origin": "https://images.release.invalid", "--source-revision": "a".repeat(40) }),
    outputManifest: path.join(releaseRoot, "ci.manifest.json") };
  const original = await fingerprintBundle(primary), sourceBytes = await readFile(source);
  const locations = [];
  const build = async (selected, location) => {
    locations.push(location); await mkdir(location.bundleRoot);
    await writeFile(path.join(location.bundleRoot, "app.json"), JSON.stringify({ pages: ["pages/main/index"] }));
    await writeFile(path.join(location.bundleRoot, "project.config.json"), JSON.stringify({ appid: "wx" + "1".repeat(16), compileType: "miniprogram", miniprogramRoot: "./" }));
    await writeCompiledSkyFixture(location.bundleRoot, selected);
  };
  t.after(async () => {
    const resolved = path.resolve(temporary);
    if (path.dirname(resolved) !== path.resolve(os.tmpdir()) || !path.basename(resolved).startsWith("starward-release-isolation-"))
      throw Error("release_isolation_test_cleanup_scope_invalid");
    await rm(resolved, { recursive: true, force: true });
  });
  return { temporary, root, source, primary, releaseRoot, request, original, sourceBytes, locations, build };
}

test("the real builder preserves development/earlier outputs and binds the new CI candidate, source and budget", async t => {
  const f = await fixture(t);
  const result = await buildReleaseBundle(f.request, { root: f.root, build: f.build });
  assert.equal(result.manifest.schemaVersion, "starward-weapp-release-bundle-v3");
  assert.equal(result.manifest.candidateClass, "ci-structural-nondeployable");
  assert.equal(await resolveManifestBundleRoot(result.manifest, { repositoryRoot: f.root }), result.bundleRoot);
  assert.deepEqual(await fingerprintBundle(f.primary), f.original);
  assert.deepEqual(await readFile(f.source), f.sourceBytes);
  assert.deepEqual(await inspectReleaseBundleBudget(result.manifest.bundle, result.bundleRoot), result.manifest.packageBudget);
  assert.deepEqual(JSON.parse(await readFile(f.request.outputManifest, "utf8")), result.manifest);
  const first = await fingerprintBundle(result.bundleRoot), manifestBytes = await readFile(f.request.outputManifest);
  await assert.rejects(buildReleaseBundle(f.request, { root: f.root, build: f.build }), /manifest_exists/u);
  assert.equal(f.locations.length, 1); assert.deepEqual(await readFile(f.request.outputManifest), manifestBytes);
  const next = await buildReleaseBundle({ ...f.request, outputManifest: path.join(f.releaseRoot, "second.manifest.json") }, { root: f.root, build: f.build });
  assert.notEqual(next.bundleRoot, result.bundleRoot);
  assert.deepEqual(await fingerprintBundle(result.bundleRoot), first);
  assert.deepEqual(await fingerprintBundle(f.primary), f.original);
});

test("failed builds, changed source identity and over-budget output retain partial files without publishing a built manifest", async t => {
  for (const kind of ["build", "source", "budget"]) await t.test(kind, async child => {
    const f = await fixture(child);
    const build = async (selected, location) => {
      await f.build(selected, location);
      if (kind === "build") throw Error("controlled_build_failure");
      if (kind === "source") await writeFile(f.source, Buffer.concat([f.sourceBytes, Buffer.from("\n")]));
      if (kind === "budget") await writeFile(path.join(location.bundleRoot, "oversize.bin"), Buffer.alloc(2 * 1024 * 1024));
    };
    await assert.rejects(buildReleaseBundle(f.request, { root: f.root, build }),
      kind === "build" ? /controlled_build_failure/u : kind === "source" ? /source_project_changed/u : /package_budget_exceeded/u);
    await assert.rejects(readFile(f.request.outputManifest), { code: "ENOENT" });
    assert.ok((await fingerprintBundle(f.locations[0].bundleRoot)).fileCount > 0);
    assert.deepEqual(await fingerprintBundle(f.primary), f.original);
  });
});

test("a reparse point cannot redirect release creation or v3 consumption", async t => {
  const f = await fixture(t), outside = path.join(f.temporary, "outside"); await mkdir(outside);
  await symlink(outside, path.join(f.root, "artifacts"), process.platform === "win32" ? "junction" : "dir");
  await assert.rejects(buildReleaseBundle(f.request, { root: f.root, build: f.build }), /directory_not_owned/u);
  assert.equal(f.locations.length, 0);
  await assert.rejects(resolveManifestBundleRoot({ schemaVersion: "starward-weapp-release-bundle-v3",
    bundleDirectory: releaseBundleLocation(id, f.root).bundleDirectory }, { repositoryRoot: f.root }), /directory_not_owned/u);
});

test("legacy versions cannot acquire a newly injected output-directory binding", async t => {
  const f = await fixture(t), location = await createReleaseBundleOutput(f.root);
  for (const version of [1, 2]) await assert.rejects(resolveManifestBundleRoot({ schemaVersion: `starward-weapp-release-bundle-v${version}`,
    bundleDirectory: location.bundleDirectory }, { repositoryRoot: f.root, bundleRoot: f.primary }), /legacy_output_unbound/u);
});

test("bounded mutation reintroducing the old development-output deletion demonstrates the preservation regression", async t => {
  const f = await fixture(t), sourceFile = new URL("./build-release-bundle.mjs", import.meta.url);
  const source = await readFile(sourceFile, "utf8");
  const needle = "    const location = await createReleaseBundleOutput(root), bundleRoot = location.bundleRoot;";
  assert.ok(source.includes(needle));
  const target = path.join(f.temporary, "bounded-legacy-cleanup-builder.mjs");
  const mutation = source.replace(needle, `${needle}\n` +
    `    if (path.resolve(root) !== ${JSON.stringify(f.root)}) throw Error("mutation_scope_invalid");\n` +
    `    await (await import("node:fs/promises")).rm(path.join(root, "apps/wechat-miniapp/dist/weapp"), {recursive:true, force:true});`)
    .replace(/from "(\.\/[^"\n]+)"/gu, (_, specifier) => `from ${JSON.stringify(new URL(specifier, import.meta.url).href)}`);
  await writeFile(target, mutation);
  const mutant = await import(pathToFileURL(target).href);
  await mutant.buildReleaseBundle(f.request, { root: f.root, build: f.build });
  await assert.rejects(fingerprintBundle(f.primary), { code: "ENOENT" }, "the old cleanup destroys a retained development output");
  assert.equal(await readFile(sourceFile, "utf8"), source);
});
