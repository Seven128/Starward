import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { writeCompiledSkyFixture } from "./compiled-sky-origin-test-support.mjs";
import { verifyCompiledSkyOrigin } from "./compiled-sky-origin.mjs";
import { fingerprintBundle, verifyCompiledOrigin } from "./release-bundle-artifact.mjs";

const binding = { lane: "ci", apiOrigin: "https://api.sky-resource-ci.invalid", skyResourceOrigin: "https://images.sky-resource-ci.invalid" };
async function fixture(t, options = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "starward-compiled-sky-origin-"));
  t.after(async () => {
    const target = await realpath(root), temporary = await realpath(os.tmpdir());
    assert.equal(path.dirname(target).toLowerCase(), temporary.toLowerCase());
    assert.match(path.basename(target), /^starward-compiled-sky-origin-/u);
    await rm(target, { recursive: true, force: true });
  });
  await writeCompiledSkyFixture(root, { ...binding, ...options });
  // Fingerprinting is intentionally awaited per call so altered fixture bytes
  // remain a rehashed candidate, not an unrelated stale-hash failure.
  return { root, async verify(request = binding) { return verifyCompiledOrigin(request, await fingerprintBundle(root), root); } };
}

test("actual compiler output exposes all five pure binding roles with minified module/export names", async t => {
  const f = await fixture(t), result = await f.verify();
  assert.equal(result.scope, "COMPILED_PURE_ADDRESS_OWNER");
  assert.equal(Object.keys(result.roles).length, 5); assert.ok(Object.values(result.roles).every(Boolean));
  assert.equal(result.pins.length, 2);
  const same = { ...binding, skyResourceOrigin: binding.apiOrigin }, s = await fixture(t, same);
  assert.ok(Object.values((await s.verify(same)).roles).every(Boolean));
});

test('subpackage address selection and shared credential policy are both evaluated from their pinned chunks', async t => {
  const f = await fixture(t, { splitOwners: true }), result = await f.verify();
  assert.equal(result.pins.length, 3);assert.notEqual(result.ownerId, result.previewOwnerId);
  assert.ok(Object.values(result.roles).every(Boolean));
  const common = path.join(f.root, 'common.js');
  await writeFile(common, await readFile(common, 'utf8') + `\nconst modules = wx.webpackJsonp[0][1];
    const id = Object.keys(modules).find(id => modules[id].toString().includes("sky_public_resource_preview_url_invalid"));
    modules["duplicate-preview"] = modules[id];`);
  await assert.rejects(f.verify(), /compiled_sky_owner_unavailable/u);
});

test("unused correct domain strings cannot approve an actually stale resource binding; bounded mutation proves the old escape", async t => {
  const f = await fixture(t, { skyResourceOrigin: "https://stale.sky-resource-ci.invalid" });
  await writeFile(path.join(f.root, "unused-domain.txt"), JSON.stringify(binding));
  await assert.rejects(f.verify(), /compiled_sky_origin_mismatch/u);
  const file = new URL("./release-bundle-artifact.mjs", import.meta.url), source = await readFile(file, "utf8");
  assert.ok(source.includes("  return verifyCompiledSkyOrigin(request, fingerprint, root);"));
  let mutant = source.replace("  return verifyCompiledSkyOrigin(request, fingerprint, root);", "  return { scope: 'TEXT_PRESENCE_ONLY_MUTATION' };");
  mutant = mutant.replace(/from "(\.\/[^"\n]+)"/gu, (_, specifier) =>
    `from ${JSON.stringify(new URL(specifier, import.meta.url).href)}`);
  const target = path.join(f.root, "bounded-mutant-artifact.mjs"); await writeFile(target, mutant);
  const module = await import(pathToFileURL(target).href);
  const weak = await module.verifyCompiledOrigin(binding, await fingerprintBundle(f.root), f.root);
  assert.equal(weak.scope, "TEXT_PRESENCE_ONLY_MUTATION");
  assert.equal(await readFile(file, "utf8"), source);
});

test("correct domain text cannot hide a stale API binding", async t => {
  const f = await fixture(t, { apiOrigin: "https://stale-api.sky-resource-ci.invalid" });
  await writeFile(path.join(f.root, "unused-domain.txt"), JSON.stringify(binding));
  await assert.rejects(f.verify(), /compiled_sky_origin_mismatch/u);
});

test("actual compiled cache environment must bind both origins even when URLs are correct", async t => {
  const original = 'return api === resource ? api : `${api}\\n${resource}`;';
  const f = await fixture(t, { transformSource: source => {
    assert.ok(source.includes(original)); return source.replace(original, "return api;");
  } });
  await assert.rejects(f.verify(), /compiled_sky_origin_mismatch/u);
});

test("a compiled API preview credential rejects formal consumption without revealing its value", async t => {
  const f = await fixture(t, { previewToken: "fixture-preview-credential" });
  await assert.rejects(f.verify(), error => error.message === "release_bundle_compiled_sky_origin_mismatch" && !error.message.includes("fixture-preview"));
});

test("unexpected entry callbacks and duplicate compiled owners are rejected before application consumption", async t => {
  for (const [name, extra] of [
    ["entry", 'wx.webpackJsonp[0].push(function() { globalThis.unrelatedEntry = true; });'],
    ["duplicate", 'const modules = wx.webpackJsonp[0][1]; const id = Object.keys(modules).find(id => modules[id].toString().includes("sky_public_resource_path_invalid")); modules["duplicate-owner"] = modules[id];'],
  ]) await t.test(name, async child => {
    const f = await fixture(child), filename = path.join(f.root, "common.js");
    await writeFile(filename, await readFile(filename, "utf8") + "\n" + extra);
    await assert.rejects(f.verify(), /compiled_sky_owner_unavailable/u);
  });
});

test("runtime bytes changed after fingerprinting cannot approve an old environment", async t => {
  const f = await fixture(t), fingerprint = await fingerprintBundle(f.root);
  await writeFile(path.join(f.root, "runtime.js"), "changed bytes");
  await assert.rejects(verifyCompiledSkyOrigin(binding, fingerprint, f.root), /compiled_sky_bytes_changed/u);
});
