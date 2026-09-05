import assert from "node:assert/strict";
import test from "node:test";
import { GAIA_DR3_PROJECTION_ALGORITHM } from "@starward/astronomy-core";
import {
  SKY_SCENE_MAX_CATALOG_ENTRIES,
  skySceneSerializedBytes,
  type SourceSummary,
} from "@starward/miniapp-contracts";
import { TEST_PUBLISHED_SPOT } from "@starward/miniapp-contracts/test-fixtures";
import {
  buildSkyScene,
  createGaiaDr3SkyCatalogProvider,
  type SkyCatalogProvider,
  type SkyCatalogSnapshot,
} from "./sky-scene-catalog.ts";
import { createTestMiniappService } from "./test-fixtures/create-test-service.ts";
import { InMemoryTestRepository } from "./test-fixtures/in-memory-repository.ts";
import { MemoryCache } from "./cache.ts";
import { calculateMiniappNightSky } from "./astronomy-engine-adapter.ts";

const source: SourceSummary = {
  id: "source-gaia-worker-test",
  kind: "OPEN_DATA",
  provider: "ESA Gaia Data Processing and Analysis Consortium",
  title: "Gaia DR3 bright-star worker test source",
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

function snapshot(
  entries = [
    { sourceId: "gaia:1", gMagnitude: 1.1, bpRp: 0.1, raHours: 1, decDeg: 20 },
    { sourceId: "gaia:2", gMagnitude: 4.9, bpRp: 1.2, raHours: 10, decDeg: -5 },
    { sourceId: "gaia:3", gMagnitude: 5.5, bpRp: null, raHours: 18, decDeg: 45 },
  ],
): SkyCatalogSnapshot {
  return {
    catalogVersion: "gaia-dr3-test-v1",
    catalogHash: "b".repeat(64),
    magnitudeLimit: 5.5,
    source,
    entries,
  };
}

function providerFor(
  current = snapshot(),
  position = (input: Parameters<SkyCatalogProvider["position"]>[0]) =>
    input.catalog.entries.map((entry, index) => ({
      sourceId: entry.sourceId,
      azimuthDeg: (120 + index * 30 + (input.at.getTime() / 60_000) % 20) % 360,
      altitudeDeg: 20 + index * 10,
    })),
): SkyCatalogProvider {
  return {
    load: () => current,
    position,
    cacheKey: () => `${current.catalogVersion}:${current.catalogHash}`,
  };
}

const spot = {
  wgs84: TEST_PUBLISHED_SPOT.wgs84,
  altitudeM: TEST_PUBLISHED_SPOT.altitudeM,
};

test("BFF scene has one deterministic frame per real hourly slice and positions move with time", () => {
  const hourlyAt = [
    "2026-09-04T12:00:00.000Z",
    "2026-09-04T12:30:00.000Z",
  ];
  const provider = providerFor();
  const first = buildSkyScene({ provider, hourlyAt, spot });
  const second = buildSkyScene({ provider, hourlyAt, spot });
  assert.equal(first.state, "AVAILABLE");
  assert.ok(first.catalog);
  assert.equal(first.catalog?.entries.length, 3);
  assert.deepEqual(first.frames.map((frame) => frame.at), hourlyAt);
  assert.ok(first.frames.every((frame) => frame.state === "AVAILABLE"));
  assert.deepEqual(first, second, "same owner snapshot and inputs are deterministic");
  assert.notDeepEqual(
    first.frames[0]?.points,
    first.frames[1]?.points,
    "each real time slice is projected independently",
  );
  assert.equal(first.frames[0]?.points?.length, 3);
  assert.deepEqual(
    first.frames[0]?.points?.map((point) => point[0]),
    [0, 1, 2],
  );
  assert.equal(first.catalog?.entries[0]?.sourceId, "gaia:1");
  assert.equal(first.catalog?.entries[0]?.gMagnitude, 1.1);
  assert.equal(first.catalog?.entries[0]?.bpRp, 0.1);
  assert.equal(first.catalog?.source.id, source.id);
  assert.equal(first.catalog?.catalogVersion, "gaia-dr3-test-v1");
  assert.equal(first.catalog?.catalogHash, "b".repeat(64));
  assert.ok(skySceneSerializedBytes(first) < 1_048_576);
});

test("missing, malformed, duplicate and oversized catalogs fail closed without fake frames", () => {
  const hourlyAt = ["2026-09-04T12:00:00.000Z", "2026-09-04T12:30:00.000Z"];
  const missing: SkyCatalogProvider = {
    load: () => {
      throw new Error("pack_missing");
    },
    position: () => [],
    cacheKey: () => "catalog-unavailable",
  };
  const missingScene = buildSkyScene({ provider: missing, hourlyAt, spot });
  assert.equal(missingScene.state, "UNAVAILABLE");
  assert.equal(missingScene.catalog, null);
  assert.equal(missingScene.unavailableReason, "CATALOG_UNAVAILABLE");
  assert.ok(
    missingScene.frames.every(
      (frame) => frame.at && frame.state === "UNAVAILABLE" && frame.points === null,
    ),
  );

  const malformed = providerFor({ ...snapshot(), catalogHash: "not-a-sha" });
  const malformedScene = buildSkyScene({ provider: malformed, hourlyAt, spot });
  assert.equal(malformedScene.state, "UNAVAILABLE");
  assert.equal(malformedScene.catalog, null);
  assert.equal(malformedScene.unavailableReason, "CATALOG_INVALID");

  const duplicate = providerFor(
    snapshot([
      { sourceId: "gaia:1", gMagnitude: 1, bpRp: 0, raHours: 1, decDeg: 1 },
      { sourceId: "gaia:1", gMagnitude: 2, bpRp: 0, raHours: 2, decDeg: 2 },
    ]),
  );
  const duplicateScene = buildSkyScene({ provider: duplicate, hourlyAt, spot });
  assert.equal(duplicateScene.state, "UNAVAILABLE");
  assert.equal(duplicateScene.unavailableReason, "CATALOG_INVALID");

  const oversizedSource: SourceSummary = {
    ...source,
    limitations: ["x".repeat(1_100_000)],
  };
  const oversized = providerFor({ ...snapshot(), source: oversizedSource });
  const oversizedScene = buildSkyScene({ provider: oversized, hourlyAt, spot });
  assert.equal(oversizedScene.state, "UNAVAILABLE");
  assert.equal(oversizedScene.unavailableReason, "SCENE_SERIALIZED_SIZE_LIMIT");
});

test("catalog and scene limits admit exactly 2048 rows but never a 2049th", () => {
  const entries = Array.from({ length: SKY_SCENE_MAX_CATALOG_ENTRIES }, (_, index) => ({
    sourceId: `gaia:${index}`,
    gMagnitude: 5.5,
    bpRp: null,
    raHours: (index % 24) + 0.001,
    decDeg: -89 + (index % 179),
  }));
  const hourlyAt = ["2026-09-04T12:00:00.000Z"];
  const accepted = buildSkyScene({
    provider: providerFor(snapshot(entries), (input) =>
      input.catalog.entries.map((entry) => ({
        sourceId: entry.sourceId,
        azimuthDeg: 180,
        altitudeDeg: 1,
      })),
    ),
    hourlyAt,
    spot,
  });
  assert.equal(accepted.state, "AVAILABLE");
  assert.equal(accepted.catalog?.entries.length, SKY_SCENE_MAX_CATALOG_ENTRIES);
  assert.equal(accepted.frames[0]?.points?.length, SKY_SCENE_MAX_CATALOG_ENTRIES);
  assert.ok(skySceneSerializedBytes(accepted) < 1_048_576);

  const rejected = buildSkyScene({
    provider: providerFor(snapshot([...entries, { ...entries[0]!, sourceId: "gaia:overflow" }])),
    hourlyAt,
    spot,
  });
  assert.equal(rejected.state, "UNAVAILABLE");
  assert.equal(rejected.unavailableReason, "CATALOG_LIMIT_INVALID");
});

test("real catalog cache identity binds projection algorithm as well as asset bytes", () => {
  const provider = createGaiaDr3SkyCatalogProvider();
  const catalog = provider.load();
  assert.equal(provider.cacheKey(), `${catalog.catalogVersion}:${catalog.catalogHash}:${GAIA_DR3_PROJECTION_ALGORITHM}`);
  assert.notEqual(provider.cacheKey(), `${catalog.catalogVersion}:${catalog.catalogHash}`);
});

test("SkyReport cache identity changes when catalog version/hash changes", async () => {
  let version = "gaia-v1";
  let hash = "c".repeat(64);
  let positionCalls = 0;
  const provider: SkyCatalogProvider = {
    load: () => ({ ...snapshot(), catalogVersion: version, catalogHash: hash }),
    position: (input) => {
      positionCalls += 1;
      return input.catalog.entries.map((entry, index) => ({
        sourceId: entry.sourceId,
        azimuthDeg: 100 + index,
        altitudeDeg: 20 + index,
      }));
    },
    cacheKey: () => `${version}:${hash}`,
  };
  const service = createTestMiniappService({
    repository: new InMemoryTestRepository([TEST_PUBLISHED_SPOT]),
    skyCatalog: provider,
    cache: new MemoryCache(),
  });
  try {
    const context = (
      await service.resolveObservationContext({
        location: { kind: "FORMAL_SPOT", spotId: TEST_PUBLISHED_SPOT.spotId },
        localDate: "2026-09-04",
      })
    ).data;
    const first = await service.getSky(TEST_PUBLISHED_SPOT.spotId, context.contextId);
    const firstCalls = positionCalls;
    const cached = await service.getSky(TEST_PUBLISHED_SPOT.spotId, context.contextId);
    assert.equal(positionCalls, firstCalls);
    assert.equal(cached.data.context.dataRevision, first.data.context.dataRevision);
    hash = "d".repeat(64);
    version = "gaia-v2";
    const refreshed = await service.getSky(TEST_PUBLISHED_SPOT.spotId, context.contextId);
    assert.ok(positionCalls > firstCalls);
    assert.equal(refreshed.data.skyScene.catalog?.catalogHash, hash);
    assert.equal(refreshed.data.skyScene.catalog?.catalogVersion, version);
    assert.notEqual(refreshed.data.context.dataRevision, first.data.context.dataRevision);
  } finally {
    await service.onModuleDestroy();
  }
});

test("the formal Gaia DR3 pack projects every real hourly slice under 1 MiB", () => {
  const provider = createGaiaDr3SkyCatalogProvider();
  const calculation = calculateMiniappNightSky({
    latitude: TEST_PUBLISHED_SPOT.wgs84.latitude,
    longitude: TEST_PUBLISHED_SPOT.wgs84.longitude,
    elevationM: TEST_PUBLISHED_SPOT.altitudeM ?? 0,
    timezone: TEST_PUBLISHED_SPOT.timezone,
    nightDate: "2026-09-04",
    target: "jupiter",
    cadenceMinutes: 30,
  });
  const scene = buildSkyScene({
    provider,
    hourlyAt: calculation.samples.map((sample) => sample.at),
    spot: {
      wgs84: TEST_PUBLISHED_SPOT.wgs84,
      altitudeM: TEST_PUBLISHED_SPOT.altitudeM,
    },
  });
  assert.equal(scene.state, "AVAILABLE");
  assert.equal(scene.catalog?.catalogVersion, "gaia-dr3-bright-stars.v1");
  assert.match(scene.catalog?.catalogHash ?? "", /^[a-f0-9]{64}$/u);
  assert.equal(scene.catalog?.entries.length, SKY_SCENE_MAX_CATALOG_ENTRIES);
  assert.equal(scene.frames.length, calculation.samples.length);
  assert.ok(scene.frames.every((frame) => (frame.points?.length ?? 0) > 0));
  assert.ok(skySceneSerializedBytes(scene) < 1_048_576);
});
