import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { utf8ContentIntegrity } from "./utf8-content-integrity.ts";
import { catalogJsonIntegrity } from "./catalog-json-integrity.ts";
import { opticalUtf8ContentIdentity, opticalPublicationContentHash } from "./optical-publication-content.ts";
import { SDSS_OPTICAL_PUBLICATIONS, assertSdssOpticalManifest, type SdssOpticalManifest } from "./sdss-optical-publication.ts";

const expected = (text: string) => ({ bytes: Buffer.byteLength(text, "utf8"),
  sha256: createHash("sha256").update(text, "utf8").digest("hex") });

for (const [label, text] of [
  ["empty", ""], ["ASCII", "publication\n512 pixels"], ["two/three-byte limits", "\u007f\u0080\u07ff\u0800\uffff"],
  ["Chinese attribution", "星图来源：斯隆数字巡天"], ["supplementary", "🪐\u{10000}\u{10ffff}"],
  ["lone high surrogate", "left\ud800right"], ["lone low surrogate", "left\udc00right"],
  ["mixed surrogate sequence", "\ud800\ud800\udc00\udc00\udbff"],
]) test(`portable UTF-8 preserves Node content bytes and SHA for ${label}`, () => {
  assert.deepEqual(utf8ContentIntegrity(text!), expected(text!));
});

test("shared catalog and optical callers retain their distinct serialization and text meaning", () => {
  const value = { z: "星图🪐", a: [1, "\ud800", null] };
  assert.deepEqual(catalogJsonIntegrity(value), expected(JSON.stringify(value)));
  assert.equal(opticalPublicationContentHash(value), expected('{"a":[1,"\\ud800",null],"z":"星图🪐"}').sha256);
  const raw = "original metadata\n星图🪐\ud800";
  assert.deepEqual(opticalUtf8ContentIdentity(raw), { ...expected(raw), utf8: raw });
  assert.throws(() => catalogJsonIntegrity(undefined), /catalog_json_invalid/);
  assert.throws(() => utf8ContentIntegrity(123 as unknown as string), /utf8_content_invalid/);
});

test("actual fixed legacy manifests and common optical content admit without a TextEncoder global", () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "TextEncoder");
  assert(descriptor?.configurable);
  Object.defineProperty(globalThis, "TextEncoder", { ...descriptor, value: undefined });
  try {
    // Node's native Buffer/crypto are an independent oracle, not production
    // dependencies. Each immutable published identity remains unchanged.
    for (const [reference, offer] of Object.entries(SDSS_OPTICAL_PUBLICATIONS)) {
      const value = JSON.parse(readFileSync(new URL(`../../../workers/miniapp-api/assets/deep-sky/sdss-${reference.replace(":", "").toLowerCase()}/manifest.json`, import.meta.url), "utf8")) as SdssOpticalManifest;
      value.publicationHash = offer.publicationHash;
      for (const asset of Object.values(value.levels))
        asset.downloadUrl = `/v2/sky/sdss-optical/${offer.publicationHash}/${asset.file}`;
      assert.doesNotThrow(() => assertSdssOpticalManifest(value, reference));
      const changed = structuredClone(value); changed.source.credit += " forged";
      assert.throws(() => assertSdssOpticalManifest(changed, reference), /sdss_optical_manifest_invalid/,
        "missing TextEncoder must not disable the existing immutable admission fence");
    }
    const raw = "原始权利元数据🪐\ud800";
    assert.deepEqual(opticalUtf8ContentIdentity(raw), { ...expected(raw), utf8: raw });
    assert.equal(opticalPublicationContentHash({ z: "星图", a: 1 }), expected('{"a":1,"z":"星图"}').sha256);
    assert.deepEqual(catalogJsonIntegrity({ z: "星图", a: 1 }), expected('{"z":"星图","a":1}'));
  } finally { Object.defineProperty(globalThis, "TextEncoder", descriptor); }
});
