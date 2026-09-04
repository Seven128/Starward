import assert from "node:assert/strict";
import test from "node:test";
import {
  GAIA_DR3_BRIGHT_STAR_CATALOG_VERSION,
  GAIA_DR3_MAX_ASSET_BYTES,
  GAIA_DR3_MAX_ROWS,
  GAIA_DR3_REFERENCE_EPOCH,
  GAIA_DR3_BRIGHT_STAR_MANIFEST,
  GAIA_DR3_BRIGHT_STAR_PACK,
  loadGaiaDr3BrightStarCatalog,
  positionGaiaDr3Catalog,
  projectGaiaDr3Catalog,
  projectGaiaDr3SkyFrame,
  projectGaiaDr3Star,
  propagateGaiaDr3Star,
  validateGaiaDr3CatalogAsset,
  validateGaiaDr3Pack,
  type GaiaDr3BrightStarPack,
  type GaiaDr3Row,
} from "./gaia-catalog.ts";

const OBSERVER = {
  latitude: 23.1291,
  longitude: 113.2644,
  elevationM: 20,
};
const INSTANT = "2026-09-04T00:00:00.000Z";

function assertInvalid(action: () => unknown, code: string): void {
  let caught: unknown;
  try {
    action();
  } catch (error) {
    caught = error;
  }
  assert.ok(caught, `expected gaia catalog validation to fail: ${code}`);
  assert.equal(
    typeof caught === "object" && caught !== null && "message" in caught
      ? (caught as { message?: unknown }).message
      : String(caught),
    `gaia_catalog_invalid:${code}`,
  );
}

test("loads the checked Gaia asset with manifest-bound hash, schema, order and capacity", () => {
  const catalog = loadGaiaDr3BrightStarCatalog();
  const manifest = catalog.manifest;

  assert.equal(catalog.catalogVersion, "gaia-dr3-bright-stars.v1");
  assert.equal(catalog.catalogVersion, GAIA_DR3_BRIGHT_STAR_CATALOG_VERSION);
  assert.equal(catalog.rows.length, 2048);
  assert.equal(catalog.rows.length, manifest.rowCount);
  assert.equal(catalog.entries.length, catalog.rows.length);
  assert.equal(catalog.assetBytes, manifest.derivedAssetBytes);
  assert.ok(catalog.assetBytes <= GAIA_DR3_MAX_ASSET_BYTES);
  assert.equal(catalog.catalogHash, manifest.derivedAssetSha256);
  assert.equal(catalog.pack.referenceEpoch, GAIA_DR3_REFERENCE_EPOCH);
  assert.equal(catalog.pack.magnitudeLimit, 5.5);
  assert.ok(Object.isFrozen(catalog));
  assert.ok(Object.isFrozen(catalog.pack));

  for (let index = 0; index < catalog.rows.length; index += 1) {
    const row = catalog.rows[index]!;
    assert.ok(row.gMag <= 5.5);
    assert.equal(row.refEpoch, 2016);
    if (index === 0) continue;
    const previous = catalog.rows[index - 1]!;
    assert.ok(
      previous.gMag < row.gMag ||
        (previous.gMag === row.gMag &&
          BigInt(previous.sourceId) < BigInt(row.sourceId)),
    );
  }
});

test("fails closed for missing, corrupt, reordered and oversized assets", () => {
  const pack = GAIA_DR3_BRIGHT_STAR_PACK;
  const manifest = GAIA_DR3_BRIGHT_STAR_MANIFEST;

  assertInvalid(() => validateGaiaDr3CatalogAsset(undefined, manifest), "pack_not_object");
  assertInvalid(() => validateGaiaDr3CatalogAsset(pack, undefined), "manifest_not_object");
  assertInvalid(
    () =>
      validateGaiaDr3CatalogAsset(
        { ...pack, schemaVersion: "corrupt" },
        manifest,
      ),
    "pack_schema_version_invalid",
  );
  assertInvalid(
    () =>
      validateGaiaDr3CatalogAsset(
        {
          ...pack,
          rows: [
            { ...pack.rows[0]!, gMag: 5.6 },
            ...pack.rows.slice(1),
          ],
        },
        manifest,
      ),
    "row_0_g_magnitude_out_of_range",
  );
  assertInvalid(
    () =>
      validateGaiaDr3CatalogAsset(
        { ...pack, rows: [pack.rows[1]!, pack.rows[0]!, ...pack.rows.slice(2)] },
        manifest,
      ),
    "row_1_order_invalid",
  );
  assertInvalid(
    () =>
      validateGaiaDr3CatalogAsset(
        { ...pack, rows: [...pack.rows, pack.rows[0]!] },
        manifest,
      ),
    "rows_exceed_capacity",
  );
  assertInvalid(
    () =>
      validateGaiaDr3CatalogAsset(pack, {
        ...manifest,
        derivedAssetSha256: "0".repeat(64),
      }),
    "manifest_asset_hash_mismatch",
  );
  assertInvalid(
    () =>
      validateGaiaDr3Pack({
        ...pack,
        rows: null,
      }),
    "rows_not_array",
  );
});

test("projection is deterministic and changes with instant and WGS84 observer", () => {
  const row = loadGaiaDr3BrightStarCatalog().rows[0]!;
  const input = { at: INSTANT, observer: OBSERVER };
  const first = projectGaiaDr3Star(row, input);
  const second = projectGaiaDr3Star(row, input);
  assert.deepEqual(first, second);
  assert.ok(Number.isFinite(first.azimuthDeg));
  assert.ok(Number.isFinite(first.altitudeDeg));
  assert.ok(first.azimuthDeg >= 0 && first.azimuthDeg < 360);
  assert.ok(first.altitudeDeg >= -90 && first.altitudeDeg <= 90);

  const later = projectGaiaDr3Star(row, {
    ...input,
    at: "2026-09-04T06:00:00.000Z",
  });
  assert.ok(
    Math.abs(later.azimuthDeg - first.azimuthDeg) > 1e-6 ||
      Math.abs(later.altitudeDeg - first.altitudeDeg) > 1e-6,
  );
  assert.notDeepEqual(later, first);

  const elsewhere = projectGaiaDr3Star(row, {
    ...input,
    observer: { latitude: -33.8688, longitude: 151.2093, elevationM: 58 },
  });
  assert.ok(
    Math.abs(elsewhere.azimuthDeg - first.azimuthDeg) > 1e-6 ||
      Math.abs(elsewhere.altitudeDeg - first.altitudeDeg) > 1e-6,
  );

  const atReference = propagateGaiaDr3Star(row, "2016-01-01T00:00:00.000Z");
  assert.ok(Math.abs(atReference.rightAscensionDeg - row.raDeg) < 1e-12);
  assert.ok(Math.abs(atReference.declinationDeg - row.decDeg) < 1e-12);
  const afterReference = propagateGaiaDr3Star(row, INSTANT);
  assert.ok(
    Math.abs(afterReference.rightAscensionDeg - row.raDeg) > 1e-8 ||
      Math.abs(afterReference.declinationDeg - row.decDeg) > 1e-8,
  );
});

test("recognizable Sirius, Vega and Polaris fixtures retain their astrometric golden coordinates", () => {
  // These are test-only well-known-star astrometric fixtures.  They are not
  // appended to or mixed into the Gaia offline asset (which remains the sole
  // production data source).
  const fixtures: Array<[
    string,
    GaiaDr3Row,
    { rightAscensionDeg: number; declinationDeg: number },
  ]> = [
    [
      "Sirius",
      {
        sourceId: "100000000000000001",
        raDeg: 101.28715533,
        decDeg: -16.71611586,
        pmRaMasYr: -546.01,
        pmDecMasYr: -1223.07,
        refEpoch: 2016,
        gMag: -1,
        bpRp: 0.009,
      },
      { rightAscensionDeg: 101.28546483947298, declinationDeg: -16.719742561597077 },
    ],
    [
      "Vega",
      {
        sourceId: "100000000000000002",
        raDeg: 279.23473479,
        decDeg: 38.78368896,
        pmRaMasYr: 200.94,
        pmDecMasYr: 286.23,
        refEpoch: 2016,
        gMag: 0.03,
        bpRp: 0,
      },
      { rightAscensionDeg: 279.2354991565935, declinationDeg: 38.784537701934745 },
    ],
    [
      "Polaris",
      {
        sourceId: "100000000000000003",
        raDeg: 37.95456067,
        decDeg: 89.26410897,
        pmRaMasYr: 44.22,
        pmDecMasYr: -11.74,
        refEpoch: 2016,
        gMag: 1.98,
        bpRp: 0.6,
      },
      { rightAscensionDeg: 37.96477007216242, declinationDeg: 89.2640741580295 },
    ],
  ];

  for (const [name, row, expected] of fixtures) {
    const propagated = propagateGaiaDr3Star(row, "2016-01-01T00:00:00.000Z");
    assert.ok(Math.abs(propagated.rightAscensionDeg - row.raDeg) < 1e-12, name);
    assert.ok(Math.abs(propagated.declinationDeg - row.decDeg) < 1e-12, name);
    const projection = projectGaiaDr3Star(row, {
      at: INSTANT,
      observer: OBSERVER,
    });
    assert.equal(projection.sourceId, row.sourceId, name);
    assert.ok(
      Math.abs(projection.rightAscensionDeg - expected.rightAscensionDeg) < 1e-12,
      name,
    );
    assert.ok(
      Math.abs(projection.declinationDeg - expected.declinationDeg) < 1e-12,
      name,
    );
    assert.ok(Number.isFinite(projection.altitudeDeg), name);
    assert.ok(Number.isFinite(projection.azimuthDeg), name);
  }
});

test("horizon obstruction and adapter-shaped projection remain explicit", () => {
  const row = loadGaiaDr3BrightStarCatalog().rows[0]!;
  const unobstructed = projectGaiaDr3Star(row, {
    at: INSTANT,
    observer: OBSERVER,
    horizonAltitudeAtAzimuth: () => 0,
  });
  const obstructed = projectGaiaDr3Star(row, {
    at: INSTANT,
    observer: OBSERVER,
    horizonAltitudeAtAzimuth: () => 90,
  });
  assert.equal(unobstructed.visible, true);
  assert.equal(unobstructed.obstructed, false);
  assert.equal(obstructed.obstructed, true);

  const frame = projectGaiaDr3SkyFrame({ at: INSTANT, observer: OBSERVER });
  assert.equal(frame.coordinateSystem, "WGS84");
  assert.equal(frame.catalogVersion, "gaia-dr3-bright-stars.v1");
  assert.equal(frame.stars.length, GAIA_DR3_MAX_ROWS);
  const adapterRows = positionGaiaDr3Catalog({
    at: INSTANT,
    ...OBSERVER,
  });
  assert.deepEqual(adapterRows, frame.stars);
});

test("magnitude filtering never exceeds the manifest brightness boundary", () => {
  const selected = projectGaiaDr3Catalog({
    at: INSTANT,
    observer: OBSERVER,
    magnitudeLimit: 2,
  });
  assert.ok(selected.length > 0);
  assert.ok(selected.every((star) => star.gMag <= 2));
  assert.throws(
    () => projectGaiaDr3Catalog({ at: INSTANT, observer: OBSERVER, magnitudeLimit: 5.5001 }),
    /gaia_magnitude_limit_out_of_range/,
  );
});

// Keep this type-level fixture close to the tests that exercise capacity.
const _packTypeCheck: GaiaDr3BrightStarPack = GAIA_DR3_BRIGHT_STAR_PACK;
void _packTypeCheck;
