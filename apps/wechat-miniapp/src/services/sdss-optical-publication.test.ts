import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { assertSdssOpticalManifest } from "./sdss-optical-publication";
import { SDSS_OPTICAL_PUBLICATIONS } from "@starward/miniapp-contracts";

const source = JSON.parse(readFileSync(new URL("../../../../workers/miniapp-api/assets/deep-sky/sdss-m51/manifest.json", import.meta.url), "utf8"));
const publicationHash = createHash("sha256").update(JSON.stringify(source)).digest("hex");
const response = { ...source, publicationHash,
  levels: Object.fromEntries(Object.entries(source.levels).map(([level, asset]) => [level, {
    ...(asset as object), downloadUrl: `/v2/sky/sdss-optical/${publicationHash}/${(asset as {file:string}).file}` }])) };

test("Mini accepts the actual M51 publication identity, geometry and license", () => {
  assert.doesNotThrow(() => assertSdssOpticalManifest(response));
  assert.equal(response.levels.DETAIL.fieldDegrees, 512 * 0.4 / 3600);
});

test("Mini validates every real admitted target with its own hash-bound geometry, pixels and provenance", () => {
  for (const [reference, offer] of Object.entries(SDSS_OPTICAL_PUBLICATIONS)) {
    const slug = reference.replace(":", "").toLowerCase();
    const original = JSON.parse(readFileSync(new URL(`../../../../workers/miniapp-api/assets/deep-sky/sdss-${slug}/manifest.json`, import.meta.url), "utf8"));
    const hash = createHash("sha256").update(JSON.stringify(original)).digest("hex");
    assert.equal(hash, offer.publicationHash);
    const manifest = { ...original, publicationHash: hash, levels: Object.fromEntries(Object.entries(original.levels).map(([level, value]) => {
      const asset = value as {file:string};
      return [level, {...asset, downloadUrl:`/v2/sky/sdss-optical/${hash}/${asset.file}`}];
    })) };
    assert.doesNotThrow(() => assertSdssOpticalManifest(manifest, reference));
    assert.throws(() => assertSdssOpticalManifest(manifest, reference === "M:51" ? "M:82" : "M:51"));
    for (const corrupt of [
      { ...manifest, processing: { ...manifest.processing, coverage: "complete scientific coverage" } },
      { ...manifest, center: { ...manifest.center, raDeg: 202.469625 + 1 } },
      { ...manifest, publicationHash: SDSS_OPTICAL_PUBLICATIONS["M:51"].publicationHash + "0" },
      { ...manifest, levels: { ...manifest.levels, DETAIL: { ...manifest.levels.DETAIL, bytes: manifest.levels.DETAIL.bytes + 1 } } },
    ]) assert.throws(() => assertSdssOpticalManifest(corrupt, reference), /sdss_optical_manifest_invalid/u);
  }
});

test("Mini rejects a substituted image, another target and broken download identity", () => {
  for (const changed of [
    { ...response, objectRef: "M:31" },
    { ...response, source: { ...response.source, license: "unknown" } },
    { ...response, center: { ...response.center, raDeg: undefined } },
    { ...response, center: { ...response.center, decDeg: "47.1951666667" } },
    { ...response, levels: { ...response.levels, DETAIL: { ...response.levels.DETAIL, sha256: "0".repeat(64) } } },
    { ...response, levels: { ...response.levels, DETAIL: { ...response.levels.DETAIL, fieldDegrees: undefined } } },
    { ...response, levels: { ...response.levels, DETAIL: { ...response.levels.DETAIL,
      downloadUrl: "/v2/sky/sdss-optical/wrong/M-51-detail.jpg" } } },
  ]) assert.throws(() => assertSdssOpticalManifest(changed), /sdss_optical_manifest_invalid/u);
});
