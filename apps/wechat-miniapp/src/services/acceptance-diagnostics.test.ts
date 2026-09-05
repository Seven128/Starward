import assert from "node:assert/strict";
import test from "node:test";

type DiagnosticsRuntime = typeof globalThis & {
  __MINIAPP_ACCEPTANCE_DIAGNOSTICS__: boolean;
  ENABLE_ADJACENT_HTML: boolean;
  ENABLE_CLONE_NODE: boolean;
  ENABLE_CONTAINS: boolean;
  ENABLE_INNER_HTML: boolean;
  ENABLE_MUTATION_OBSERVER: boolean;
  ENABLE_SIZE_APIS: boolean;
  ENABLE_TEMPLATE_CONTENT: boolean;
  SUPPORT_TARO_POLYFILL: boolean;
  TARO_ENV: string;
  TARO_PLATFORM: string;
  TARO_RUNTIME: string;
};

const runtime = globalThis as DiagnosticsRuntime;
Object.assign(runtime, {
  __MINIAPP_ACCEPTANCE_DIAGNOSTICS__: true,
  ENABLE_ADJACENT_HTML: false,
  ENABLE_CLONE_NODE: false,
  ENABLE_CONTAINS: false,
  ENABLE_INNER_HTML: false,
  ENABLE_MUTATION_OBSERVER: false,
  ENABLE_SIZE_APIS: false,
  ENABLE_TEMPLATE_CONTENT: false,
  SUPPORT_TARO_POLYFILL: false,
  TARO_ENV: "weapp",
  TARO_PLATFORM: "weapp",
  TARO_RUNTIME: "weapp",
});

const {
  acquireAcceptanceSkySceneInspection,
  clearAcceptanceSkySceneInspection,
  inspectAcceptanceSkyScene,
  publishAcceptanceSkySceneInspection,
} = await import("./acceptance-diagnostics");

const inspection = (state: "PENDING" | "READY" | "UNAVAILABLE" | "ERROR", spotId: string) => ({
  state,
  spotId,
  frameAt: "2026-09-05T12:00:00.000Z",
  catalogVersion: "gaia-dr3-magnitude-limited-v1",
  starCount: 12,
  drawRevision: 3,
});

test("late sky diagnostics publish and cleanup cannot affect a newer owner", () => {
  runtime.__MINIAPP_ACCEPTANCE_DIAGNOSTICS__ = true;
  const oldOwner = acquireAcceptanceSkySceneInspection();
  assert.ok(oldOwner);
  assert.equal(publishAcceptanceSkySceneInspection(oldOwner, inspection("PENDING", "old")), true);

  const newOwner = acquireAcceptanceSkySceneInspection();
  assert.ok(newOwner);
  assert.equal(inspectAcceptanceSkyScene(), null);
  assert.equal(publishAcceptanceSkySceneInspection(newOwner, inspection("READY", "new")), true);
  const current = inspectAcceptanceSkyScene();
  assert.equal(current?.spotId, "new");
  assert.equal(current?.state, "READY");

  assert.equal(publishAcceptanceSkySceneInspection(oldOwner, inspection("ERROR", "stale")), false);
  assert.equal(clearAcceptanceSkySceneInspection(oldOwner), false);
  assert.deepEqual(inspectAcceptanceSkyScene(), current);

  assert.equal(clearAcceptanceSkySceneInspection(newOwner), true);
  assert.equal(inspectAcceptanceSkyScene(), null);
  assert.equal(clearAcceptanceSkySceneInspection(oldOwner), false);
});

test("disabled acceptance diagnostics never acquire, publish, or clear state", () => {
  runtime.__MINIAPP_ACCEPTANCE_DIAGNOSTICS__ = false;
  assert.equal(acquireAcceptanceSkySceneInspection(), null);
  assert.equal(publishAcceptanceSkySceneInspection(null, inspection("READY", "disabled")), false);
  assert.equal(clearAcceptanceSkySceneInspection(null), false);
  assert.equal(inspectAcceptanceSkyScene(), null);
  runtime.__MINIAPP_ACCEPTANCE_DIAGNOSTICS__ = true;
});
