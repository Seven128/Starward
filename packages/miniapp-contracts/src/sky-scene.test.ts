import assert from "node:assert/strict";
import test from "node:test";
import {
  assertSkyScene,
  assertSkyTargetFrames,
  skySceneSerializedBytes,
  type SkyScene,
  type SourceSummary,
} from "./index.ts";

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
  state: "AVAILABLE",
  catalog: {
    catalogVersion: "gaia-dr3-test-v1",
    catalogHash: "a".repeat(64),
    magnitudeLimit: 5.5,
    source,
    entries: [
      { sourceId: "1", gMagnitude: 1.2, bpRp: 0.2 },
      { sourceId: "2", gMagnitude: 4.8, bpRp: null },
    ],
  },
  frames: [
    {
      at: "2026-09-04T12:00:00.000Z",
      state: "AVAILABLE",
      points: [
        [0, 12.5, 34.25],
        [1, 275, 5],
      ],
    },
    {
      at: "2026-09-04T12:30:00.000Z",
      state: "AVAILABLE",
      points: [[0, 20, 30]],
    },
  ],
  unavailableReason: null,
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
    /sky_scene_invalid:frame_1:at/u,
  );
});

test("unavailable sky scene is explicit and cannot carry fallback points", () => {
  const scene: SkyScene = {
    state: "UNAVAILABLE",
    catalog: null,
    frames: available.frames.map((frame) => ({
      at: frame.at,
      state: "UNAVAILABLE",
      points: null,
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
            points: [[0, 0, 0]],
            },
            scene.frames[1]!,
          ],
        },
        scene.frames.map((frame) => frame.at),
      ),
    /sky_scene_invalid:frame_0:unavailable_points/u,
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
