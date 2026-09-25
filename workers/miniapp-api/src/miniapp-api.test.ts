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
import { wgs84ToGcj02 } from "@starward/coordinate-system";
import { MiniappService } from "./miniapp-service.ts";
import { parserGate, validateExternalUrl } from "./security.ts";
import { createTestMiniappService } from "./test-fixtures/create-test-service.ts";
import { InMemoryTestRepository } from "./test-fixtures/in-memory-repository.ts";
import type { DarkSkyGridCellRecord } from "./ports.ts";
import { createTestRuntimeConfig } from "./runtime-config.ts";
import { ASTRONOMICAL_EVENT_CATALOG_VERSION } from "./astronomical-event-catalog.ts";

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

test("clear map-point timezone regions are not overridden by the device hint", async () => {
  const service = testService();
  try {
    for (const [latitude, longitude, hint, expected] of [
      [22.282, 114.16, "Asia/Shanghai", "Asia/Hong_Kong"],
      [22.56, 114.59, "Asia/Hong_Kong", "Asia/Shanghai"],
    ] as const) {
      const context = (await service.resolveObservationContext({
        location: { kind: "MAP_POINT", displayName: "时区测试地点",
          wgs84: { system: "WGS84", latitude, longitude }, source: "MAP_VIEWPORT", timezoneHint: hint },
        localDate: "2026-09-26",
      })).data;
      assert.equal(context.timezone, expected);
    }
  } finally { await service.onModuleDestroy(); }
});

test("Hong Kong and Shenzhen border map points use the location, not the phone zone", async () => {
  const service = testService();
  try {
    for (const [latitude, longitude, hint, expected] of [
      [22.516, 114.111, "Asia/Shanghai", "Asia/Hong_Kong"], // northern Hong Kong
      [22.5431, 114.0579, "Asia/Hong_Kong", "Asia/Shanghai"], // default Shenzhen center
      [22.483, 113.922, "Asia/Hong_Kong", "Asia/Shanghai"], // Shekou
    ] as const) {
      const context = (await service.resolveObservationContext({
        location: { kind: "MAP_POINT", displayName: "港深交界测试地点",
          wgs84: { system: "WGS84", latitude, longitude }, source: "MAP_VIEWPORT", timezoneHint: hint },
        localDate: "2026-09-26",
      })).data;
      assert.equal(context.timezone, expected, `${latitude},${longitude}`);
    }
    const withoutHint = (await service.resolveObservationContext({
      location: { kind: "MAP_POINT", displayName: "深圳无设备时区",
        wgs84: { system: "WGS84", latitude: 22.5431, longitude: 114.0579 },
        source: "MAP_VIEWPORT" },
      localDate: "2026-09-26",
    })).data;
    assert.equal(withoutHint.timezone, "Asia/Shanghai");
  } finally { await service.onModuleDestroy(); }
});

async function user(service: MiniappService, suffix: string) {
  return (
    await service.login({
      code: "local:installation-" + suffix.padEnd(12, "x"),
    })
  ).data;
}

test("map time axis includes the exact off-cadence observing instant without duplicate ticks", async () => {
  const service = testService();
  try {
    for (const selectedAt of ["2026-08-06T13:20:00.000Z", "2026-08-06T13:30:00.000Z"]) {
      const context = (await service.resolveObservationContext({ location: { kind: "FORMAL_SPOT", spotId: TEST_PUBLISHED_SPOT.spotId }, localDate: "2026-08-06", selectedAt })).data;
      const scene = await service.getMapScene({ contextId: context.contextId, layer: "CLOUD" });
      const times = scene.data.timeFrames.map(frame => frame.atUtc);
      assert.equal(times.filter(at => at === selectedAt).length, 1);
      assert.deepEqual(times, [...times].sort());
      assert.ok(times.length <= 49);
      assert.equal(scene.data.context.selectedAtUtc, selectedAt);
    }
  } finally { await service.onModuleDestroy(); }
});

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
    assert.equal(result.data.layer.cloudLayer, "TOTAL");
    assert.ok(result.data.layer.polygons.length > 0);
    assert.ok(
      Object.values(result.data.evaluations).every(
        (evaluation) => evaluation.cloudPercent !== null,
      ),
    );
    assert.ok(result.data.timeFrames.length > 1);
    assert.ok(result.data.timeFrames.length <= 49);
    assert.ok(
      result.data.timeFrames.every((frame) => frame.moonPhase !== null),
      "every real map time slice carries its calculated semantic moon phase",
    );
    assert.ok(
      Object.values(result.data.evaluations).every(
        (evaluation) =>
          evaluation.lunarFacts.phase !== null &&
          evaluation.lunarFacts.phaseAngleDeg !== null &&
          evaluation.lunarFacts.source.id.length > 0,
      ),
      "spot evaluations expose attributed lunar facts for the selected instant",
    );
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
    assert.equal("DISTANCE_DRIVE_TIME" in result.data.filterCapabilities.byGroup, false);
    assert.equal("LOW_CLOUD_THRESHOLD" in result.data.filterCapabilities.byGroup, false);
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
    assert.equal(light.data.layer.state, "UNAVAILABLE");
    assert.deepEqual(light.data.layer.polygons, [], "point fixtures must not be expanded into a fake night-light area");
    assert.ok(light.data.timeFrames.every((item) => item.dynamicLayer === null));
  } finally {
    await service.onModuleDestroy();
  }
});

test("map light pollution draws only published grid geometry with a translucent fill", async () => {
  const origin = TEST_PUBLISHED_SPOT;
  const repository = new InMemoryTestRepository([origin]);
  Object.defineProperty(repository, "kind", { value: "postgres" });
  const grid: DarkSkyGridCellRecord = {
    cellId: "test-published-light-cell",
    datasetVersion: "test-dark-sky",
    productBand: "LOW",
    label: "测试夜光网格",
    radiance: { median: 1, p10: 0.8, p90: 1.2, unit: "nW/cm²/sr" },
    minimumCloudFreeObservations: 8,
    boundsWgs84: {
      west: origin.wgs84.longitude - 0.005,
      south: origin.wgs84.latitude - 0.005,
      east: origin.wgs84.longitude + 0.005,
      north: origin.wgs84.latitude + 0.005,
    },
    state: "ESTIMATED",
    source: { ...origin.source, id: "test-published-light-source", title: "测试年度夜光" },
  };
  Object.defineProperty(repository, "listDarkSkyGridCells", { value: async () => [grid] });
  const service = createTestMiniappService({ repository });
  try {
    const context = await contextFor(service);
    const light = await service.getMapScene({
      contextId: context.contextId,
      layer: "LIGHT_POLLUTION",
      viewport: { center: origin.gcj02, zoom: 12 },
    });
    assert.equal(light.data.layer.state, "PARTIAL");
    assert.equal(light.data.layer.polygons.length, 1);
    assert.equal(light.data.layer.polygons[0]?.id, `light:${grid.cellId}`);
    assert.match(light.data.layer.polygons[0]?.fillColor ?? "", /66$/u);
    const expectedPoints = [
      { lat: grid.boundsWgs84.south, lon: grid.boundsWgs84.west },
      { lat: grid.boundsWgs84.south, lon: grid.boundsWgs84.east },
      { lat: grid.boundsWgs84.north, lon: grid.boundsWgs84.east },
      { lat: grid.boundsWgs84.north, lon: grid.boundsWgs84.west },
    ].map((point) => {
      const converted = wgs84ToGcj02({ ...point, system: "WGS84" });
      return { latitude: converted.lat, longitude: converted.lon };
    });
    assert.deepEqual(light.data.layer.polygons[0]?.points, expectedPoints);
  } finally {
    await service.onModuleDestroy();
  }
});

test("map, overview and the legacy route endpoint never invoke a road provider", async () => {
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
    travelMode: "DRIVING",
    originLabel: null,
    distanceKm: 12.3,
    durationMinutes: 24,
    driveMinutes: 24,
    walkingMinutes: null,
    lastRoad: "测试道路",
    parkingGuidance: "以点位证据为准",
    state: "FRESH",
    source: routeSource,
  };
  const service = createTestMiniappService({
    repository: new InMemoryTestRepository([TEST_PUBLISHED_SPOT]),
    config: createTestRuntimeConfig(),
    route: {
      key: "counting-route",
      async estimate(input) {
        calls += 1;
        const travelMode = input.travelMode ?? "DRIVING";
        const durationMinutes = travelMode === "WALKING" ? 180 : 24;
        return {
          value: {
            ...routeValue,
            travelMode,
            durationMinutes,
            driveMinutes: travelMode === "DRIVING" ? durationMinutes : null,
            walkingMinutes: travelMode === "WALKING" ? durationMinutes : null,
          },
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
    assert.equal(calls, 0);
    assert.equal(explicit.data.kind, "UNAVAILABLE");
    assert.equal(explicit.data.originLabel, "当前地图中心");
    const walking = await service.estimateRoute({
      contextId: context.contextId,
      spotId: TEST_PUBLISHED_SPOT.spotId,
      travelMode: "WALKING",
    });
    assert.equal(calls, 0);
    assert.equal(walking.data.durationMinutes, null);
    assert.equal(walking.data.driveMinutes, null);
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
    assert.equal(updated.weatherView.cloudLayer, "TOTAL", "legacy layer input cannot revive retired layered clouds");
    const nextNight = (
      await service.updateObservationContext(context.contextId, {
        expectedRevision: updated.revision,
        localDate: "2026-08-07",
        selectedAt: "2026-08-07T15:30:00.000Z",
        eventInstanceId: null,
      })
    ).data;
    assert.equal(nextNight.localDate, "2026-08-07");
    assert.equal(nextNight.selectedAtUtc, "2026-08-07T15:30:00.000Z");
    assert.equal(nextNight.nightStartUtc, "2026-08-07T04:00:00.000Z");
    assert.equal(nextNight.nightEndUtc, "2026-08-08T04:00:00.000Z");
    assert.notEqual(nextNight.contextFingerprint, updated.contextFingerprint);
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
    assert.equal(result.dataState, "FRESH");
    assert.deepEqual(result.warnings, []);
  } finally {
    await service.onModuleDestroy();
  }
});

test("own-spot search never invokes or exposes a retired ordinary-place provider", async () => {
  let calls = 0;
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
        calls++;
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
    assert.equal(result.data.ordinaryPlaces.length, 0);
    assert.equal(calls, 0);
    const formal = await service.search(TEST_PUBLISHED_SPOT.name);
    assert.equal(formal.data.formalSpots[0]?.spotId, TEST_PUBLISHED_SPOT.spotId);
    assert.equal(calls, 0);
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
    const planOrigin = await service.resolveObservationContext({
      location: {
        kind: "MAP_POINT",
        displayName: "深圳地图中心",
        wgs84: {
          latitude: 22.5431,
          longitude: 114.0579,
          system: "WGS84",
        },
        source: "MAP_VIEWPORT",
        timezoneHint: "Asia/Shanghai",
      },
      localDate: "2026-08-06",
    });
    const savedPlan = await service.savePlan(
      first.userId,
      {
        planId: "plan:first" as never,
        spotId,
        observationContextId: planOrigin.data.contextId,
        localDate: "2026-08-06",
        localTime: "23:00",
        timing: { endLocalDate: "2026-08-07", endLocalTime: "02:00", departureLocalDate: "2026-08-06", departureLocalTime: "20:00" },
        travel: { origin: "深圳地图中心", mode: "DRIVING" },
        eventOccurrenceIds: ["event-occurrence:007-per:2026"],
        notes: "仅第一个用户可见",
        reminders: [{ reminderId: "first-reminder", title: "检查电池", hoursBeforeDeparture: 1, notifyOnWechat: false, items: [{ itemId: "battery", text: "相机电池", completed: true }] }],
        expectedRevision: null,
      },
      "plan:first:create:01",
    );
    assert.equal(
      savedPlan.data.contextSnapshot.schemaVersion,
      "observation-context-snapshot-v2",
    );
    assert.equal(
      savedPlan.data.contextSnapshot.schemaVersion ===
        "observation-context-snapshot-v2"
        ? savedPlan.data.contextSnapshot.routeOrigin?.displayName
        : null,
      "深圳地图中心",
    );
    const initialPlans = await service.getPlans(first.userId);
    assert.equal(initialPlans.data.plans.length, 1);
    assert.equal(initialPlans.data.reminderNotifications[0]?.state, "NOT_REQUESTED");
    const checklistScheduleVersion = initialPlans.data.reminderNotifications[0]?.scheduleVersion;
    assert.deepEqual((await service.getPlans(first.userId)).data.plans[0]?.reminders, savedPlan.data.reminders);
    await assert.rejects(service.savePlan(first.userId, {
      planId: savedPlan.data.planId, spotId, observationContextId: planOrigin.data.contextId,
      localDate: "2026-08-06", localTime: "23:00", timing: savedPlan.data.timing!,
      reminders: savedPlan.data.reminders!, notes: "legacy editor without travel",
      eventOccurrenceIds: savedPlan.data.eventOccurrenceIds!,
      expectedRevision: savedPlan.data.revision,
    }, "plan:first:legacy-travel:01"), /plan_travel_required/);
    await assert.rejects(service.savePlan(first.userId, {
      planId: savedPlan.data.planId, spotId, observationContextId: planOrigin.data.contextId,
      localDate: "2026-08-06", localTime: "23:00", timing: savedPlan.data.timing!,
      reminders: savedPlan.data.reminders!, travel: { origin: "", mode: "DRIVING" },
      eventOccurrenceIds: savedPlan.data.eventOccurrenceIds!,
      notes: savedPlan.data.notes, expectedRevision: savedPlan.data.revision,
    }, "plan:first:blank-travel:01"), /invalid_plan_travel/);
    assert.ok(savedPlan.data.timing);
    assert.deepEqual(savedPlan.data.travel, { origin: "深圳地图中心", mode: "DRIVING" });
    await assert.rejects(service.savePlan(first.userId, {
      planId: savedPlan.data.planId, spotId, observationContextId: planOrigin.data.contextId,
      localDate: "2026-08-06", localTime: "23:00", timing: savedPlan.data.timing,
      travel: savedPlan.data.travel,
      eventOccurrenceIds: savedPlan.data.eventOccurrenceIds!,
      notes: "legacy editor without reminders", expectedRevision: savedPlan.data.revision,
    }, "plan:first:legacy:01"), /plan_reminders_required/);
    assert.deepEqual((await service.getPlans(first.userId)).data.plans[0]?.reminders, savedPlan.data.reminders);
    assert.ok((await service.getPlans(first.userId)).data.planSpots?.some(spot => spot.spotId === spotId && spot.name));
    assert.deepEqual((await service.getPlans(second.userId)).data.planSpots, []);
    assert.deepEqual((await service.getPlans(first.userId)).data.plans[0]?.timing, savedPlan.data.timing);
    assert.deepEqual(savedPlan.data.eventOccurrenceIds, ["event-occurrence:007-per:2026"]);
    await assert.rejects(service.savePlan(first.userId, {
      planId: savedPlan.data.planId, spotId, observationContextId: planOrigin.data.contextId,
      localDate: "2026-08-06", localTime: "23:00", timing: savedPlan.data.timing!, travel: savedPlan.data.travel,
      reminders: savedPlan.data.reminders!, notes: savedPlan.data.notes, expectedRevision: savedPlan.data.revision,
    }, "plan:first:legacy-event:01"), /plan_event_occurrences_required/);
    await assert.rejects(service.savePlan(first.userId, {
      planId: savedPlan.data.planId, spotId, observationContextId: planOrigin.data.contextId,
      localDate: "2026-08-06", localTime: "23:00", timing: savedPlan.data.timing!, travel: savedPlan.data.travel,
      reminders: savedPlan.data.reminders!, eventOccurrenceIds: ["event-occurrence:unknown:2026"], notes: savedPlan.data.notes,
      expectedRevision: savedPlan.data.revision,
    }, "plan:first:unknown-event:01"), /plan_event_occurrence_invalid/);
    await assert.rejects(service.savePlan(first.userId, {
      planId: savedPlan.data.planId, spotId, observationContextId: planOrigin.data.contextId,
      localDate: "2026-08-06", localTime: "23:00", timing: savedPlan.data.timing!, travel: savedPlan.data.travel,
      reminders: savedPlan.data.reminders!, eventOccurrenceIds: ["event-occurrence:007-per:2026", "event-occurrence:006-lyr:2026"], notes: savedPlan.data.notes,
      expectedRevision: savedPlan.data.revision,
    }, "plan:first:new-multi-event:01"), /plan_event_occurrence_single_selection_required/);
    await assert.rejects(service.savePlan(first.userId, {
      planId: "plan:notes-too-long" as never, spotId,
      observationContextId: planOrigin.data.contextId,
      localDate: "2026-08-06", localTime: "23:00",
      notes: "字".repeat(2001), expectedRevision: null,
    }, "plan:notes-too-long:01"), /invalid_plan_notes/);
    assert.equal((await service.getPlans(first.userId)).data.plans.length, 1);
    const planLibrary = await service.getUserLibrary(first.userId);
    assert.ok(planLibrary.data.planSpots.some((spot) => spot.spotId === spotId && spot.name));
    assert.deepEqual((await service.getUserLibrary(second.userId)).data.planSpots, []);
    assert.equal((await service.getPlans(second.userId)).data.plans.length, 0);
    const completion = { reminderId: "first-reminder", itemId: "battery", completed: false, expectedRevision: savedPlan.data.revision };
    service.observationContexts.get = async () => { throw new Error("context_unavailable"); };
    service.observationContexts.resolve = async () => { throw new Error("context_unavailable"); };
    const checked = (await service.setPlanChecklistCompletion(first.userId, savedPlan.data.planId, completion, "checklist:first:0001")).data;
    assert.equal(checked.reminders?.[0]?.items[0]?.completed, false);
    assert.deepEqual(checked.travel, savedPlan.data.travel);
    assert.deepEqual(checked.eventOccurrenceIds, savedPlan.data.eventOccurrenceIds);
    assert.equal(checked.revision, savedPlan.data.revision + 1);
    assert.deepEqual(checked.contextSnapshot, savedPlan.data.contextSnapshot);
    assert.deepEqual(checked.timing, savedPlan.data.timing);
    assert.equal(checked.notes, savedPlan.data.notes);
    assert.deepEqual((await service.setPlanChecklistCompletion(first.userId, savedPlan.data.planId, completion, "checklist:first:0001")).data, checked);
    await assert.rejects(service.setPlanChecklistCompletion(first.userId, savedPlan.data.planId, { ...completion, completed: true }, "checklist:first:0001"), /idempotency_conflict/);
    await assert.rejects(service.setPlanChecklistCompletion(first.userId, savedPlan.data.planId, completion, "checklist:first:0002"), /plan_revision_conflict/);
    await assert.rejects(service.setPlanChecklistCompletion(second.userId, savedPlan.data.planId, completion, "checklist:first:0001"), /plan_not_found/);
    await assert.rejects(service.setPlanChecklistCompletion(first.userId, savedPlan.data.planId, { ...completion, expectedRevision: checked.revision, itemId: "removed-item" }, "checklist:first:0003"), /item_not_found/);
    assert.equal((await service.getPlans(first.userId)).data.plans[0]?.revision, checked.revision);
    assert.equal((await service.getPlans(first.userId)).data.reminderNotifications[0]?.scheduleVersion, checklistScheduleVersion);
  } finally {
    await service.onModuleDestroy();
  }
});

test("account export is server-owned and deletion revokes identity state", async () => {
  const service = testService();
  try {
    const account = await user(service, "account-data");
    await service.setFavorite(
      account.userId,
      TEST_PUBLISHED_SPOT.spotId,
      true,
      "account-data:favorite:0001",
    );
    const preferences = await service.getPreferences(account.userId);
    await service.savePreferences(
      account.userId,
      {
        preferences: {
          ...preferences.data.preferences,
          defaultPlace: "河源",
        },
        expectedRevision: preferences.data.revision,
      },
      "account-data:preferences:0001",
    );

    const exported = await service.exportAccountData(account.userId);
    assert.equal(exported.data.schemaVersion, "starward-account-data-export-v1");
    assert.equal(exported.data.account.userId, account.userId);
    assert.deepEqual(exported.data.favoriteSpotIds, [TEST_PUBLISHED_SPOT.spotId]);
    assert.equal(exported.data.preferences.preferences.defaultPlace, "河源");
    assert.deepEqual(exported.data.excluded, [
      "SESSION_CREDENTIALS",
      "WECHAT_IDENTITY_DIGEST",
      "INTERNAL_MEDIA_OBJECT_KEYS",
      "RAW_MEDIA_BYTES",
    ]);

    await assert.rejects(
      service.deleteAccount(
        account.userId,
        { confirmation: "WRONG" as never },
        "account-data:delete:invalid",
      ),
      /account_deletion_confirmation_invalid/u,
    );
    const deleted = await service.deleteAccount(
      account.userId,
      { confirmation: "DELETE_ACCOUNT" },
      "account-data:delete:0001",
    );
    assert.equal(deleted.data.accountState, "DELETED");
    assert.equal(deleted.data.sessionsRevoked, true);
    await assert.rejects(
      service.auth.requirePrincipal(`Bearer ${account.accessToken}`),
      /auth_required/u,
    );
  } finally {
    await service.onModuleDestroy();
  }
});

test("profile save replays before duplicate checks and still rejects a new duplicate intent", async () => {
  const service = testService();
  try {
    const principal = await user(service, "profile-replay");
    const input = { platform: "OTHER" as const, displayName: "Retry test", url: "https://example.com/retry", visibility: "PRIVATE" as const, sortOrder: 0 };
    const first = await service.saveProfileLink(principal.userId, input, "profile:replay:0001");
    const replay = await service.saveProfileLink(principal.userId, input, "profile:replay:0001");
    assert.deepEqual(replay.data, first.data);
    await assert.rejects(service.saveProfileLink(principal.userId, input, "profile:replay:0002"), /profile_link_duplicate/);
    const other = await user(service, "profile-other");
    const independent = await service.saveProfileLink(other.userId, input, "profile:replay:0001");
    assert.notEqual(independent.data.profileLinkId, first.data.profileLinkId);
  } finally { await service.onModuleDestroy(); }
});

test("pending proposal sky is owner-scoped and bound to the submitted coordinate", async () => {
  const service = testService();
  try {
    const owner = await user(service, "proposal-sky-owner");
    const stranger = await user(service, "proposal-sky-other");
    const location = { displayName: "海风观星台", region: "深圳市大鹏新区", wgs84: { system: "WGS84" as const, latitude: 22.56, longitude: 114.59 } };
    const draft = (await service.createContributionDraft(owner.userId, {
      kind: "NEW_SPOT_PROPOSAL", spotId: null, candidateLocation: location,
      observedAt: null, topics: [], detail: "", rightsConfirmed: false,
      preciseLocationConsent: true,
      candidateProfile: { fields: { name: "海风观星台", address: "深圳市大鹏新区" }, media: {} },
    }, "proposal-sky-create:0001")).data;
    const pending = (await service.submitContribution(owner.userId, draft.submissionId, draft.revision, "proposal-sky-submit:0001")).data;
    const context = (await service.resolveObservationContext({
      location: { kind: "MAP_POINT", displayName: location.displayName, wgs84: location.wgs84, source: "MAP_VIEWPORT", timezoneHint: "Asia/Shanghai" },
      localDate: "2026-08-06",
    })).data;
    const sky = await service.getSky(pending.submissionId, context.contextId, owner.userId);
    assert.equal(sky.data.context.spotId, pending.submissionId);
    assert.match(sky.warnings.at(-1) ?? "", /审核中提案坐标/u);
    await assert.rejects(() => service.getSky(pending.submissionId, context.contextId, stranger.userId), /contribution_not_found/u);
    const otherContext = (await service.resolveObservationContext({
      location: { kind: "MAP_POINT", displayName: "其他位置", wgs84: { system: "WGS84", latitude: 22.57, longitude: 114.59 }, source: "MAP_VIEWPORT", timezoneHint: "Asia/Shanghai" },
      localDate: "2026-08-06",
    })).data;
    await assert.rejects(() => service.getSky(pending.submissionId, otherContext.contextId, owner.userId), /proposal_sky_context_mismatch/u);
  } finally { await service.onModuleDestroy(); }
});

test("runtime prerequisites can explicitly gate selected profile-content surfaces", async () => {
  const service = createTestMiniappService({
    repository: new InMemoryTestRepository([TEST_PUBLISHED_SPOT]),
    config: createTestRuntimeConfig({
      features: {
        ...createTestRuntimeConfig().features,
        PROFILE_LINKS_ENABLED: false,
        OWN_POST_IMPORT_ENABLED: false,
      },
    }),
  });
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
      "charging",
    );
    const result = await service.getMapScene({
      contextId: context.contextId,
      filters,
    });
    assert.equal(result.data.spots.length, 1, "unknown facility evidence remains visible for disclosure");
    assert.equal(
      result.data.filterEvidence[result.data.spots[0]!.spotId]!.CHARGING.state,
      "UNKNOWN",
    );
    assert.equal(
      result.data.filterCapabilities.byGroup.CHARGING.state,
      "UNAVAILABLE",
    );
    assert.ok(
      result.warnings.some((warning) => warning.includes("当前不可用")),
    );
    assert.ok(
      result.warnings.some((warning) => warning.includes("充电")),
      "filter warnings use the current human-facing filter title",
    );
    assert.equal(
      result.warnings.some((warning) =>
        warning.includes("CHARGING"),
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
      sky.data.lunarFacts.phase,
      sky.data.hourly.find((row) => row.at === context.selectedAtUtc)?.moonPhase,
    );
    assert.ok(
      sky.sources.some((source) => source.id === sky.data.lunarFacts.source.id),
      "lunar provenance is included in the response source envelope",
    );
    assert.equal(
      sky.data.context.eventCatalogVersion,
      ASTRONOMICAL_EVENT_CATALOG_VERSION,
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

test("sky report preserves exact selected time and binds targets and stars to every frame", async () => {
  const service = testService();
  try {
    const selectedAt = "2026-08-06T13:00:00.000Z";
    const context = (
      await service.resolveObservationContext({
        location: {
          kind: "FORMAL_SPOT",
          spotId: TEST_PUBLISHED_SPOT.spotId,
        },
        localDate: "2026-08-06",
        selectedAt,
      })
    ).data;
    const sky = (await service.getSky(TEST_PUBLISHED_SPOT.spotId, context.contextId))
      .data;
    assert.equal(sky.context.at, selectedAt);
    assert.ok(
      sky.hourly.some((row) => row.at === selectedAt),
      "off-grid committed time is a calculated hourly row",
    );
    assert.equal(sky.targetFrames.length, sky.hourly.length);
    assert.deepEqual(
      sky.targetFrames.map((frame) => frame.at),
      sky.hourly.map((row) => row.at),
    );
    assert.deepEqual(
      sky.skyScene.frames.map((frame) => frame.at),
      sky.hourly.map((row) => row.at),
    );
    assert.equal(sky.skyScene.deepSky?.state, "AVAILABLE");
    assert.equal(sky.skyScene.deepSky?.catalog?.entries.length, 51);
    assert.deepEqual(
      sky.skyScene.deepSky?.frames.map((frame) => frame.at),
      sky.hourly.map((row) => row.at),
    );
    assert.ok(sky.skyScene.deepSky?.catalog?.entries.some((entry) => entry.objectRef === "M:31" && entry.kind === "GALAXY"));
    assert.ok(sky.skyScene.deepSky?.catalog?.entries.some((entry) => entry.objectRef === "M:42" && entry.kind === "NEBULA"));
    const currentTargets = sky.targets;
    const selectedFrame = sky.targetFrames.find(
      (frame) => frame.at === selectedAt,
    );
    assert.ok(selectedFrame, "selected time has an exact target frame");
    assert.deepEqual(
      selectedFrame.targets.map((target) => target.targetId),
      currentTargets.map((target) => target.targetId),
    );
    for (const target of currentTargets) {
      const frameTarget: (typeof currentTargets)[number] | undefined =
        selectedFrame.targets.find(
          (candidate) => candidate.targetId === target.targetId,
        );
      assert.ok(frameTarget);
      assert.equal(frameTarget.direction, target.direction);
      assert.equal(frameTarget.altitudeDeg, target.altitudeDeg);
    }
    assert.ok(
      sky.targetFrames.some((frame) =>
        frame.targets.some((target) => {
          const current = currentTargets.find(
            (candidate) => candidate.targetId === target.targetId,
          );
          return (
            frame.at !== selectedAt &&
            current !== undefined &&
            (target.direction !== current.direction ||
              target.altitudeDeg !== current.altitudeDeg)
          );
        }),
      ),
      "target directions change with the frame rather than reusing committed targets",
    );
    const meteorTarget = currentTargets.find(
      (target) => target.type === "METEOR_SHOWER",
    );
    assert.ok(meteorTarget, "an active meteor target is present");
    assert.equal(meteorTarget.activity, null,
      "the GMN reference does not invent an unreviewed activity curve");
    const meteorFrames = sky.targetFrames.flatMap((frame) =>
      frame.targets
        .filter((target) => target.targetId === meteorTarget.targetId),
    );
    assert.ok(
      meteorFrames.every((target) => target.activity === null) &&
      new Set(meteorFrames.map((target) => `${target.direction}:${target.altitudeDeg}`)).size > 1,
      "meteor direction is recalculated while unavailable activity stays unavailable",
    );
    assert.ok(
      sky.hourly.every((row) => row.opportunityInput.at === row.at),
      "opportunity inputs retain the exact expanded presentation axis",
    );
    assert.ok(
      Buffer.byteLength(JSON.stringify(sky), "utf8") < 1_048_576,
      "target frames remain within the test report payload budget",
    );
    const selectedRow = sky.hourly.find((row) => row.at === selectedAt);
    assert.equal(selectedRow?.opportunityInput.at, selectedAt);
  } finally {
    await service.onModuleDestroy();
  }
});

test("daylight and cross-midnight selected instants stay exact instead of nearest-sampled", async () => {
  const service = testService();
  try {
    const selectedInstants = [
      "2026-08-06T05:00:00.000Z",
      "2026-08-06T16:00:00.000Z",
    ];
    for (const selectedAt of selectedInstants) {
      const context = (
        await service.resolveObservationContext({
          location: {
            kind: "FORMAL_SPOT",
            spotId: TEST_PUBLISHED_SPOT.spotId,
          },
          localDate: "2026-08-06",
          selectedAt,
        })
      ).data;
      const sky = (await service.getSky(TEST_PUBLISHED_SPOT.spotId, context.contextId))
        .data;
      assert.equal(sky.context.at, selectedAt);
      assert.ok(sky.hourly.some((row) => row.at === selectedAt));
      assert.ok(sky.targetFrames.some((frame) => frame.at === selectedAt));
      assert.ok(sky.skyScene.frames.some((frame) => frame.at === selectedAt));
    }
    const daylightContext = (
      await service.resolveObservationContext({
        location: {
          kind: "FORMAL_SPOT",
          spotId: TEST_PUBLISHED_SPOT.spotId,
        },
        localDate: "2026-08-06",
        selectedAt: selectedInstants[0],
      })
    ).data;
    const daylightSky = (
      await service.getSky(TEST_PUBLISHED_SPOT.spotId, daylightContext.contextId)
    ).data;
    assert.equal(
      daylightSky.hourly.find((row) => row.at === selectedInstants[0])?.darkness,
      "DAY",
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
