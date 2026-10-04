import assert from "node:assert/strict";
import test from "node:test";
import { SKY_PLANET_ORDER, type HourlySkyRow } from "@starward/miniapp-contracts";
import { locatedBodyOccludesMarker } from "./sky-located-object";
import { createSkyViewBasis, type SkyViewBasis } from "./sky-view-projection";

const diagonal = Math.SQRT1_2;
const basis: SkyViewBasis = { right: [1, 0, 0], up: [0, -diagonal, diagonal],
  forward: [0, diagonal, diagonal] };
const planets = SKY_PLANET_ORDER.map(body => ({ body, azimuthDeg: 0, altitudeDeg: 45,
  angularDiameterDeg: body === "SATURN" ? .02 : .001, illuminatedFraction: .9,
  visualMagnitude: 1, ringTiltDeg: body === "SATURN" ? 10 : null,
  ringPoleEnu: body === "SATURN" ? [0, 0, 1] as const : null }));
const row = { sunAzimuthDeg: 90, sunAltitudeDeg: 0, planets } as unknown as HourlySkyRow;
const center = { x: 200, y: 400 };
const visible = (reference: string, field: number, data: HourlySkyRow | undefined = row) =>
  locatedBodyOccludesMarker(reference, data, basis, 400, 800, field, center);

test("a resolved Saturn disc takes over the marker at high zoom while the hit target remains", () => {
  assert.equal(visible("PLANET:SATURN", .18), true);
  assert.equal(visible("PLANET:SATURN", 20), false);
  assert.equal(visible("HR:4905", .18), false);
});

test("a resolved below-horizon planet can replace the marker in the same browsing camera",()=>{
  const data={...row,planets:planets.map(planet=>planet.body==='SATURN'?{...planet,altitudeDeg:-10}:planet)};
  const current=createSkyViewBasis(0,80,0)!;
  assert.equal(locatedBodyOccludesMarker('PLANET:SATURN',data,current,400,800,.18,center),true);
  assert.equal(locatedBodyOccludesMarker('PLANET:SATURN',data,current,400,800,20,center),false,
    'an unresolved disc must retain its marker');
});

test("missing, malformed or unpaintable planet data retains the visible location marker", () => {
  assert.equal(locatedBodyOccludesMarker("PLANET:SATURN", undefined, basis,
    400, 800, .18, center), false);
  assert.equal(visible("PLANET:SATURN", .18, { ...row, planets: planets.slice(0, 6) }), false);
  assert.equal(visible("PLANET:SATURN", .18, { ...row, sunAzimuthDeg: null }), false);
  assert.equal(visible("PLANET:SATURN", .18, { ...row,
    planets: planets.map(planet => planet.body === "SATURN" ? { ...planet, altitudeDeg: -10 } : planet) }), false);
});
