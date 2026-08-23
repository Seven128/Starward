import assert from "node:assert/strict";
import test from "node:test";
import type {
  ObservationContext,
  ObservationContextId,
  SpotId,
} from "@starward/miniapp-contracts";
import { observationContextRecoveryInput } from "./observation-context-recovery";

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
