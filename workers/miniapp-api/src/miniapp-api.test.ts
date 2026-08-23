import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_USER_PREFERENCES,
  EMPTY_FILTER_STATE,
  toggleFilter,
  type RouteOverview,
  type SourceSummary,
} from "@starward/miniapp-contracts";
import { TEST_PUBLISHED_SPOT } from "@starward/miniapp-contracts/test-fixtures";
import { MiniappService } from "./miniapp-service.ts";
import { parserGate, validateExternalUrl } from "./security.ts";
import { createTestMiniappService } from "./test-fixtures/create-test-service.ts";
import { InMemoryTestRepository } from "./test-fixtures/in-memory-repository.ts";
import { createTestRuntimeConfig } from "./runtime-config.ts";

async function contextFor(
  service: MiniappService,
  spotId = TEST_PUBLISHED_SPOT.spotId,
) {
  return (
    await service.resolveObservationContext({
      location: { kind: "FORMAL_SPOT", spotId },
      localDate: "2026-08-06",
    })
  ).data;
}

function testService() {
  return createTestMiniappService({
    repository: new InMemoryTestRepository([TEST_PUBLISHED_SPOT]),
  });
}

async function user(service: MiniappService, suffix: string) {
  return (
    await service.login({
      code: "local:installation-" + suffix.padEnd(12, "x"),
    })
  ).data;
}

test("map scene is context-bound and computes actual dynamic projections", async () => {
  const service = testService();
  try {
    const context = await contextFor(service);
    const origin = TEST_PUBLISHED_SPOT;
    const result = await service.getMapScene({
      contextId: context.contextId,
      layer: "CLOUD",
      cloudLayer: "LOW",
      viewport: {
        center: {
          latitude: origin.gcj02.latitude,
          longitude: origin.gcj02.longitude,
        },
        zoom: 12,
      },
    });
    assert.equal(result.data.context.contextId, context.contextId);
    assert.equal(result.contextRevision, context.revision);
    assert.equal(result.data.viewport?.coordinateSystem, "GCJ02");
    assert.ok(result.data.spots.length > 0);
    assert.equal(result.data.spots.length, 1);
    assert.equal(result.data.layer.kind, "CLOUD");
    assert.equal(result.data.layer.cloudLayer, "LOW");
    assert.ok(result.data.layer.polygons.length > 0);
    assert.ok(
      Object.values(result.data.evaluations).every(
        (evaluation) => evaluation.cloudPercent !== null,
      ),
    );
    assert.ok(result.data.timeFrames.length > 1);
    assert.ok(result.data.timeFrames.length <= 49);
    assert.ok(
      result.data.timeFrames.every(
        (frame) => frame.dynamicLayer?.kind === "CLOUD",
      ),
    );
    assert.ok(
      new Set(
        result.data.timeFrames.map(
          (frame) => frame.spotSignals[origin.spotId]?.cloudPercent,
        ),
      ).size > 1,
    );
    assert.ok(
      new Set(
        result.data.timeFrames.map(
          (frame) => frame.dynamicLayer?.polygons[0]?.fillColor,
        ),
      ).size > 1,
      "dynamic cloud frames must change a property passed to the native Map polygon",
    );
    assert.ok(Buffer.byteLength(JSON.stringify(result.data), "utf8") < 256_000);
    assert.equal(
      result.data.filterCapabilities.byGroup.DISTANCE_DRIVE_TIME.state,
      "UNAVAILABLE",
    );
    const opportunity = await service.getMapScene({
      contextId: context.contextId,
      layer: "OPPORTUNITY",
      viewport: {
        center: {
          latitude: origin.gcj02.latitude,
          longitude: origin.gcj02.longitude,
        },
        zoom: 12,
      },
    });
    const sky = await service.getSky(origin.spotId, context.contextId);
    assert.equal(opportunity.data.layer.kind, "OPPORTUNITY");
    const frame = opportunity.data.timeFrames.reduce((nearest, candidate) =>
      Math.abs(Date.parse(candidate.atUtc) - Date.parse(context.selectedAtUtc)) <
      Math.abs(Date.parse(nearest.atUtc) - Date.parse(context.selectedAtUtc))
        ? candidate
        : nearest,
    );
    assert.equal(frame.dynamicLayer?.kind, "OPPORTUNITY");
    assert.equal(
      opportunity.data.layer.polygons[0]?.label,
      frame.spotSignals[origin.spotId]?.opportunityLabel,
    );
    assert.notEqual(
      opportunity.data.layer.polygons[0]?.label,
      sky.data.decision.skyOpportunity.label,
    );
    assert.notEqual(
      opportunity.data.layer.polygons[0]?.label,
      sky.data.decision.label,
    );
    const light = await service.getMapScene({
      contextId: context.contextId,
      layer: "LIGHT_POLLUTION",
      viewport: {
        center: {
          latitude: origin.gcj02.latitude,
          longitude: origin.gcj02.longitude,
        },
        zoom: 12,
      },
    });
    assert.ok(light.data.layer.polygons.length > 0);
    assert.ok(light.data.timeFrames.every((item) => item.dynamicLayer === null));
  } finally {
    await service.onModuleDestroy();
  }
});

test("route provider is invoked only after an explicit route-bearing action", async () => {
  let calls = 0;
  const routeSource: SourceSummary = {
    ...TEST_PUBLISHED_SPOT.source,
    id: "route:test:current",
    kind: "THIRD_PARTY_ROUTE",
    provider: "Test route provider",
    title: "Explicit route result",
    state: "FRESH",
  };
  const routeValue: RouteOverview = {
    kind: "ROUTE_ESTIMATE",
    originLabel: null,
    distanceKm: 12.3,
    driveMinutes: 24,
    walkingMinutes: null,
    lastRoad: "测试道路",
    parkingGuidance: "以点位证据为准",
    state: "FRESH",
    source: routeSource,
  };
  const service = createTestMiniappService({
    repository: new InMemoryTestRepository([TEST_PUBLISHED_SPOT]),
    config: createTestRuntimeConfig({ routeProvider: "AMAP" }),
    route: {
      key: "counting-route",
      async estimate() {
        calls += 1;
        return {
          value: routeValue,
          state: "FRESH" as const,
          source: routeSource,
          errorCode: null,
        };
      },
    },
  });
  try {
    const mapContext = (
      await service.resolveObservationContext({
        location: {
          kind: "MAP_POINT",
          wgs84: {
            system: "WGS84",
            latitude: TEST_PUBLISHED_SPOT.wgs84.latitude + 0.05,
            longitude: TEST_PUBLISHED_SPOT.wgs84.longitude + 0.05,
          },
          displayName: "当前地图中心",
          source: "MAP_VIEWPORT",
          timezoneHint: TEST_PUBLISHED_SPOT.timezone,
        },
        localDate: "2026-08-06",
      })
    ).data;
    const context = (
      await service.resolveObservationContext({
        location: {
          kind: "FORMAL_SPOT",
          spotId: TEST_PUBLISHED_SPOT.spotId,
        },
        routeOriginContextId: mapContext.contextId,
        localDate: "2026-08-06",
      })
    ).data;

    const defaultScene = await service.getMapScene({
      contextId: mapContext.contextId,
      filters: EMPTY_FILTER_STATE,
    });
    assert.equal(calls, 0);
    assert.equal(
      defaultScene.data.evaluations[TEST_PUBLISHED_SPOT.spotId]?.distanceKind,
      "STRAIGHT_LINE",
    );
    const overview = await service.getSpotOverview(
      TEST_PUBLISHED_SPOT.spotId,
      context.contextId,
    );
    assert.equal(calls, 0);
    assert.equal(overview.data.route.kind, "STRAIGHT_LINE_ONLY");

    const explicit = await service.estimateRoute({
      contextId: context.contextId,
      spotId: TEST_PUBLISHED_SPOT.spotId,
    });
    assert.equal(calls, 1);
    assert.equal(explicit.data.kind, "ROUTE_ESTIMATE");
    assert.equal(explicit.data.originLabel, "当前地图中心");
  } finally {
    await service.onModuleDestroy();
  }
});

test("Observation Context enforces observation-night and optimistic revision", async () => {
  const service = testService();
  try {
    const context = await contextFor(service);
    assert.equal(context.localDate, "2026-08-06");
    assert.ok(
      Date.parse(context.selectedAtUtc) >= Date.parse(context.nightStartUtc),
    );
    assert.ok(
      Date.parse(context.selectedAtUtc) < Date.parse(context.nightEndUtc),
    );
    const updated = (
      await service.updateObservationContext(context.contextId, {
        expectedRevision: context.revision,
        selectedAt: "2026-08-06T15:30:00.000Z",
        cloudLayer: "HIGH",
      })
    ).data;
    assert.equal(updated.revision, context.revision + 1);
    assert.equal(updated.weatherView.cloudLayer, "HIGH");
    await assert.rejects(
      service.updateObservationContext(context.contextId, {
        expectedRevision: context.revision,
        selectedAt: "2026-08-06T16:00:00.000Z",
      }),
      /observation_context_conflict/u,
    );
    await assert.rejects(
      service.resolveObservationContext({
        location: { kind: "FORMAL_SPOT", spotId: TEST_PUBLISHED_SPOT.spotId },
        localDate: "2026-08-06",
        selectedAt: "2026-08-05T00:00:00.000Z",
      }),
      /observation_selected_at_outside_night/u,
    );
  } finally {
    await service.onModuleDestroy();
  }
});

test("search never manufactures an ordinary place or formal spot id", async () => {
  const service = testService();
  try {
    const result = await service.search("一个不存在的普通地点");
    assert.deepEqual(result.data.formalSpots, []);
    assert.deepEqual(result.data.candidates, []);
    assert.deepEqual(result.data.ordinaryPlaces, []);
    assert.equal(result.dataState, "PARTIAL");
    assert.match(result.warnings[0] ?? "", /没有生成伪地点/u);
  } finally {
    await service.onModuleDestroy();
  }
});

test("search keeps provider places separate from formal and candidate identities", async () => {
  const source: SourceSummary = {
    ...TEST_PUBLISHED_SPOT.source,
    id: "place:test:current",
    kind: "THIRD_PARTY_PLACE",
    provider: "Test place provider",
    title: "Ordinary place result",
    state: "FRESH",
  };
  const service = createTestMiniappService({
    repository: new InMemoryTestRepository([TEST_PUBLISHED_SPOT]),
    placeSearch: {
      key: "test-place-search",
      async search() {
        return {
          value: [
            {
              placeId: "poi:test",
              label: "普通地点",
              address: "测试路",
              region: "深圳市",
              kind: "ORDINARY_PLACE" as const,
              location: {
                system: "GCJ02" as const,
                latitude: 22.5,
                longitude: 114.0,
              },
              actions: [
                "MOVE_MAP",
                "FIND_NEARBY_FORMAL_SPOTS",
              ] as const,
              spotId: null,
              nightSkyAllowed: false as const,
              dataState: "FRESH" as const,
              source,
            },
          ],
          state: "FRESH" as const,
          source,
          errorCode: null,
        };
      },
    },
  });
  try {
    const result = await service.search("普通地点");
    assert.equal(result.dataState, "FRESH");
    assert.equal(result.data.formalSpots.length, 0);
    assert.equal(result.data.candidates.length, 0);
    assert.equal(result.data.ordinaryPlaces.length, 1);
    assert.equal(result.data.ordinaryPlaces[0]?.spotId, null);
    assert.equal(result.data.ordinaryPlaces[0]?.nightSkyAllowed, false);
  } finally {
    await service.onModuleDestroy();
  }
});

test("profile and parser URL boundaries fail closed", () => {
  assert.equal(validateExternalUrl("javascript:alert(1)").ok, false);
  assert.equal(
    validateExternalUrl("http://127.0.0.1/private").code,
    "SSRF_PRIVATE_DESTINATION",
  );
  const gate = parserGate("XIAOHONGSHU", "https://example.com/my-post");
  assert.equal(gate.allowed, false);
  assert.equal(gate.reason, "CAPABILITY_DISABLED_UNLICENSED");
});

test("identity-bound data cannot leak between users", async () => {
  const service = testService();
  try {
    const first = await user(service, "first");
    const second = await user(service, "second");
    const spotId = TEST_PUBLISHED_SPOT.spotId;
    await service.setFavorite(
      first.userId,
      spotId,
      true,
      "favorite:first:0001",
    );
    assert.deepEqual(
      (await service.getFavorites(first.userId)).data.favorites.map(
        (spot) => spot.spotId,
      ),
      [spotId],
    );
    assert.deepEqual(
      (await service.getFavorites(second.userId)).data.favorites,
      [],
    );

    const initial = await service.getPreferences(first.userId);
    assert.deepEqual(initial.data.preferences, DEFAULT_USER_PREFERENCES);
    await service.savePreferences(
      first.userId,
      {
        preferences: {
          ...initial.data.preferences,
          defaultPlace: "河源",
          requiredFacilities: ["PARKING"],
        },
        expectedRevision: initial.data.revision,
      },
      "preferences:first:0001",
    );
    assert.equal(
      (await service.getPreferences(second.userId)).data.preferences
        .defaultPlace,
      DEFAULT_USER_PREFERENCES.defaultPlace,
    );
    await service.savePlan(
      first.userId,
      {
        planId: "plan:first" as never,
        spotId,
        localDate: "2026-08-06",
        localTime: "23:00",
        notes: "仅第一个用户可见",
        expectedRevision: null,
      },
      "plan:first:create:01",
    );
    assert.equal((await service.getPlans(first.userId)).data.plans.length, 1);
    assert.equal((await service.getPlans(second.userId)).data.plans.length, 0);
  } finally {
    await service.onModuleDestroy();
  }
});

test("disabled optional product surfaces fail explicitly", async () => {
  const service = testService();
  try {
    const principal = await user(service, "optional");
    await assert.rejects(
      service.createImportDraft(
        principal.userId,
        {
          platform: "OTHER",
          originalUrl: "https://example.com/my-post",
          rightsConfirmed: true,
        },
        "import:create:00001",
      ),
      /post_import_capability_disabled/u,
    );
    await assert.rejects(
      service.saveProfileLink(
        principal.userId,
        {
          platform: "OTHER",
          displayName: "外部主页",
          url: "https://example.com/profile",
          visibility: "PRIVATE",
          sortOrder: 0,
        },
        "profile:create:001",
      ),
      /profile_links_capability_disabled/u,
    );
  } finally {
    await service.onModuleDestroy();
  }
});

test("all active filters have an explicit evidence disposition", async () => {
  const service = testService();
  try {
    const context = await contextFor(service);
    const filters = toggleFilter(
      EMPTY_FILTER_STATE,
      "distanceDriveTime",
    );
    const result = await service.getMapScene({
      contextId: context.contextId,
      filters,
    });
    assert.deepEqual(result.data.spots, []);
    assert.equal(
      result.data.filterCapabilities.byGroup.DISTANCE_DRIVE_TIME.state,
      "UNAVAILABLE",
    );
    assert.ok(
      result.warnings.some((warning) => warning.includes("当前不可用")),
    );
    assert.ok(
      result.warnings.some((warning) => warning.includes("距离/驾车时间")),
      "filter warnings use the current human-facing filter title",
    );
    assert.equal(
      result.warnings.some((warning) =>
        warning.includes("DISTANCE_DRIVE_TIME"),
      ),
      false,
      "filter enum keys are never exposed as product copy",
    );
  } finally {
    await service.onModuleDestroy();
  }
});

test("empty formal population explains publication verification in user language", async () => {
  const service = createTestMiniappService({
    repository: new InMemoryTestRepository([]),
  });
  try {
    const context = (
      await service.resolveObservationContext({
        location: {
          kind: "MAP_POINT",
          wgs84: {
            system: "WGS84",
            latitude: TEST_PUBLISHED_SPOT.wgs84.latitude,
            longitude: TEST_PUBLISHED_SPOT.wgs84.longitude,
          },
          displayName: "深圳",
          source: "MAP_VIEWPORT",
          timezoneHint: TEST_PUBLISHED_SPOT.timezone,
        },
        localDate: "2026-08-06",
      })
    ).data;
    const result = await service.getMapScene({
      contextId: context.contextId,
      filters: EMPTY_FILTER_STATE,
    });
    assert.deepEqual(result.data.spots, []);
    assert.ok(
      result.warnings.includes(
        "当前区域的观星点仍在核验道路、停车和夜间安全，完成后会在这里显示。",
      ),
    );
    assert.equal(
      result.warnings.some((warning) =>
        warning.includes("没有隐藏或改写来源事实"),
      ),
      false,
    );
  } finally {
    await service.onModuleDestroy();
  }
});

test("detail and sky reject context drift and share one selected time", async () => {
  const service = testService();
  try {
    const context = await contextFor(service);
    const spotId = TEST_PUBLISHED_SPOT.spotId;
    const overview = await service.getSpotOverview(
      spotId,
      context.contextId,
    );
    const sky = await service.getSky(spotId, context.contextId);
    assert.equal(overview.contextRevision, context.revision);
    assert.equal(sky.data.context.contextId, context.contextId);
    assert.equal(sky.data.context.at, context.selectedAtUtc);
    assert.equal(
      sky.data.context.eventCatalogVersion,
      "iau-imo-reviewed-2026.1",
    );
    assert.ok(
      sky.data.targets.some(
        (target) =>
          target.type === "METEOR_SHOWER" &&
          target.targetId === "event-occurrence:007-per:2026",
      ),
    );
    assert.ok(
      sky.sources.some((source) => source.kind === "TEST_FIXTURE"),
      "explicit tests retain visible fixture provenance",
    );
    await assert.rejects(
      service.getSky("spot:another", context.contextId),
      /spot_context_mismatch/u,
    );
  } finally {
    await service.onModuleDestroy();
  }
});

test("equivalent observation contexts never reuse another context identity", async () => {
  const service = testService();
  try {
    const first = await contextFor(service);
    const second = await contextFor(service);
    assert.notEqual(first.contextId, second.contextId);
    assert.equal(first.contextFingerprint, second.contextFingerprint);

    const firstMap = await service.getMapScene({ contextId: first.contextId });
    const secondMap = await service.getMapScene({ contextId: second.contextId });
    assert.equal(firstMap.data.context.contextId, first.contextId);
    assert.equal(secondMap.data.context.contextId, second.contextId);

    const firstSky = await service.getSky(
      TEST_PUBLISHED_SPOT.spotId,
      first.contextId,
    );
    const secondSky = await service.getSky(
      TEST_PUBLISHED_SPOT.spotId,
      second.contextId,
    );
    assert.equal(firstSky.data.context.contextId, first.contextId);
    assert.equal(secondSky.data.context.contextId, second.contextId);
  } finally {
    await service.onModuleDestroy();
  }
});
