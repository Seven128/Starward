import assert from "node:assert/strict";
import test from "node:test";
import type {
  ObservationContext,
  ObservationContextId,
  SpotId,
} from "@starward/miniapp-contracts";
import { confirmedObservationContextEdit, observationContextRecoveryInput } from "./observation-context-recovery";
import { totalCloudClientFixture } from "./total-cloud-test-support";
import { TOTAL_CLOUD_POLICY } from "@starward/miniapp-contracts";

const base: Omit<ObservationContext, "location" | "routeOrigin"> = {
  schemaVersion: "observation-context-v2",
  contextId: "ctx:stored" as ObservationContextId,
  contextFingerprint: "fingerprint",
  revision: 3,
  timezone: "Asia/Shanghai",
  localDate: "2026-08-23",
  nightStartUtc: "2026-08-23T04:00:00.000Z",
  nightEndUtc: "2026-08-24T04:00:00.000Z",
  selectedAtUtc: "2026-08-23T13:30:00.000Z",
  eventInstanceId: "event:perseids",
  targetProfile: "METEOR",
  weatherView: {
    primaryPolicy: "OPEN_METEO_NONCOMMERCIAL",
    comparisonModels: [],
    selectedModel: null,
    cloudLayer: "LOW",
  },
  algorithmVersions: {
    astronomy: "astronomy",
    opportunity: "opportunity",
    tripDecision: "trip",
    darkSky: "dark-sky",
    eventCatalog: "events",
  },
  privacyClass: "PUBLIC_REFERENCE",
  createdAt: "2026-08-23T03:00:00.000Z",
  expiresAt: "2026-08-25T03:00:00.000Z",
};

test("formal-spot context recovery preserves product location, night, time, event and profile", () => {
  const context: ObservationContext = {
    ...base,
    location: {
      kind: "FORMAL_SPOT",
      spotId: "spot:published" as SpotId,
      locationVersion: 4,
    },
    routeOrigin: null,
  };
  assert.deepEqual(observationContextRecoveryInput(context), {
    location: { kind: "FORMAL_SPOT", spotId: "spot:published" },
    localDate: base.localDate,
    selectedAt: base.selectedAtUtc,
    eventInstanceId: base.eventInstanceId,
    targetProfile: base.targetProfile,
  });
});

test("map context recovery preserves the exact map point and route-origin binding", () => {
  const point = {
    system: "WGS84" as const,
    latitude: 22.5431,
    longitude: 114.0579,
  };
  const context: ObservationContext = {
    ...base,
    location: {
      kind: "MAP_POINT",
      displayName: "深圳",
      wgs84: point,
      source: "MAP_VIEWPORT",
    },
    routeOrigin: {
      contextId: "ctx:origin" as ObservationContextId,
      displayName: "手动位置",
      wgs84: point,
      source: "USER_LOCATION",
    },
  };
  assert.deepEqual(observationContextRecoveryInput(context), {
    location: {
      kind: "MAP_POINT",
      displayName: "深圳",
      wgs84: point,
      source: "MAP_VIEWPORT",
      timezoneHint: "Asia/Shanghai",
    },
    routeOriginContextId: "ctx:origin",
    localDate: base.localDate,
    selectedAt: base.selectedAtUtc,
    eventInstanceId: base.eventInstanceId,
    targetProfile: base.targetProfile,
  });
  assert.equal(
    observationContextRecoveryInput(
      context,
      "ctx:recovered-origin" as ObservationContextId,
    ).routeOriginContextId,
    "ctx:recovered-origin",
  );
});

test("ordinary Context edits cannot change, erase or corrupt a committed cloud publication", () => {
  const totalCloud = totalCloudClientFixture("2026-08-23T00:00:00.000Z").binding;
  const current: ObservationContext = { ...base, location: { kind: "FORMAL_SPOT", spotId: "spot:published" as SpotId, locationVersion: 4 },
    routeOrigin: null, weatherView: { primaryPolicy: "QWEATHER", comparisonModels: [], selectedModel: null, cloudLayer: "TOTAL", totalCloud } };
  const latest = { ...current, revision: current.revision + 1, contextFingerprint: "edited" };
  const response = (data: ObservationContext) => ({ dataState: "FRESH", data }) as Parameters<typeof confirmedObservationContextEdit>[2];
  assert(confirmedObservationContextEdit(current, {}, response(latest)));
  for (const changed of [undefined, { ...totalCloud, publicationId: `ecmwf-tcc:${"c".repeat(64)}` },
    { ...totalCloud, samplingPolicy: "wrong" }]) {
    assert.equal(confirmedObservationContextEdit(current, {}, response({ ...latest,
      weatherView: { ...latest.weatherView, totalCloud: changed as typeof totalCloud } })), false);
  }
  const replacement = { ...latest, weatherView: { ...latest.weatherView,
    totalCloud: { ...totalCloud, publicationId: `ecmwf-tcc:${"c".repeat(64)}` } } };
  assert(confirmedObservationContextEdit(current, { refreshTotalCloud: true }, response(replacement)));
  const legacyWeather = { ...current.weatherView }; delete legacyWeather.totalCloud;
  assert.equal(confirmedObservationContextEdit(current, { refreshTotalCloud: true }, response({ ...latest,
    weatherView: legacyWeather })), false);
  const legacy = { ...current, weatherView: legacyWeather };
  assert.equal(confirmedObservationContextEdit(legacy, { refreshTotalCloud: true }, response(replacement)), false);
  assert(confirmedObservationContextEdit(legacy, { refreshTotalCloud: true, totalCloudPolicy: TOTAL_CLOUD_POLICY }, response(replacement)));
  assert(confirmedObservationContextEdit(legacy, { refreshTotalCloud: true, totalCloudPolicy: TOTAL_CLOUD_POLICY },
    response({ ...latest, weatherView: legacyWeather })), "explicit unconfigured compatibility acknowledgement");
});
