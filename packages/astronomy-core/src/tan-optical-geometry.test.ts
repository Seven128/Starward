import assert from "node:assert/strict";
import test from "node:test";
import { preparedNativeOpticalFixture } from "../../miniapp-contracts/src/test-fixtures/prepared-native-optical-publication.ts";
import { nativeTanDirection, nativeTanUvAtIcrs, nativeTanNominalWidthDegrees } from "./tan-optical-geometry.ts";
import { loadDeepSkyCatalog, deepSkyRowByReference, EXTENDED_DEEP_SKY_CATALOG_VERSION } from "./deep-sky-catalog.ts";

test("original full rectangle uses FITS pixel edges, rotation and off-center reference pixel", () => {
  const g = preparedNativeOpticalFixture().nominalTan;
  for (const uv of [[0, 0], [1, 1], [0.13, 0.72], [.5, .5]] as const) {
    const d = nativeTanDirection(g, uv);
    const ra = (Math.atan2(d[1], d[0]) * 180 / Math.PI + 360) % 360;
    const dec = Math.atan2(d[2], Math.hypot(d[0], d[1])) * 180 / Math.PI;
    const result = nativeTanUvAtIcrs(g, ra, dec)!;
    assert(result); assert(Math.abs(result[0] - uv[0]) < 1e-10 && Math.abs(result[1] - uv[1]) < 1e-10);
  }
  const row = deepSkyRowByReference("NGC:253")!;
  assert(row && row.messier === null && row.ngcName === "NGC 253");
  assert.notEqual(row.raDeg, g.referenceValue[0]);
  assert(nativeTanUvAtIcrs(g, row.raDeg, row.decDeg)!.every(value => value > 0 && value < 1));
  assert(nativeTanNominalWidthDegrees(g) > .5);
  assert.equal(nativeTanUvAtIcrs(g, g.referenceValue[0] + 180, -g.referenceValue[1]), null);
});

test("explicit additive catalog preserves every old row/hash and does not change default generation", () => {
  const old = loadDeepSkyCatalog(), extended = loadDeepSkyCatalog(EXTENDED_DEEP_SKY_CATALOG_VERSION);
  assert.equal(old.rows.length, 51); assert.equal(old.catalogHash, "f54b6225799d57a7fb73571cde2d38bbcb34651983ac71f3a176c2399aa8d8c5");
  assert(extended.rows.some(row => row.objectRef === "NGC:253"));
  for (const row of old.rows) assert.deepEqual(extended.rows.find(candidate => candidate.objectRef === row.objectRef), row);
  assert.equal(loadDeepSkyCatalog().catalogHash, old.catalogHash);
  assert.throws(() => loadDeepSkyCatalog("inferred-next"), /catalog_version_invalid/u);
  assert.equal(deepSkyRowByReference("REGION:virgo"), null);
});
