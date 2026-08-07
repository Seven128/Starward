import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_USER_PREFERENCES,
  DEMO_SPOTS,
} from "@starward/miniapp-contracts";
import { decideTonight } from "./decision-engine.ts";
import { MiniappService } from "./miniapp-service.ts";
import { parserGate, validateExternalUrl } from "./security.ts";

test("map scene exposes the complete deterministic formal population", async () => {
  const service = new MiniappService();
  const result = await service.getMapScene({});
  assert.equal(result.data.spots.length, DEMO_SPOTS.length);
  assert.ok(
    result.data.spots.every(
      (spot) =>
        spot.spotId.startsWith("spot:") &&
        spot.source.license.includes("Open Database License"),
    ),
  );
});

test("map scene applies a bounded GCJ02 viewport plus buffer", async () => {
  const service = new MiniappService();
  const origin = DEMO_SPOTS[0]!;
  const result = await service.getMapScene({
    viewport: {
      center: {
        latitude: origin.gcj02.latitude,
        longitude: origin.gcj02.longitude,
      },
      zoom: 12,
    },
  });
  assert.equal(result.data.viewportMode, "BOUNDED_VIEWPORT_PLUS_20_PERCENT_BUFFER");
  assert.equal(result.data.viewport?.coordinateSystem, "GCJ02");
  assert.ok(result.data.spots.length > 0);
  assert.ok(result.data.spots.length < DEMO_SPOTS.length);
  assert.equal(
    result.data.viewport!.eligibleInViewport +
      result.data.viewport!.excludedOutsideViewport,
    DEMO_SPOTS.length,
  );
});

test("ordinary search never synthesizes a spot id or night entry", async () => {
  const service = new MiniappService();
  const result = await service.search("一个普通地点");
  assert.equal(result.data.ordinaryPlaces[0]?.spotId, null);
  assert.equal(result.data.ordinaryPlaces[0]?.nightSkyAllowed, false);
});

test("hard blockers precede favorable scores", () => {
  const decision = decideTonight({
    localDate: "2026-08-06",
    sourceRevision: "test",
    weatherState: "FRESH",
    siteState: "FRESH",
    astronomyState: "FRESH",
    thunderstorm: true,
    severeRain: false,
    severeWind: false,
    closed: false,
    roadClosed: false,
    explicitDanger: false,
    illegalAccess: false,
    criticalConflict: false,
    scores: { sky: 100, darkness: 100, site: 100, target: 100, access: 100 },
  });
  assert.equal(decision.recommendation, "NOT_RECOMMENDED");
  assert.ok(decision.factors.some((factor) => factor.code === "THUNDERSTORM"));
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

test("manual import remains recoverable and preserves lineage", async () => {
  const service = new MiniappService();
  const created = await service.createImportDraft(
    {
      platform: "OTHER",
      originalUrl: "https://example.com/my-post",
      rightsConfirmed: true,
    },
    "import-create-0001",
  );
  assert.equal(created.data.parseState, "GATED");
  const edited = await service.updateImportDraft(
    created.data.importDraftId,
    {
      expectedRevision: created.data.revision,
      stage: "EDIT_DRAFT",
      title: "我的观星记录",
      body: "手动录入正文",
    },
    "import-edit-000001",
  );
  assert.equal(edited.data.title.editedByUser, true);
  assert.equal(edited.data.originalUrl, "https://example.com/my-post");
  const associated = await service.updateImportDraft(
    edited.data.importDraftId,
    {
      expectedRevision: edited.data.revision,
      stage: "ASSOCIATE_SPOT",
      spotId: DEMO_SPOTS[0]!.spotId,
    },
    "import-associate-01",
  );
  const preview = await service.updateImportDraft(
    associated.data.importDraftId,
    {
      expectedRevision: associated.data.revision,
      stage: "PREVIEW",
    },
    "import-preview-0001",
  );
  const submitted = await service.updateImportDraft(
    preview.data.importDraftId,
    {
      expectedRevision: preview.data.revision,
      stage: "SUBMIT",
    },
    "import-submit-00001",
  );
  assert.equal(submitted.data.moderationState, "PENDING");
  assert.equal(submitted.data.spotId, DEMO_SPOTS[0]!.spotId);
  await assert.rejects(
    service.updateImportDraft(
      submitted.data.importDraftId,
      { expectedRevision: 1, stage: "PREVIEW" },
      "import-conflict-001",
    ),
    /import_revision_conflict/u,
  );
});

test("preferences are optimistic-lock persisted and only rank derived order", async () => {
  const service = new MiniappService();
  const initial = await service.getPreferences();
  assert.deepEqual(initial.data.preferences, DEFAULT_USER_PREFERENCES);
  const saved = await service.savePreferences(
    {
      preferences: {
        ...initial.data.preferences,
        defaultPlace: "河源",
        requiredFacilities: ["PARKING", "TOILET"],
      },
      expectedRevision: initial.data.revision,
    },
    "preferences-save-01",
  );
  assert.equal(saved.data.revision, initial.data.revision + 1);
  const scene = await service.getMapScene({
    preferences: {
      defaultPlace: saved.data.preferences.defaultPlace,
      experience: saved.data.preferences.experience,
      maxDriveMinutes: saved.data.preferences.maxDriveMinutes,
      requiredFacilities: saved.data.preferences.requiredFacilities,
      equipment: saved.data.preferences.equipment,
      capturePreference: saved.data.preferences.capturePreference,
    },
  });
  assert.equal(scene.data.preferenceRanking.changesFacts, false);
  assert.ok(scene.data.preferenceRanking.applied.length >= 2);
  assert.ok(scene.data.spots.every((spot) => spot.source.id.length > 0));
  await assert.rejects(
    service.savePreferences(
      {
        preferences: saved.data.preferences,
        expectedRevision: initial.data.revision,
      },
      "preferences-conflict",
    ),
    /preferences_revision_conflict/u,
  );
});

test("sky remains spot-bound and labels the deterministic weather scenario", async () => {
  const service = new MiniappService();
  await assert.rejects(
    service.getSky({ spotId: "ordinary:place", localDate: "2026-08-06" }),
    /night_requires_formal_spot_id/u,
  );
  const result = await service.getSky({
    spotId: DEMO_SPOTS[0]!.spotId,
    localDate: "2026-08-06",
  });
  assert.equal(result.data.context.spotId, DEMO_SPOTS[0]!.spotId);
  assert.equal(result.dataState, "SAMPLE_DATA");
  assert.ok(["RECOMMEND", "CONSIDER"].includes(result.data.decision.recommendation));
  assert.equal(result.data.decision.freshness, "SAMPLE_DATA");
  assert.ok(result.data.decision.bestWindow);
  assert.ok(
    result.data.hourly.every(
      (row) => typeof row.cloudPercent === "number" && row.state === "SAMPLE_DATA",
    ),
  );
  assert.ok(
    result.data.sources.some(
      (source) =>
        source.state === "SAMPLE_DATA" &&
        source.precision.includes("非实时预报"),
    ),
  );
});
