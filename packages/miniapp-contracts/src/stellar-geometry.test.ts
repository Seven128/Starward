import assert from "node:assert/strict";
import test from "node:test";
import {
  assertStellarGeometryCatalog, assertStellarGeometryFrame, assertStellarRotation,
  STELLAR_GEOMETRY_FORMAT, STELLAR_GEOMETRY_REFERENCE_AT, STELLAR_GEOMETRY_MAX_ROWS, type StellarGeometryCatalog, type StellarGeometryFrame,
} from "./stellar-geometry.ts";

const catalog: StellarGeometryCatalog = {
  format: STELLAR_GEOMETRY_FORMAT, catalogVersion: "bsc5p-bright-stars.v1", catalogHash: "a".repeat(64),
  referenceAt: STELLAR_GEOMETRY_REFERENCE_AT, rows: [["HR:1", 1, 0, 0, 0, 1e-6, 0]],
};
const observer = { latitude: 22.6, longitude: 114.5, elevationM: 30 };
const frame: StellarGeometryFrame = {
  format: catalog.format, catalogVersion: catalog.catalogVersion, catalogHash: catalog.catalogHash,
  referenceAt: catalog.referenceAt, at: STELLAR_GEOMETRY_REFERENCE_AT, julianYears: 0, observer,
  equatorialToEnu: [0, 1, 0, 0, 0, 1, 1, 0, 0],
};
const expected = { catalog, at: frame.at, observer };

test("geometry contract retains publication identity, canonical time and observer through JSON", () => {
  assertStellarGeometryCatalog(JSON.parse(JSON.stringify(catalog)), catalog);
  assertStellarGeometryFrame(JSON.parse(JSON.stringify(frame)), expected);
  for (const change of [{ catalogVersion: "other" }, { catalogHash: "b".repeat(64) },
    { format: "old" }, { referenceAt: "1991-04-02T00:00:00.000Z" }]) {
    assert.throws(() => assertStellarGeometryCatalog({ ...catalog, ...change }, catalog));
    assert.throws(() => assertStellarGeometryFrame({ ...frame, ...change }, expected));
  }
  assert.throws(() => assertStellarGeometryFrame({ ...frame, at: "2000-01-02T12:00:00.000Z" }, expected), /time_binding/);
  assert.throws(() => assertStellarGeometryFrame({ ...frame, julianYears: 1 }, expected), /epoch_delta/);
  for (const change of [{ latitude: -22.6 }, { longitude: -114.5 }, { elevationM: 0 }])
    assert.throws(() => assertStellarGeometryFrame({ ...frame, observer: { ...observer, ...change } }, expected), /observer_binding/);
  assert.throws(() => assertStellarGeometryFrame({ ...frame, observer: { ...observer, latitude: NaN } }, expected), /observer/);
});

test("matrix validation rejects mirrored, scaled, skewed, malformed and nonfinite transforms", () => {
  assertStellarRotation(frame.equatorialToEnu.map(Math.fround));
  const invalid = [null, [], new Array(9), [1, 0, 0, 0, 1, 0, 0, 0, -1],
    [2, 0, 0, 0, 1, 0, 0, 0, 1], [1, 0.2, 0, 0, 1, 0, 0, 0, 1],
    [NaN, 0, 0, 0, 1, 0, 0, 0, 1], [Infinity, 0, 0, 0, 1, 0, 0, 0, 1]];
  for (const matrix of invalid) assert.throws(() => assertStellarRotation(matrix), /stellar_geometry_invalid/);
  // A reflection has unit, perpendicular rows; determinant is an independent obligation.
  assert.throws(() => assertStellarRotation([-1, 0, 0, 0, 1, 0, 0, 0, 1]), /matrix_handedness/);
});

test("catalog geometry rejects ambiguous identities, nonunit positions and nontangent motion", () => {
  for (const rows of [[], [catalog.rows[0], catalog.rows[0]], [["HIP:1", 1, 0, 0, 0, 0, 0]],
    [["HR:1", 2, 0, 0, 0, 0, 0]], [["HR:1", 1, 0, 0, 0.1, 0, 0]],
    [["HR:1", 1, 0, 0, 0, NaN, 0]], [["HR:1", ...new Array(6)]],
    [["HR:1", 1, 0, 0, 0, 0]], [["HR:9111", 1, 0, 0, 0, 0, 0]]])
    assert.throws(() => assertStellarGeometryCatalog({ ...catalog, rows }, catalog), /stellar_geometry_invalid/);
});

test("bounded geometry admits the extended base population and rejects overflow", () => {
  const rows = Array.from({ length: STELLAR_GEOMETRY_MAX_ROWS }, (_, i) => [`HR:${i + 1}`, 1, 0, 0, 0, 0, 0]);
  assertStellarGeometryCatalog({ ...catalog, rows }, catalog);
  assert.throws(() => assertStellarGeometryCatalog({ ...catalog,
    rows: [...rows, [`HR:${STELLAR_GEOMETRY_MAX_ROWS + 1}`, 1, 0, 0, 0, 0, 0]] }, catalog), /rows/);
});
