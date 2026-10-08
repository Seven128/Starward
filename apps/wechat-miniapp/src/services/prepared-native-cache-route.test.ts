import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { skyImageContentHash } from "@starward/miniapp-contracts";

const source = ts.createSourceFile("runtime.ts", readFileSync(new URL("./sky-public-image-runtime.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
const declaration = source.statements.find((node): node is ts.FunctionDeclaration => ts.isFunctionDeclaration(node) && node.name?.text === "acquirePublishedSkyImage")!;
const code = declaration.getText(source).replace(/^export\s+/u, "");
const base = "https://cache-route.invalid", hash = "a".repeat(64);
function boundary(text = code) {
  const records: any[] = [];
  const acquire = vm.runInNewContext(ts.transpileModule(text + "\nacquirePublishedSkyImage;", { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText,
    { __MINIAPP_API_BASE__: base, skyImageContentHash, owner: () => ({ acquire: (value: unknown) => { records.push(value); return {}; } }) });
  return { records, acquire };
}
test("new rectangular JPEG/PNG and old immutable Prepared routes reach the shared cache without relaxing hash/origin", () => {
  const b = boundary(), descriptor = { bytes: 128, sha256: "b".repeat(64), width: 256, height: 232, format: "jpeg" };
  for (const file of ["eso-ngc253-trial-overview.jpg", "region-sample-medium.png", "M-82-detail.png"])
    b.acquire({ ...descriptor, format: file.endsWith("png") ? "png" : "jpeg" }, `${base}/v2/sky/prepared-optical/${hash}/${file}`, hash);
  assert.equal(b.records.length, 3); assert.equal(b.records[0].width, 256); assert.equal(b.records[0].height, 232);
  assert.equal(b.records[0].sha256, descriptor.sha256); assert.equal(b.records[0].environment, skyImageContentHash(Uint8Array.from(base, c => c.charCodeAt(0))));
  for (const url of [`https://another.invalid/v2/sky/prepared-optical/${hash}/eso-ngc253-trial-detail.jpg`,
    `${base}/v2/sky/prepared-optical/${"c".repeat(64)}/eso-ngc253-trial-detail.jpg`,
    `${base}/v2/sky/prepared-optical/${hash}/producer-receipt.json`, `${base}/v2/sky/prepared-optical/${hash}/../detail.jpg`])
    assert.throws(() => b.acquire(descriptor, url, hash), /sky_public_image_route_invalid/u);
  assert.equal(b.records.length, 3);
  const oldPattern = "const prepared = /^\\/v2\\/sky\\/prepared-optical\\/([a-f0-9]{64})\\/M-(?:[1-9]|[1-9][0-9]|10[0-9]|110)-(?:overview|medium|detail)\\.png$/.exec(path);";
  const mutated = code.replace(/const prepared = [^\n]+/u, oldPattern);
  assert.notEqual(mutated, code);
  assert.throws(() => boundary(mutated).acquire(descriptor, `${base}/v2/sky/prepared-optical/${hash}/eso-ngc253-trial-overview.jpg`, hash), /sky_public_image_route_invalid/u,
    "the old guarded path rejects the real new codec consumer before any shared-cache acquisition");
});
