import assert from "node:assert/strict";
import { cpSync } from "node:fs";
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { skyStaticHash, writeSkyStaticBundle } from "./sky-static-bundle.mjs";
import { prepareSkyStaticRelease } from "./sky-static-release.mjs";
import { prepareSkyObjectStorePackage } from "./sky-object-store-package.mjs";

export const objectStoreTestOrigin = "https://sky-assets.invalid";
export const objectStoreTestHeaders = { "cache-control": "public, max-age=31536000, immutable", "x-content-type-options": "nosniff" };
export async function objectStoreFixture(t, extra = []) {
  const root = await mkdtemp(path.join(os.tmpdir(), "starward-sky-object-store-"));
  const beforeCleanup = [];
  t.after(async () => {
    for (const dispose of beforeCleanup) await dispose();
    const target = await realpath(root), temporary = await realpath(os.tmpdir());
    assert.equal(path.dirname(target).toLowerCase(), temporary.toLowerCase());
    assert.match(path.basename(target), /^starward-sky-object-store-/u);
    await rm(target, { recursive: true, force: true });
  });
  const base = `/v2/sky/optical/${"a".repeat(64)}/ps1-dr1/1/0`;
  const inputs = [
    { route: base, bytes: Buffer.from([255, 216, 255, 217]), headers: { ...objectStoreTestHeaders, "content-type": "image/jpeg", "x-starward-image-source": "ps1-dr1" } },
    { route: base + "/index", bytes: Buffer.from("{\"tiles\":[0]}"), headers: { ...objectStoreTestHeaders, "content-type": "application/json; charset=utf-8" } },
    { route: `/v2/sky/deep-sky/${"b".repeat(64)}/manifest`, bytes: Buffer.from("{\"source\":\"fixture\"}"),
      headers: { ...objectStoreTestHeaders, "content-type": "application/json; charset=utf-8", "content-disposition": "attachment; filename=\"allwise-w3-manifest.json\"" } },
    ...extra,
  ];
  const bundle = await writeSkyStaticBundle(path.join(root, "source"), inputs);
  const args = { bundleDirectory: bundle.output, outputDirectory: path.join(root, "prepared"), publicationHash: bundle.publicationHash, resourceOrigin: objectStoreTestOrigin };
  return { root, base, inputs, bundle, args, beforeCleanup };
}

/** The real managed-store/preparation path is exercised; only Docker pulling
 * and extraction are simulated. This is not live OCI provenance evidence. */
export async function preparedObjectStoreFixture(t) {
  const f = await objectStoreFixture(t), revision = "a".repeat(40), imageDigest = `sha256:${"c".repeat(64)}`;
  await writeFile(path.join(f.bundle.output, "image-artifact.json"), JSON.stringify({
    schemaVersion: "starward-sky-static-image-artifact-v1", revision, publicationHash: f.bundle.publicationHash,
    indexSha256: skyStaticHash(await readFile(path.join(f.bundle.output, "index.json"))),
    fragmentSha256: skyStaticHash(await readFile(path.join(f.bundle.output, "delivery.caddy"))),
  }));
  const store = path.join(f.root, "managed"), receiptDirectory = path.join(f.root, "receipts");
  await mkdir(receiptDirectory);
  const validation = { revision, imageDigest, domain: "api.starward.test", operations: { skyStaticDirectory: store, receiptDirectory } };
  const deploy = { STARWARD_SKY_STATIC_DIRECTORY: store, STARWARD_IMAGE_REF: `fixture/image@${imageDigest}` };
  const deployEnvPath = path.join(f.root, "deploy.env"); await writeFile(deployEnvPath, "fixture=original\n");
  let container = false;
  const execute = ({ args }) => {
    if (args[0] === "image") return { stdout: Buffer.from(revision + "\n") };
    if (args[0] === "create") container = true;
    if (args[0] === "container") return { stdout: Buffer.from(container ? "c".repeat(12) + "\n" : "") };
    if (args[0] === "rm") container = false;
    if (args[0] === "cp") cpSync(f.bundle.output, args[2], { recursive: true });
    return { stdout: Buffer.from("fixture-container\n") };
  };
  const delivery = await prepareSkyStaticRelease({ validation, deploy, deployEnvPath, execute });
  f.beforeCleanup.push(() => delivery.dispose());
  const prepared = await prepareSkyObjectStorePackage(f.args);
  return { ...f, delivery, prepared, uploadArgs: { validation, deploy, deployEnvPath, delivery,
    packageDirectory: prepared.directory, publicationHash: f.bundle.publicationHash, resourceOrigin: objectStoreTestOrigin,
    bucket: "starward-local-fixture", region: "oss-cn-hangzhou" } };
}
