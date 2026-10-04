import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, stat, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { assertSkyStaticRecord, mergeSkyStaticBundles, skyStaticDeliveryFragment, skyStaticHash, validateSkyStaticBundle, writeSkyStaticBundle } from "./sky-static-bundle.mjs";

const headers = { "content-type": "image/jpeg", "cache-control": "public, max-age=31536000, immutable", "x-content-type-options": "nosniff" };
const asset = (version, bytes = Buffer.from("image")) => ({ route: `/v2/sky/moon/${version.repeat(64)}/texture.jpg`, bytes, headers });

test("selected immutable JSON headers cannot become Caddy tokens or placeholders", () => {
  const record = { route: `/v2/sky/deep-sky/${"1".repeat(64)}/M-42/M-42-detail.${"2".repeat(64)}.png`,
    bytes: 8, sha256: "2".repeat(64), headers: { ...headers, "x-starward-image-display-support": JSON.stringify({ probe: "quote\" slash\\ # {http.request.uri}" }) } };
  assertSkyStaticRecord(record);
  const fragment = skyStaticDeliveryFragment([record]);
  assert.ok(fragment.includes("`\\\\{"));
  for (const value of [JSON.stringify({ probe: "{$ENV}" }), JSON.stringify({ probe: "` } respond injected" }), "{\n}", "{ }", "[]"])
    assert.throws(() => assertSkyStaticRecord({ ...record, headers: { ...record.headers, "x-starward-image-display-support": value } }), /header_invalid/);
  assert.throws(() => assertSkyStaticRecord({ ...record, headers: { ...headers, "other-header": "x" } }), /header_invalid/);
});
async function bundle(root, name, inputs) { return writeSkyStaticBundle(path.join(root, name), (async function* () { yield* inputs; })()); }

test("real immutable history union keeps both old and new URLs and rejects changed bytes or headers", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "starward-sky-history-"));
  const old = await bundle(root, "old", [asset("1")]), next = await bundle(root, "next", [asset("2", Buffer.from("next"))]);
  const union = await mergeSkyStaticBundles({ directories: [old.output, next.output], outputDirectory: path.join(root, "union") });
  const observed = await validateSkyStaticBundle(union.output);
  assert.deepEqual(observed.records.map((r) => r.route), [asset("1").route, asset("2").route]);
  assert.equal((await readFile(path.join(union.output, "files", asset("1").route))).toString(), "image");
  const changed = await bundle(root, "changed", [asset("1", Buffer.from("other"))]);
  await assert.rejects(mergeSkyStaticBundles({ directories: [union.output, changed.output], outputDirectory: path.join(root, "invalid") }), /history_conflict/);
  const headerChanged = await bundle(root, "headers", [{ ...asset("1"), headers: { ...headers, "x-starward-image-source": "different meaning" } }]);
  await assert.rejects(mergeSkyStaticBundles({ directories: [union.output, headerChanged.output], outputDirectory: path.join(root, "invalid-headers") }), /history_conflict/);
  assert.equal((await validateSkyStaticBundle(old.output)).publicationHash, old.publicationHash);
  await assert.rejects(stat(path.join(root, "invalid")), { code: "ENOENT" });
});

test("failed real stage never appears as a completed publication; fresh retry succeeds without overwriting failure", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "starward-sky-stage-"));
  await assert.rejects(writeSkyStaticBundle(path.join(root, "failed"), (async function* () { yield asset("1"); throw new Error("source interrupted"); })()), /source interrupted/);
  await assert.rejects(stat(path.join(root, "failed", "publication")), { code: "ENOENT" });
  const retained = await readdir(path.join(root, "failed"));
  assert.equal(retained.length, 1); assert.match(retained[0], /^\.building-/);
  assert.equal((await readFile(path.join(root, "failed", retained[0], "files", asset("1").route))).toString(), "image");
  await assert.rejects(bundle(root, "failed", [asset("1")]), { code: "EEXIST" });
  assert.equal((await validateSkyStaticBundle((await bundle(root, "retry", [asset("1")])).output)).files, 1);
});

test("actual readback detects same-length payload corruption and modified Caddy directives", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "starward-sky-corruption-"));
  const good = await bundle(root, "good", [asset("1")]);
  const file = path.join(good.output, "files", asset("1").route);
  await writeFile(file, "other");
  await assert.rejects(validateSkyStaticBundle(good.output), /file_identity_mismatch/);
  await writeFile(file, "image");
  await writeFile(path.join(good.output, "delivery.caddy"), "respond 200\n");
  await assert.rejects(validateSkyStaticBundle(good.output), /fragment_mismatch/);
});

test("a valid hash does not make a linked file or normalized path safe", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "starward-sky-link-"));
  const good = await bundle(root, "good", [asset("1")]);
  const external = path.join(root, "outside"); await writeFile(external, "image");
  const record = { route: `/v2/sky/constellations/${"1".repeat(64)}/assets/.`, bytes: 5, sha256: skyStaticHash("image"), headers };
  const index = { schemaVersion: "starward-sky-static-export-v1", publicationHash: skyStaticHash(JSON.stringify([record])), records: [record] };
  await writeFile(path.join(good.output, "index.json"), JSON.stringify(index));
  await assert.rejects(validateSkyStaticBundle(good.output), /record_invalid/);
  const linkRoot = path.join(root, "linked");
  try { await symlink(good.output, linkRoot, process.platform === "win32" ? "junction" : "dir"); }
  catch (error) { if (error.code === "EPERM") { t.diagnostic("link creation unavailable; normalized-route case remains verified"); return; } throw error; }
  await assert.rejects(validateSkyStaticBundle(linkRoot), /file_type_invalid/);
});
