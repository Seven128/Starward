import assert from "node:assert/strict";
import test from "node:test";
import { skySolarLightAt } from "./sky-solar-light";
import { drawSkyScene } from "./sky-scene-render";
import { projectSkyDirectionUnclipped, type SkyViewBasis } from "./sky-view-projection";
import type { SkyRenderSurface } from "./sky-render-surface";
import type { ResolvedSkyReport } from "./sky-stellar-scene";

const dusk = "2026-09-05T10:00:00.000Z";
const night = "2026-09-05T12:00:00.000Z";
const row = (at: string, sunAzimuthDeg: number | null, sunAltitudeDeg: number | null) =>
  ({ at, sunAzimuthDeg, sunAltitudeDeg });
const report = (rows: ReturnType<typeof row>[]) => ({
  hourly: rows, skyScene: {state:"UNAVAILABLE",frames:[]},targetFrames:[],
} as unknown as ResolvedSkyReport);
const basis: SkyViewBasis = { right: [1,0,0], up: [0,0,1], forward: [0,1,0] };

test("solar light selects only the exact report instant and shares star ENU orientation", () => {
  const rows = [row(dusk,90,-5),row(night,270,-24)] as any;
  const first = skySolarLightAt(rows,dusk)!;
  const second = skySolarLightAt(rows,night)!;
  assert.ok(first.direction[0] > .99 && second.direction[0] < -.9,
    "east and west positions must change with the selected report time");
  assert.ok(Math.abs(first.direction[2]-Math.sin(-5*Math.PI/180)) < 1e-12);
  const starProjection = projectSkyDirectionUnclipped(90,-5,basis,400,800,240);
  assert.ok(starProjection && starProjection.x > 200,
    "solar east uses the same east-right direction as a stellar point");
  assert.equal(skySolarLightAt(rows,"2026-09-05T11:00:00.000Z"),null);
  assert.equal(skySolarLightAt([rows[0],rows[0]],dusk),null,
    "duplicate times must not borrow a solar direction");
  assert.equal(skySolarLightAt([row(dusk,null,-5)] as any,dusk),null);
  assert.equal(skySolarLightAt([row(dusk,360,-5)] as any,dusk),null);
  assert.equal(skySolarLightAt([row(dusk,90,-91)] as any,dusk),null);
});

test("scene draws current solar light beneath other content; red and missing data suppress it", () => {
  const events: string[] = [];
  const surface = new Proxy({}, {get: (_target, key) => key === "solarLight"
    ? (_view: unknown, sun: {direction: readonly number[]}) => { events.push(`solar:${Math.sign(sun.direction[0]!)}`); return true; }
    : () => { events.push(String(key)); }}) as SkyRenderSurface;
  const data = report([row(night,270,-24),row(dusk,90,-5)]);
  drawSkyScene(surface,data,dusk,null,null,400,800,"NIGHT",undefined,undefined,240,null,basis);
  assert.equal(events[0],"begin");
  assert.equal(events[1],"solar:1");
  assert.ok(events.includes("finish"));
  events.length=0;
  drawSkyScene(surface,data,dusk,null,null,400,800,"OBSERVATION",undefined,undefined,240,null,basis);
  assert.ok(!events.some(event=>event.startsWith("solar:")));
  events.length=0;
  drawSkyScene(surface,report([row(dusk,null,null)]),dusk,null,null,400,800,"NIGHT",undefined,undefined,240,null,basis);
  assert.ok(!events.some(event=>event.startsWith("solar:")));
});

test("optional solar shader failure preserves independent scene completion", () => {
  let failed = 0, completed = 0;
  const surface = new Proxy({}, {get: (_target,key) => key === "solarLight" ? () => false : () => undefined}) as SkyRenderSurface;
  drawSkyScene(surface,report([row(dusk,90,-5)]),dusk,null,null,400,800,"NIGHT",undefined,
    () => {completed++;},240,null,basis,undefined,undefined,undefined,undefined,() => {failed++;});
  assert.equal(failed,1);
  assert.equal(completed,1);
});
