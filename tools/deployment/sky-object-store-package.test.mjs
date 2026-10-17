import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { skyStaticHash } from "./sky-static-bundle.mjs";
import { prepareSkyObjectStorePackage, readSkyObjectStorePackage } from "./sky-object-store-package.mjs";
import { objectStoreFixture as fixture, objectStoreTestHeaders as common } from "./sky-object-store-test-support.mjs";

test("OSS uses public keys for colliding tile/index paths and preserves exact bodies, standard headers and optional metadata", async t => {
  const s = await fixture(t, [{ route: `/v2/sky/deep-sky/${"c".repeat(64)}/M-42/M-42-detail.${"d".repeat(64)}.png`, bytes: Buffer.from("png-fixture"),
    headers: { ...common, "content-type": "image/png", "x-starward-image-display-support": JSON.stringify({ quote: "\" slash\\ comma, braces{}" }) } }]);
  const sourceBefore = await readFile(path.join(s.bundle.output, "index.json"));
  const result = await prepareSkyObjectStorePackage(s.args);
  assert.equal(result.cloudPublication, false);
  const { plan, packageSha256 } = await readSkyObjectStorePackage({ ...s.args, packageDirectory: result.directory });
  assert.equal(packageSha256, result.packageSha256);
  assert.equal(plan.files, 4); assert.equal(plan.bytes, s.inputs.reduce((n, input) => n + input.bytes.length, 0));
  const tile = plan.objects.find(object => object.objectKey === s.base.slice(1)), index = plan.objects.find(object => object.objectKey === s.base.slice(1) + "/index");
  assert.equal(tile.sourcePath, "files" + s.base + ".tile");
  assert.equal(index.sourcePath, "files" + s.base + "/index");
  assert(!tile.objectKey.endsWith(".tile")); assert(!tile.objectKey.startsWith("/"));
  for (const input of s.inputs) {
    const object = plan.objects.find(candidate => candidate.objectKey === input.route.slice(1));
    assert.equal(object.sha256, skyStaticHash(input.bytes));
    assert.equal(object.contentMd5, createHash("md5").update(input.bytes).digest("base64"));
    assert.equal(object.uploadHeaders["x-oss-forbid-overwrite"], "true");
    assert.equal(object.uploadHeaders["x-oss-meta-starward-content-sha256"], object.sha256);
    for (const [name, value] of Object.entries(input.headers)) {
      assert.equal(object.uploadHeaders[["content-type", "content-disposition", "cache-control"].includes(name) ? name : `x-oss-meta-${name}`], value);
    }
    assert.equal(object.uploadHeaders["content-encoding"], undefined);
  }
  assert((await readFile(path.join(s.bundle.output, "index.json"))).equals(sourceBefore));
  assert.deepEqual(await readdir(result.directory), ["plan.json"]);
  assert.equal(plan.requirements.bucketVersioning, "NEVER_ENABLED");
  assert.equal(plan.requirements.sourceAdmission, "SEALED_LOCAL_BUNDLE_INTEGRITY_ONLY");
  assert.equal(plan.requirements.esaRuleCompilation, "UNVERIFIED");
  assert(plan.esaRules.every(rule => rule.phase === "ORIGIN_TO_ESA" && rule.condition.includes("http.host eq \"sky-assets.invalid\"") && rule.condition.includes("exists(http.response.headers[")));
  const support = plan.esaRules.find(rule => rule.operations[0].name === "x-starward-image-display-support");
  assert.equal(support.operations[0].value, "http.response.headers[\"x-oss-meta-x-starward-image-display-support\"]");
});

test("changing a prepared key, metadata, delivery phase or overwrite policy is rejected against the original source", async t => {
  const s = await fixture(t), result = await prepareSkyObjectStorePackage(s.args), file = path.join(result.directory, "plan.json");
  const text = await readFile(file, "utf8");
  for (const mutation of [
    plan => { plan.objects[0].objectKey += ".tile"; },
    plan => { plan.objects[0].uploadHeaders["content-type"] = "application/octet-stream"; },
    plan => { plan.objects[0].uploadHeaders["x-oss-forbid-overwrite"] = "false"; },
    plan => { plan.esaRules[0].phase = "ESA_TO_CLIENT"; },
    plan => { plan.requirements.bucketVersioning = "SUSPENDED"; },
    plan => { plan.requirements.sourceAdmission = "TRUSTED_PRODUCTION_IMAGE"; },
  ]) {
    const plan = JSON.parse(text); mutation(plan); await writeFile(file, JSON.stringify(plan));
    await assert.rejects(readSkyObjectStorePackage({ ...s.args, packageDirectory: result.directory }), /package_changed/u);
  }
  await writeFile(file, text);
  assert.equal((await readSkyObjectStorePackage({ ...s.args, packageDirectory: result.directory })).packageSha256, result.packageSha256);
});

test("wrong edition, invalid origin, damaged source and source/output nesting never produce a ready package", async t => {
  const s = await fixture(t);
  for (const bad of ["http://sky-assets.invalid", "https://user:pass@sky-assets.invalid", "https://sky-assets.invalid/path",
    "https://sky-assets.invalid/?", "https://sky-assets.invalid/#", "https://.invalid", "https://sky-assets.invalid@other.invalid/path"]) {
    await assert.rejects(prepareSkyObjectStorePackage({ ...s.args, resourceOrigin: bad }), /origin_invalid/u);
  }
  await assert.rejects(prepareSkyObjectStorePackage({ ...s.args, publicationHash: "f".repeat(64) }), /publication_mismatch/u);
  await assert.rejects(prepareSkyObjectStorePackage({ ...s.args, outputDirectory: path.join(s.bundle.output, "nested") }), /output_invalid/u);
  await writeFile(path.join(s.bundle.output, "files" + s.base + ".tile"), Buffer.from([255, 216, 255, 216]));
  await assert.rejects(prepareSkyObjectStorePackage(s.args), /file_identity_mismatch/u);
  await assert.rejects(stat(s.args.outputDirectory), { code: "ENOENT" });
});

test("existing prepared output is preserved and a changed source invalidates future package consumption", async t => {
  const s = await fixture(t), result = await prepareSkyObjectStorePackage(s.args), file = path.join(result.directory, "plan.json");
  const before = await readFile(file);
  await assert.rejects(prepareSkyObjectStorePackage(s.args), { code: "EEXIST" });
  assert((await readFile(file)).equals(before));
  await writeFile(path.join(s.bundle.output, "files" + s.base + ".tile"), Buffer.from([255, 216, 255, 216]));
  await assert.rejects(readSkyObjectStorePackage({ ...s.args, packageDirectory: result.directory }), /file_identity_mismatch/u);
});

test("canonical but excessive display metadata is rejected before package creation", async t => {
  const s = await fixture(t, [{ route: `/v2/sky/deep-sky/${"c".repeat(64)}/M-42/M-42-detail.${"d".repeat(64)}.png`, bytes: Buffer.from("image"),
    headers: { ...common, "content-type": "image/png", "x-starward-image-display-support": JSON.stringify({ text: "x".repeat(8192) }) } }]);
  await assert.rejects(prepareSkyObjectStorePackage(s.args), /metadata_too_large/u);
  await assert.rejects(stat(s.args.outputDirectory), { code: "ENOENT" });
});
