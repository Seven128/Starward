import assert from "node:assert/strict";
import test from "node:test";
import { loadBsc5pBrightStarCatalog, positionBsc5pCatalog } from "@starward/astronomy-core/bsc5p-catalog";
import { assertStellarGeometryFrame } from "@starward/miniapp-contracts";
import { createBsc5pGeometryFrame } from "./stellar-geometry-provider.ts";
import { StellarCatalogPublicationService } from "./stellar-catalog-publication.ts";
import { projectStellarMotion } from "@starward/astronomy-core/stellar-vectors";
import { createBsc5pSkyCatalogProvider } from "./sky-scene-catalog-provider.ts";

test("prepared catalog and time frames preserve actual BSC positions after JSON round trip", () => {
  const owner = loadBsc5pBrightStarCatalog();
  const catalog = JSON.parse(JSON.stringify(new StellarCatalogPublicationService().get(owner).data));

  assert.equal(catalog.rows.length, 8404);
  const observer = { latitude: 22.6, longitude: 114.5, elevationM: 30 };
  let previous: readonly { sourceId: string; azimuthDeg: number; altitudeDeg: number; visible: boolean; obstructed: null }[] | undefined;
  for (const instant of ["2000-01-01T12:00:00.000Z", "2026-09-19T13:00:00.000Z", "2026-09-19T14:00:00.000Z"]) {
    const input = { ...observer, at: new Date(instant) };
    const frame = JSON.parse(JSON.stringify(createBsc5pGeometryFrame(catalog, input)));
    const expected = { at: instant, observer };
    assertStellarGeometryFrame(frame, { catalog, ...expected });
    const result = catalog.rows.map(([sourceId, _name, _magnitude, _color, x, y, z, vx, vy, vz]: any[]) => {
      const p = projectStellarMotion([x,y,z,vx,vy,vz],frame.julianYears,frame.equatorialToEnu);
      return { sourceId, ...p, visible:p.altitudeDeg>0, obstructed:null };
    });
    const reference = positionBsc5pCatalog({ ...input, catalog: owner }).map(({ sourceId, azimuthDeg, altitudeDeg, visible, obstructed }) =>
      ({ sourceId, azimuthDeg, altitudeDeg, visible, obstructed }));
    assert.deepEqual(result, reference);
    assert.ok(result.some(row => row.visible) && result.some(row => !row.visible));
    if (previous) assert.notDeepEqual(result, previous, "changing the time must change the actual sky");
    previous = result;
    assert.throws(() => assertStellarGeometryFrame(frame, { catalog, ...expected, observer: { ...observer, longitude: 0 } }), /observer_binding/);
  }
});

test("real report provider consumes prepared geometry and refuses mismatched source versions", () => {
  const provider = createBsc5pSkyCatalogProvider(), catalog = provider.load();
  const input = { catalog, at: new Date("2026-09-19T13:00:00Z"), latitude: 22.6, longitude: 114.5, elevationM: 30 };
  const result = provider.frame(input);
  assert.deepEqual(result, createBsc5pGeometryFrame(new StellarCatalogPublicationService().get(loadBsc5pBrightStarCatalog()).data, input));
  assert.equal(result.at, input.at.toISOString());
  for (const change of [{ catalogVersion: "wrong" }, { catalogHash: "b".repeat(64) }])
    assert.throws(() => provider.frame({ ...input, catalog: { ...catalog, ...change } }), /snapshot_mismatch/);
});
