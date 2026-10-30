import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import type { StellarGeometryFrame } from "@starward/miniapp-contracts";
import { createSkyStellarTransform } from "./sky-stellar-transform";
import type { SkyDirectionProjector, SkyVector } from "./sky-view-projection";

const geometry: StellarGeometryFrame = {
  format: "bsc5p-stellar-geometry-v1", referenceAt: "2000-01-01T12:00:00.000Z",
  catalogVersion: "transform-lifetime", catalogHash: "a".repeat(64),
  at: "2000-01-01T12:00:00.000Z", observer: { latitude: 0, longitude: 0, elevationM: 0 },
  julianYears: 0, equatorialToEnu: [1, 0, 0, 0, 1, 0, 0, 0, 1],
};

test("prepared directions preserve retained projector rays, exact positions and warm camera reuse", () => {
  let reads = 0, admitted = false;
  const originals: SkyVector[] = [];
  const transform = createSkyStellarTransform(1, () => {
    reads++;
    return [0, Math.SQRT1_2, -Math.SQRT1_2, 0, 0, 0];
  }, geometry);
  const projector: SkyDirectionProjector = {
    mayProjectVector: ray => { originals.push(ray); return admitted; },
    prepared: direction => ({ x: 10, y: 20, degrees: direction.degrees, altitude: direction.altitude }),
    project: () => null, unclipped: () => null,
  };
  let visits = 0;
  const project = () => transform.forEachProjected(projector, 7, () => 1, () => visits++);
  project(); project();
  assert.equal(visits, 0);
  assert.equal(originals[0], originals[1], "unseen/rejected stars keep their lazy exact-time ray");
  admitted = true;
  project();
  const position = transform.position(0), direction = transform.displayDirection(0)!;
  const transmission = transform.displayTransmission(0);
  assert.deepEqual(position, { azimuthDeg: 0, altitudeDeg: -45 });
  assert.notEqual(originals[0], direction.vector, "angular display input is a separately owned ray");
  assert(Object.isFrozen(originals[0]));
  const originalValues = [...originals[0]!];
  project();
  assert.equal(visits, 2);
  assert.equal(reads, 1, "retiring redundant storage cannot reconstruct proper motion on camera changes");
  assert.equal(originals.length, 3, "prepared stars no longer enter the original-vector callback");
  assert.equal(transform.position(0), position);
  assert.equal(transform.displayDirection(0), direction);
  assert.equal(transform.displayTransmission(0), transmission);
  assert.deepEqual(originals[0], originalValues, "an unknown projector may retain its immutable input");
});

test("a live transform releases its redundant original ray after preparing display direction", () => {
  // This isolated VM checks strong ownership only. It does not alter the
  // product GC policy or claim phone heap, native/GPU or OOM improvement.
  const script = `
    import assert from 'node:assert/strict';
    import {createSkyStellarTransform} from ${JSON.stringify(new URL("./sky-stellar-transform.ts", import.meta.url).href)};
    const transform=createSkyStellarTransform(1,()=>[0,Math.SQRT1_2,-Math.SQRT1_2,0,0,0],${JSON.stringify(geometry)});
    let original;
    const projector={mayProjectVector(ray){original=new WeakRef(ray);return false;},
      prepared(){return null;},project(){return null;},unclipped(){return null;}};
    transform.forEachProjected(projector,7,()=>1,()=>{});
    const collect=async()=>{await new Promise(setImmediate);globalThis.gc();await new Promise(setImmediate);globalThis.gc();};
    await collect();
    assert(original.deref(),'a rejected star still needs its exact-time ray for a later camera');
    const direction=transform.displayDirection(0),position=transform.position(0);
    await collect();
    assert.equal(original.deref(),undefined,'prepared display input must not retain the redundant original ray');
    assert.equal(transform.displayDirection(0),direction);
    assert.equal(transform.position(0),position);
    assert.equal(position.altitudeDeg,-45);
  `;
  const result = spawnSync(process.execPath, ["--expose-gc", "--import", "tsx", "--input-type=module", "-e", script],
    { encoding: "utf8", timeout: 15_000, windowsHide: true });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
