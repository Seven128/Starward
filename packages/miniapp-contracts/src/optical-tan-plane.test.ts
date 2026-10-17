import assert from "node:assert/strict";
import test from "node:test";
import { isOpticalTanPlaneGeometry } from "./optical-tan-plane.ts";
import { isPreparedNativeTanGeometry, assertPreparedNativeOpticalPublication } from "./prepared-native-optical-publication.ts";
import { preparedNativeOpticalFixture } from "./test-fixtures/prepared-native-optical-publication.ts";

test("derived ICRS planes share geometry while original-photo provenance stays strict", () => {
  const original = preparedNativeOpticalFixture();
  const derived = { ...original.nominalTan, frame: "ICRS", accuracy: "UNVERIFIED_DERIVED_HIPS_NATIVE_CELL_TAN" };
  assert(isOpticalTanPlaneGeometry(derived));
  assert.equal(isPreparedNativeTanGeometry(derived), false);
  assert.throws(() => assertPreparedNativeOpticalPublication({ ...original, nominalTan: derived }, original.reference), /publication_invalid/u);
  assert(isPreparedNativeTanGeometry(original.nominalTan));
  assert.equal(isPreparedNativeTanGeometry({ ...derived, frame: "ICRS J2000" }), false);
});

test("the shared plane cannot admit singular, invalid or unsupported coordinates", () => {
  const plane = preparedNativeOpticalFixture().nominalTan;
  for (const change of [{ frame: "FK5" }, { rowOrder: "bottom-first" }, { sourceWidth: 1 },
    { referenceValue: [360, 10] }, { cdDegreesPerPixel: [[1, 2], [2, 4]] },
    { cdDegreesPerPixel: [[Infinity, 0], [0, 1]] }]) {
    assert.equal(isOpticalTanPlaneGeometry({ ...plane, ...change }), false);
  }
});
