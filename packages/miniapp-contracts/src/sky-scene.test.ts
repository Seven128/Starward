import assert from "node:assert/strict";
import test from "node:test";
import {
  assertSkyScene,
  assertSkyTargetFrames,
  skySceneSerializedBytes,
  validSkyPlanetGeometry,
  type SkyScene,
  type SourceSummary,
} from "./index.ts";

test("Saturn ring orientation is optional as a pair, never a guessed half-orientation", () => {
  const saturn = { body: "SATURN", azimuthDeg: 90, altitudeDeg: 25,
    angularDiameterDeg: .02, illuminatedFraction: .8, visualMagnitude: 1,
    ringTiltDeg: null, ringPoleEnu: null };
  assert.equal(validSkyPlanetGeometry(saturn, 4), true);
  assert.equal(validSkyPlanetGeometry({ ...saturn, ringTiltDeg: 5 }, 4), false);
  assert.equal(validSkyPlanetGeometry({ ...saturn, ringPoleEnu: [0, 0, 1] }, 4), false);
});

const source: SourceSummary = {
  id: "source-gaia-test",
  kind: "OPEN_DATA",
  provider: "ESA Gaia Data Processing and Analysis Consortium",
  title: "Gaia DR3 bright-star test catalogue",
  sourceUrl: "https://gea.esac.esa.int/archive/",
  license: "ESA/Gaia/DPAC terms",
  licenseUrl: "https://www.cosmos.esa.int/web/gaia/data-release-3",
  publishedAt: null,
  retrievedAt: "2026-09-04T00:00:00.000Z",
  validFrom: null,
  validTo: null,
  state: "FRESH",
  confidence: 1,
  precision: "Gaia DR3 source rows",
  limitations: [],
};

const available: SkyScene = {
  format: "stellar-scene-v2", state: "AVAILABLE", observer: { latitude: 0, longitude: 0, elevationM: 0 },
  catalog: { catalogVersion: "bsc5p-bright-stars.v2", catalogHash: "a".repeat(64), magnitudeLimit: 6.5, rowCount: 8404, sources: [source] },
  frames: ["2026-09-04T12:00:00.000Z", "2026-09-04T12:30:00.000Z"].map(at => ({
    at, state: "AVAILABLE", geometry: { format: "bsc5p-stellar-geometry-v1", referenceAt: "2000-01-01T12:00:00.000Z",
      catalogVersion: "bsc5p-bright-stars.v2", catalogHash: "a".repeat(64), at,
      observer: { latitude: 0, longitude: 0, elevationM: 0 }, julianYears: (Date.parse(at)-Date.parse("2000-01-01T12:00:00Z"))/(365.25*86400000),
      equatorialToEnu: [1,0,0,0,1,0,0,0,1] },
  })), unavailableReason: null,
  deepSky: {
    state: "AVAILABLE",
    catalog: {
      catalogVersion: "opengc-test-v1",
      catalogHash: "b".repeat(64),
      frame: "ICRS J2000",
      sources: [{ ...source, id: "source-opengc", provider: "OpenNGC" }],
      entries: [{ objectRef: "M:31", displayName: "M 31", kind: "GALAXY", aliases: ["NGC0224"],
        magnitude: 3.44, magnitudeBand: "V", majorAxisArcmin: 178, minorAxisArcmin: 63,
        positionAngleDeg: 35 }],
    },
    frames: [
      { at: "2026-09-04T12:00:00.000Z", state: "AVAILABLE", points: [[0, 20, 30, 20, 30.1, 20.1, 30]] },
      { at: "2026-09-04T12:30:00.000Z", state: "AVAILABLE", points: [[0, 25, 31, 25, 31.1, 25.1, 31]] },
    ],
    unavailableReason: null,
  },
};

test("sky scene contract binds every frame to one hourly slice", () => {
  assert.doesNotThrow(() =>
    assertSkyScene(available, available.frames.map((frame) => frame.at)),
  );
  assert.ok(skySceneSerializedBytes(available) < 1_048_576);
  assert.throws(
    () => assertSkyScene(available, [available.frames[0]!.at]),
    /sky_scene_invalid:frame_count/u,
  );
  assert.throws(
    () =>
      assertSkyScene(available, [
        available.frames[0]!.at,
        "2026-09-04T13:00:00.000Z",
      ]),
    /sky_scene_invalid:frame_binding/u,
  );
});

test("unavailable sky scene is explicit and cannot carry fallback points", () => {
  const scene: SkyScene = {
    format: "stellar-scene-v2", observer: null, state: "UNAVAILABLE",
    catalog: null,
    frames: available.frames.map((frame) => ({
      at: frame.at,
      state: "UNAVAILABLE",
      geometry: null,
    })),
    unavailableReason: "CATALOG_UNAVAILABLE",
  };
  assert.doesNotThrow(() =>
    assertSkyScene(scene, scene.frames.map((frame) => frame.at)),
  );
  assert.throws(
    () =>
      assertSkyScene(
        {
          ...scene,
          frames: [
            {
            at: scene.frames[0]!.at,
            state: "UNAVAILABLE",
            geometry: available.frames[0]!.geometry,
            },
            scene.frames[1]!,
          ],
        },
        scene.frames.map((frame) => frame.at),
      ),
    /sky_scene_invalid:unavailable_frame/u,
  );
});

test("target frames bind actionable targets to every hourly instant", () => {
  const targetFrames = [
    {
      at: "2026-09-04T12:00:00.000Z",
      targets: [],
    },
    {
      at: "2026-09-04T12:30:00.000Z",
      targets: [],
    },
  ] as const;
  assert.doesNotThrow(() =>
    assertSkyTargetFrames(
      targetFrames,
      targetFrames.map((frame) => frame.at),
    ),
  );
  assert.throws(
    () =>
      assertSkyTargetFrames(targetFrames, [targetFrames[0]!.at]),
    /sky_scene_invalid:target_frame_count/u,
  );
  assert.throws(
    () =>
      assertSkyTargetFrames(targetFrames, [
        targetFrames[0]!.at,
        "2026-09-04T13:00:00.000Z",
      ]),
    /sky_scene_invalid:target_frame_1:at/u,
  );
});

test("target frame coordinates are numeric facts, not display text or a half-present position", () => {
  const at = "2026-09-22T13:00:00.000Z";
  const check = (coordinates: unknown) => assertSkyTargetFrames([
    { at, targets: [{ targetId: "target:jupiter", direction: "123°", ...coordinates as object } as any] },
  ], [at]);
  assert.doesNotThrow(() => check({ azimuthDeg: 123.256789, altitudeDeg: -36.123456 }));
  assert.doesNotThrow(() => check({ azimuthDeg: null, altitudeDeg: null }));
  for (const azimuthDeg of [undefined, null, NaN, -1, 360, "123"]) {
    assert.throws(() => check({ azimuthDeg, altitudeDeg: 36.123456 }), /coordinates/);
  }
  for (const altitudeDeg of [undefined, null, Infinity, -91, 91, "36"]) {
    assert.throws(() => check({ azimuthDeg: 123.256789, altitudeDeg }), /coordinates/);
  }
});

test("deep-sky frames bind stable Messier identities and tangent samples to the same axis", () => {
  assert.doesNotThrow(() => assertSkyScene(available, available.frames.map((frame) => frame.at)));
  assert.throws(() => assertSkyScene({
    ...available,
    deepSky: { ...available.deepSky!, frames: [available.deepSky!.frames[0]!,
      { ...available.deepSky!.frames[1]!, points: [[1, 25, 31, 25, 31.1, 25.1, 31]] }] },
  }, available.frames.map((frame) => frame.at)), /deep_sky_point_1_0/u);
});

test("catalog ICRS centers are optional for old reports and validated independently of horizontal samples", () => {
  const withCenter = (icrsCenter: unknown): SkyScene => ({
    ...available,
    deepSky: { ...available.deepSky!, catalog: { ...available.deepSky!.catalog!, entries: [
      { ...available.deepSky!.catalog!.entries[0]!, icrsCenter } as any,
    ] } },
  });
  const at = available.frames.map(frame => frame.at);
  assert.doesNotThrow(() => assertSkyScene(available, at), "old cached entries remain usable");
  for (const center of [undefined, null, { raDeg: 10.6847083333333, decDeg: 41.26875 },
    { raDeg: 0, decDeg: -90 }, { raDeg: 359.999, decDeg: 90 }])
    assert.doesNotThrow(() => assertSkyScene(withCenter(center), at));
  for (const center of ["10,41", [], {}, { raDeg: 10 }, { decDeg: 41 },
    { raDeg: NaN, decDeg: 41 }, { raDeg: 360, decDeg: 41 }, { raDeg: -1, decDeg: 41 },
    { raDeg: 10, decDeg: Infinity }, { raDeg: 10, decDeg: 90.01 }, { raDeg: 10, decDeg: -90.01 }])
    assert.throws(() => assertSkyScene(withCenter(center), at), /deep_sky_entry_0_icrs_center/u);
});
