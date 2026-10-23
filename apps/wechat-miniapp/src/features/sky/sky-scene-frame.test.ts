import assert from "node:assert/strict";
import test from "node:test";
import { createSkySceneFrameIdentity, type SkySceneFrameIdentity, type SkyScenePaintResult, type SkySceneFailure } from "./sky-scene-frame";
import { skySceneTestFrame } from "./sky-scene-test-support";
import { drawSkyScene } from "./sky-scene-render";
import { createSkyViewBasis } from "./sky-view-projection";
import type { ResolvedSkyReport } from "./sky-stellar-scene";
import type { SkyRenderSurface } from "./sky-render-surface";

const at = "2026-10-12T04:00:00.000Z";
const report = { hourly: [{ at, sunAzimuthDeg: 90, sunAltitudeDeg: 45, sunAngularDiameterDeg: .53 }],
  skyScene: { state: "UNAVAILABLE", frames: [] }, targetFrames: [] } as unknown as ResolvedSkyReport;
const basis = createSkyViewBasis(90, 135, 0)!;
const surface = (overrides: Partial<SkyRenderSurface> = {}) => new Proxy(overrides, {
  get(target, name) { return Reflect.get(target, name) ?? (() => true); },
}) as SkyRenderSurface;

test("the exact admitted view survives changed caller records and another scene preparation", () => {
  const mutableBasis = { right: [...basis.right] as [number, number, number],
    up: [...basis.up] as [number, number, number], forward: [...basis.forward] as [number, number, number] };
  const center = { x: 200, y: 400 }, canvas = { generation: 4, width: 400, height: 800 };
  const identity = createSkySceneFrameIdentity({ observation: { data: report, frameAt: at },
    view: { heading: null, pose: null, manualBasis: mutableBasis, mode: "NIGHT", verticalFovDeg: 2, center }, canvas });
  let painted: SkyScenePaintResult | undefined;
  drawSkyScene(surface(), { identity }, { painted(result) { painted = result; } });
  assert.ok(painted?.snapshot?.objects.some(object => object.reference === "SOLAR:SUN"));
  const accepted = painted!, before = JSON.stringify(accepted.snapshot);
  assert.equal(accepted.identity, identity);
  assert.equal(accepted.snapshot?.identity, identity);
  assert.equal(accepted.snapshot?.view?.basis, identity.view.manualBasis);
  mutableBasis.forward[0] = -1; center.x = 0; canvas.generation = 5; canvas.width = 1;
  drawSkyScene(surface(), skySceneTestFrame({ observation: { data: report, frameAt: at },
    view: { manualBasis: createSkyViewBasis(270, 100, 0)!, verticalFovDeg: 20 }, canvas: { generation: 5 } }));
  assert.equal(JSON.stringify(accepted.snapshot), before);
  assert.equal(accepted.identity.canvas.generation, 4);
  assert.equal(accepted.identity.canvas.width, 400);
  assert.equal(accepted.identity.view.center?.x, 200);
});

test("identity reuse binds exact data, time, view and Canvas without retaining candidate images or work", () => {
  const candidate = {};
  const input = skySceneTestFrame({ observation: { data: report, frameAt: at }, view: { manualBasis: basis },
    imagery: { galactic: { image: candidate, publication: null } } });
  const identity = input.identity;
  assert.deepEqual(Object.keys(identity).sort(), ["canvas", "observation", "view"]);
  assert.equal("imagery" in identity, false);
  assert.equal("work" in identity, false);
  assert.equal(createSkySceneFrameIdentity(identity, identity), identity);
  const changes: SkySceneFrameIdentity[] = [
    { ...identity, observation: { ...identity.observation, data: { ...report } } },
    { ...identity, observation: { ...identity.observation, frameAt: "2026-10-12T04:00:01.000Z" } },
    { ...identity, observation: { ...identity.observation, constellations: { at, lines: [], labels: [], images: [] } } },
    { ...identity, view: { ...identity.view, verticalFovDeg: 30 } },
    { ...identity, canvas: { ...identity.canvas, generation: 2 } },
  ];
  for (const changed of changes) assert.notEqual(createSkySceneFrameIdentity(changed, identity), identity);
  // Mutable preparation and native-resource identity remain outside published facts.
  assert.equal(input.imagery?.galactic?.image, candidate);
});

test("optional failures and finish completion preserve their admitted identity and independent content", () => {
  const input = skySceneTestFrame({ observation: { data: report, frameAt: at },
    view: { manualBasis: basis, verticalFovDeg: 2 } });
  const failures: SkySceneFailure[] = [], events: string[] = [];
  drawSkyScene(surface({ solarLight: () => false, sun: () => false }), input, {
    failed(failure, identity) { assert.equal(identity, input.identity); failures.push(failure); },
    painted(result) { assert.equal(result.identity, input.identity); assert.equal(result.snapshot?.identity, input.identity); events.push("painted"); },
    completed(identity) { assert.equal(identity, input.identity); events.push("completed"); },
  });
  assert.deepEqual(failures.map(value => value.kind), ["solar-light", "sun-disc"]);
  assert.deepEqual(events, ["painted", "completed"]);
});

test("a fatal surface failure reports the same attempt and cannot claim scene completion", () => {
  const input = skySceneTestFrame(), error = new Error("controlled-surface-failure");
  const failures: SkySceneFailure[] = [];
  let painted = false, completed = false;
  assert.throws(() => drawSkyScene(surface({ finish() { throw error; } }), input, {
    failed(failure, identity) { assert.equal(identity, input.identity); failures.push(failure); },
    painted() { painted = true; }, completed() { completed = true; },
  }), value => value === error);
  assert.equal(failures.length, 1);
  assert.equal(failures[0]?.kind, "scene");
  assert.equal((failures[0] as Extract<SkySceneFailure, { kind: "scene" }>).error, error);
  assert.equal(painted, false); assert.equal(completed, false);
});
